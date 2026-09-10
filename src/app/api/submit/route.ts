/**
 * Entry point submission menfess.
 * Pipeline: validasi → honeypot → rate limit → captcha → cek kuota IG →
 * generate gambar → (dry-run? berhenti) → upload Cloudinary → buat container →
 * publish → ambil permalink → hapus gambar sementara.
 *
 * Prinsip: setiap kegagalan menghasilkan pesan SPESIFIK untuk user,
 * bukan "Something went wrong".
 */
import { NextResponse } from "next/server";
import {
  MAX_CHARS,
  MIN_CHARS,
  IG_QUOTA_BUFFER,
  IG_CAPTION_TAGS,
  SITE_URL,
  MENFESS_CATEGORY_IDS,
  DEFAULT_CATEGORY,
} from "@/constants";
import { isDryRun } from "@/lib/config";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { renderMenfessCard } from "@/lib/generate-image";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import {
  checkLimit,
  createMediaContainer,
  publishMedia,
  getPermalink,
  InstagramError,
} from "@/lib/instagram";
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

  // ---- 2. Validasi isi ----
  const content = (body.content ?? "")
    .replace(/\r\n/g, "\n") // normalisasi baris baru Windows
    .trim();

  if (content.length < MIN_CHARS) {
    return fail(
      "VALIDATION_ERROR",
      "Isi menfessnya masih kosong atau kependekan. Tulis minimal beberapa kata ya.",
      400
    );
  }
  if (content.length > MAX_CHARS) {
    return fail(
      "VALIDATION_ERROR",
      `Menfess kamu ${content.length} karakter — batasnya ${MAX_CHARS}. Pangkas dulu sebelum kirim.`,
      400
    );
  }

  // Kategori opsional — tidak dikenal / kosong → diam-diam pakai default
  // (lebih ramah daripada menolak kiriman cuma karena labelnya aneh).
  const category = MENFESS_CATEGORY_IDS.includes(body.category ?? "")
    ? (body.category as string)
    : DEFAULT_CATEGORY;

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

  // ---- 6. Generate gambar 1080x1080 ----
  let png: Buffer;
  try {
    png = await renderMenfessCard(content, category);
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
    console.log("[submit] DRY RUN — gambar tergenerasi, upload & posting dilewati.");
    return NextResponse.json<SubmitResponse>({ ok: true, dryRun: true });
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

  // Caption: teks + baris kategori (HANYA jika bukan "bebas" — post lama
  // & bebas tidak punya baris ini, jadi tidak perlu migrasi apa pun).
  const categoryLine =
    category !== DEFAULT_CATEGORY ? `kategori: ${category}\n\n` : "";
  const caption = `${content}\n\n${categoryLine}Kirim menfess kamu juga lewat ${SITE_URL}\n\n${IG_CAPTION_TAGS}`;

  // ---- 9. Buat media container IG ----
  let creationId: string;
  try {
    creationId = await createMediaContainer(imageUrl, caption);
  } catch (err) {
    await deleteImage(publicId);
    const ig = err instanceof InstagramError ? err : null;
    console.error("[submit] gagal buat media container:", ig?.message, ig?.fbCode);
    return fail(
      "IG_MEDIA_FAILED",
      `Instagram menolak kartu menfess-nya saat persiapan posting${
        ig?.message ? ` — detail: ${ig.message}` : "."
      } Coba lagi beberapa menit; kalau terus terjadi, kuota/token IG perlu dicek.`,
      502
    );
  }

  // ---- 10. Publish ----
  let mediaId: string;
  try {
    mediaId = await publishMedia(creationId);
  } catch (err) {
    await deleteImage(publicId);
    const ig = err instanceof InstagramError ? err : null;
    console.error("[submit] gagal publish:", ig?.message, ig?.fbCode);
    return fail(
      "IG_PUBLISH_FAILED",
      `Kartu sudah jadi tapi Instagram gagal menerbitkannya${
        ig?.message ? ` — detail: ${ig.message}` : "."
      } Gambar sementara sudah dibersihkan; menfess kamu belum tayang, silakan coba lagi.`,
      502
    );
  }

  // ---- 11. Permalink (best effort) + bersih-bersih ----
  const permalink = await getPermalink(mediaId);
  await deleteImage(publicId);

  console.log(
    `[submit] OK ip=${ip} chars=${content.length} category=${category} media=${mediaId}`
  );
  return NextResponse.json<SubmitResponse>({ ok: true, permalink });
}
