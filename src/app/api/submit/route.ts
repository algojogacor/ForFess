/**
 * Entry point submission menfess.
 * Pipeline: parse body → honeypot → sanitasi & validasi teks → rate limit →
 * captcha → cek kuota IG → generate nomor tiket & gambar → (dry-run? berhenti) →
 * upload Cloudinary → buat container (+ retry code 9004 jika Meta flaky) →
 * publish → ambil permalink → bersihkan gambar sementara.
 *
 * Prinsip: setiap kegagalan menghasilkan pesan SPESIFIK untuk user,
 * bukan "Something went wrong".
 */
import { NextResponse } from "next/server";
import {
  IG_QUOTA_BUFFER,
  SITE_URL,
  MENFESS_CATEGORY_IDS,
  DEFAULT_CATEGORY,
} from "@/constants";
import { isDryRun } from "@/lib/config";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { renderMenfessCard } from "@/lib/generate-image";
import { uploadImage, deleteImage, ensureStaticSlide2Url } from "@/lib/cloudinary";
import {
  checkLimit,
  createCarouselItem,
  createCarouselContainer,
  publishMedia,
  getPermalink,
  InstagramError,
} from "@/lib/instagram";
import { validateMenfessText } from "@/lib/validate";
import { generateTicketCode, isPostTheme, type PostTheme } from "@/lib/post-template";
import { buildMenfessCaption } from "@/lib/caption";
import type { SubmitRequestBody, SubmitErrorCode, SubmitResponse } from "@/types/menfess";

// Pipeline butuh Node runtime (Satori + sharp + SDK Cloudinary).
export const runtime = "nodejs";
// Render gambar + rantai request ke 3 layanan bisa makan waktu.
export const maxDuration = 60;

function fail(
  code: SubmitErrorCode,
  message: string,
  status: number,
  retryAfter?: number
) {
  return NextResponse.json<SubmitResponse>(
    { ok: false, code, message, ...(retryAfter ? { retryAfter } : {}) },
    { status, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined }
  );
}

