import { NextResponse } from "next/server";
import {
  DEFAULT_CATEGORY,
  IG_QUOTA_BUFFER,
  MENFESS_CATEGORY_IDS,
} from "@/constants";
import { isTurnstileEnabled, isDryRun } from "@/lib/config";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateMenfessText, normalizeMenfessText } from "@/lib/validate";
import { checkLimit, InstagramError } from "@/lib/instagram";
import { isPostTheme, type PostTheme, generateTicketCode } from "@/lib/post-template";
import { enqueueMenfess } from "@/lib/queue";
import { publishMenfessCarousel } from "@/lib/publish-carousel";
import type {
  SubmitRequestBody,
  SubmitResponse,
  SubmitErrorCode,
} from "@/types/menfess";

export const runtime = "nodejs";

function fail(
  code: SubmitErrorCode,
  message: string,
  status = 400,
  retryAfter?: number
) {
  return NextResponse.json<SubmitResponse>(
    { ok: false, code, message, ...(retryAfter ? { retryAfter } : {}) },
    {
      status,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
    }
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
    return NextResponse.json<SubmitResponse>({ ok: true });
  }

  // ---- 2. Deteksi Mode: Media vs Teks Murni & Validasi ----
  const hasMedia = Array.isArray(body.mediaItems) && body.mediaItems.length > 0;
  let content = "";
  let coverTitle: string | undefined = undefined;

  if (hasMedia) {
    if (body.mediaItems!.length > 6) {
      return fail(
        "VALIDATION_ERROR",
        "Maksimal 6 foto/video dalam satu kiriman menfess.",
        400
      );
    }

    if (
      !body.coverTitle ||
      typeof body.coverTitle !== "string" ||
      body.coverTitle.trim().length < 2
    ) {
      return fail(
        "VALIDATION_ERROR",
        "Judul cover wajib diisi minimal 2 karakter saat melampirkan foto/video.",
        400
      );
    }

    if (body.coverTitle.trim().length > 120) {
      return fail(
        "VALIDATION_ERROR",
        "Judul cover terlalu panjang (maksimal 120 karakter).",
        400
      );
    }

    coverTitle = normalizeMenfessText(body.coverTitle);

    if (body.content && typeof body.content === "string") {
      const normalizedContent = normalizeMenfessText(body.content);
      if (normalizedContent.length > 500) {
        return fail(
          "VALIDATION_ERROR",
          "Isi cerita menfess maksimal 500 karakter.",
          400
        );
      }
      content = normalizedContent;
    }
  } else {
    // Mode Teks Murni (Wajib ada isi menfess 2–500 karakter)
    const validation = validateMenfessText(body.content);
    if (!validation.ok) {
      return fail("VALIDATION_ERROR", validation.message, 400);
    }
    content = validation.text;
  }

  // Kategori opsional
  const category = MENFESS_CATEGORY_IDS.includes(body.category ?? "")
    ? (body.category as string)
    : DEFAULT_CATEGORY;

  // Tema kartu opsional
  const theme: PostTheme = isPostTheme(body.theme) ? body.theme : "klasik";

  // ---- 3. Rate limit per IP ----
  const ip = getClientIp(request.headers);
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    const waitSec = rl.retryAfter ?? 300;
    const waitMin = Math.ceil(waitSec / 60);
    const waitText =
      waitSec < 90 ? `${waitSec} detik lagi` : `sekitar ${waitMin} menit lagi`;
    return fail(
      "RATE_LIMITED",
      `Hai, sepertinya kamu baru saja mengirim menfess. Tenang dulu sebentar — kamu bisa kirim lagi dalam ${waitText}. Tidak kemana-mana kok! 😊`,
      429,
      waitSec
    );
  }

  // ---- 4. Captcha Turnstile ----
  if (isTurnstileEnabled()) {
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
  }

  // ---- 5. Cek kuota Instagram & Enqueue Otomatis ----
  const ticketCode = generateTicketCode();
  let isQuotaFull = false;

  try {
    const quota = await checkLimit();
    if (quota.remaining <= IG_QUOTA_BUFFER) {
      isQuotaFull = true;
    }
  } catch (quotaErr) {
    console.warn(
      "[submit] Gagal cek kuota IG (fail-open diaktifkan):",
      quotaErr instanceof Error ? quotaErr.message : quotaErr
    );
  }

  if (isQuotaFull) {
    try {
      const queueResult = await enqueueMenfess({
        ticketCode,
        content,
        category,
        theme,
        coverTitle,
        coverStyle: body.coverStyle ?? "brutalist",
        aspectRatio: body.aspectRatio ?? "4:5",
        coverImage: body.coverImage,
        mediaItems: body.mediaItems,
      });

      console.log(
        `[submit] Kuota habis. Menfess NO.${ticketCode} masuk antrean #${queueResult.queuePosition}`
      );

      return NextResponse.json<SubmitResponse>({
        ok: true,
        queued: true,
        ticketCode,
        theme,
        queuePosition: queueResult.queuePosition,
        message: `Kuota posting otomatis Instagram untuk 24 jam terakhir sudah penuh. Menfess kamu aman di antrean ke-${queueResult.queuePosition} (NO. ${ticketCode}) dan otomatis diposting saat kuota tersedia.`,
      });
    } catch (queueErr) {
      console.error("[submit] gagal enqueue menfess ke database:", queueErr);
      return fail(
        "INTERNAL_ERROR",
        "Gagal memasukkan menfess ke dalam antrean. Silakan coba kirim kembali beberapa saat lagi.",
        500
      );
    }
  }

  // ---- 6. Terbitkan Menfess Langsung ke Instagram Carousel ----
  try {
    const result = await publishMenfessCarousel({
      ticketCode,
      category,
      theme,
      content,
      coverTitle,
      coverStyle: body.coverStyle ?? "brutalist",
      aspectRatio: body.aspectRatio ?? "4:5",
      coverImage: body.coverImage,
      mediaItems: body.mediaItems,
      dryRun: isDryRun(),
    });

    console.log(
      `[submit] OK ip=${ip} ticket=NO.${ticketCode} theme=${theme} mediaCount=${
        body.mediaItems?.length ?? 0
      } mediaId=${result.mediaId}`
    );

    return NextResponse.json<SubmitResponse>({
      ok: true,
      permalink: result.permalink,
      ticketCode,
      theme,
    });
  } catch (err) {
    const ig = err instanceof InstagramError ? err : null;
    console.error("[submit] Gagal publikasi menfess:", ig?.message, ig?.fbCode);
    return fail(
      "IG_PUBLISH_FAILED",
      `Instagram menolak kartu carousel saat persiapan posting: ${
        ig?.message ?? "gagal memproses media"
      }. Coba lagi beberapa menit; jika terus terjadi, sistem akan mengarahkan ke antrean.`,
      502
    );
  }
}