export async function POST(request: Request) {
  // ---- 0. Parse body ----
  let body: SubmitRequestBody;
  try {
    body = (await request.json()) as SubmitRequestBody;
  } catch {
    return fail(
      "VALIDATION_ERROR",
      "Format kiriman tidak terbaca. Muat ulang halaman lalu coba lagi.",
      400
    );
  }

  // ---- 1. Honeypot: kalau terisi, ini bot — buang diam-diam ----
  if (typeof body.website === "string" && body.website.trim() !== "") {
    // Respons sukses palsu supaya bot tidak belajar membedakan.
    return NextResponse.json<SubmitResponse>({ ok: true });
  }

  // ---- 2. Normalisasi & Validasi isi (Zero-width, kontrol ASCII, panjang teks) ----
  const validation = validateMenfessText(body.content);
  if (!validation.ok) {
    return fail("VALIDATION_ERROR", validation.message, 400);
  }
  const content = validation.text;

  // Kategori opsional — tidak dikenal / kosong → diam-diam pakai default
  const category = MENFESS_CATEGORY_IDS.includes(body.category ?? "")
    ? (body.category as string)
    : DEFAULT_CATEGORY;

  // Tema kartu opsional — fallback ke "klasik"
  const theme: PostTheme = isPostTheme(body.theme) ? body.theme : "klasik";

  // ---- 3. Rate limit per IP ----
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    const wait = rl.retryAfter ?? 30;
    return fail(
      "RATE_LIMITED",
      `Sabar dulu ya — kamu baru saja kirim. Coba lagi dalam ${wait} detik.`,
      429,
      wait
    );
  }

  // ---- 4. Captcha Turnstile ----
  const token = body.turnstileToken;
  if (typeof token !== "string" || token.trim() === "") {
    return fail(
      "CAPTCHA_FAILED",
      "Verifikasi keamanan belum selesai. Tunggu widget captcha, lalu kirim lagi.",
      400
    );
  }
  const captcha = await verifyTurnstileToken(token, ip);
  if (!captcha.success) {
    console.warn("[submit] turnstile gagal:", captcha.errorCodes);
    return fail(
      "CAPTCHA_FAILED",
      "Verifikasi keamanan ditolak Cloudflare. Segarkan halaman, selesaikan captcha dari awal, lalu kirim lagi.",
      403
    );
  }

  // ---- 5. Cek kuota Instagram (fail-open: kalau API-nya gagal, izinkan) ----
  try {
    const quota = await checkLimit();
    if (quota.remaining <= IG_QUOTA_BUFFER) {
      return fail(
        "QUOTA_EXCEEDED",
        `Kuota posting otomatis Instagram untuk 24 jam terakhir udah mentok (${quota.used}/${quota.total}). Menfess kamu bisa dikirim lagi besok — kuota akan kembali sendiri.`,
        429
      );
    }
  } catch (err) {
    // Jangan blokir user hanya karena pengecekan kuota gagal.
    console.warn(
      "[submit] cek kuota gagal, lanjut tanpa cek:",
      err instanceof Error ? err.message : err
    );
  }

  // ---- 6. Generate kode tiket unik & render gambar kartu 1080x1080 ----
  const ticketCode = generateTicketCode();
  let png: Buffer;
  try {
    png = await renderMenfessCard(content, { categoryId: category, ticketCode, theme });
  } catch (err) {
    console.error("[submit] gagal generate gambar:", err);
    return fail(
      "IMAGE_FAILED",
      "Gagal menyiapkan gambar kartu menfess di server. Coba kirim ulang — kalau masih gagal, coba kurangi karakter spesial yang aneh-aneh.",
      500
    );
  }

  // ---- 7. Mode dry-run: berhenti sebelum menyentuh layanan eksternal ----
  if (isDryRun()) {
    console.log(
      `[submit] DRY RUN — tiket NO.${ticketCode} (${theme}) tergenerasi, upload & posting dilewati.`
    );
    return NextResponse.json<SubmitResponse>({
      ok: true,
      dryRun: true,
      ticketCode,
      theme,
    });
  }

  // ---- 8. Upload sementara ke Cloudinary ----
  let publicId = "";
  let imageUrl = "";
  try {
    const uploaded = await uploadImage(png);
    publicId = uploaded.publicId;
    imageUrl = uploaded.url;
  } catch (err) {
    console.error("[submit] gagal upload Cloudinary:", err);
    return fail(
      "UPLOAD_FAILED",
      "Gagal menaruh gambar di penyimpanan sementara. Ini masalah server, bukan kamu — coba beberapa saat lagi.",
      502
    );
  }

  // Caption Instagram dengan nomor tiket:
  // "— terkirim anonim via [URL site] · NO.[KODE]"
  const caption = buildMenfessCaption(content, {
    category,
    ticketCode,
    siteUrl: SITE_URL,
  });

  // ---- 9. Buat media container IG Carousel (Slide 1 + Slide 2) ----
  let carouselCreationId: string;
  try {
    const slide2Url = await ensureStaticSlide2Url();

    // Buat container item untuk slide 1 (menfess) dan slide 2 (QR CTA) secara paralel
    const [slide1ChildId, slide2ChildId] = await Promise.all([
      createCarouselItem(imageUrl),
      createCarouselItem(slide2Url),
    ]);

    // Satukan ke parent Carousel container dengan caption
    carouselCreationId = await createCarouselContainer(
      [slide1ChildId, slide2ChildId],
      caption
    );
  } catch (err) {
    const ig = err instanceof InstagramError ? err : null;

    // Error 9004: Meta CDN gagal mengunduh gambar dari Cloudinary, coba SEKALI lagi
    // dengan re-upload buffer ke URL segar sebelum menyerah.
    if (ig?.isMediaFetchFailure && publicId) {
      console.warn(
        `[submit] Carousel gagal (Meta fetch media code ${ig.fbCode ?? 9004}) tiket NO.${ticketCode}, mencoba re-upload segar & retry:`
      );
      const stalePublicId = publicId;
      try {
        const reuploaded = await uploadImage(png);
        publicId = reuploaded.publicId;
        imageUrl = reuploaded.url;
        // Bersihkan gambar lama di latar belakang
        deleteImage(stalePublicId).catch(() => {});

        const slide2Url = await ensureStaticSlide2Url();
        const [slide1ChildId, slide2ChildId] = await Promise.all([
          createCarouselItem(imageUrl),
          createCarouselItem(slide2Url),
        ]);

        carouselCreationId = await createCarouselContainer(
          [slide1ChildId, slide2ChildId],
          caption
        );
      } catch (retryErr) {
        await deleteImage(publicId).catch(() => {});
        const retryIg = retryErr instanceof InstagramError ? retryErr : ig;
        console.error("[submit] retry carousel container gagal:", retryIg?.message, retryIg?.fbCode);
        return fail(
          "IG_MEDIA_FAILED",
          `Instagram menolak kartu carousel saat persiapan posting: ${
            retryIg?.message ?? "gagal memproses media"
          }. Coba lagi beberapa menit; kalau terus terjadi, kuota/token IG perlu dicek.`,
          502
        );
      }
    } else {
      await deleteImage(publicId).catch(() => {});
      console.error("[submit] gagal buat carousel container:", ig?.message, ig?.fbCode);
      return fail(
        "IG_MEDIA_FAILED",
        `Instagram menolak kartu carousel saat persiapan posting: ${
          ig?.message ?? "gagal memproses media"
        }. Coba lagi beberapa menit; kalau terus terjadi, kuota/token IG perlu dicek.`,
        502
      );
    }
  }

  // ---- 10. Publish Carousel ----
  let mediaId: string;
  try {
    mediaId = await publishMedia(carouselCreationId);
  } catch (err) {
    await deleteImage(publicId).catch(() => {});
    const ig = err instanceof InstagramError ? err : null;
    console.error("[submit] gagal publish carousel:", ig?.message, ig?.fbCode);
    return fail(
      "IG_PUBLISH_FAILED",
      `Kartu carousel sudah jadi tapi Instagram gagal menerbitkannya: ${
        ig?.message ?? "penolakan dari Instagram API"
      }. Gambar sementara sudah dibersihkan; menfess kamu belum tayang, silakan coba lagi.`,
      502
    );
  }

  // ---- 11. Permalink (best effort) + bersih-bersih ----
  const permalink = await getPermalink(mediaId);
  await deleteImage(publicId).catch(() => {});

  console.log(
    `[submit] OK ip=${ip} ticket=NO.${ticketCode} theme=${theme} chars=${content.length} category=${category} media=${mediaId}`
  );
  return NextResponse.json<SubmitResponse>({
    ok: true,
    permalink,
    ticketCode,
    theme,
  });
}
