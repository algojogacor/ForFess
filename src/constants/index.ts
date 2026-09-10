/**
 * Nilai konstan yang dipakai lintas aplikasi.
 * Satu-satunya tempat "magic number" boleh hidup — sisanya import dari sini.
 */

/** Batas karakter menfess (sesuai spek produk). */
export const MAX_CHARS = 500;
/** Panjang minimum isi menfess setelah trim. */
export const MIN_CHARS = 2;

/** Akun Instagram tujuan posting. */
export const IG_HANDLE = "@fess_unair";
export const IG_PROFILE_URL = "https://instagram.com/fess_unair";

/** URL publik situs — dipakai untuk watermark gambar & metadata. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fess-unair.vercel.app";
/** Host tanpa protokol, untuk tampilan singkat (watermark dsb). */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** Versi Instagram Graph API (bisa dioverride lewat env IG_API_VERSION). */
export const IG_API_VERSION = process.env.IG_API_VERSION ?? "v22.0";

/** Endpoint base Instagram Graph API. */
export const IG_GRAPH_URL = `https://graph.facebook.com/${IG_API_VERSION}`;

/** Endpoint verifikasi token Cloudflare Turnstile. */
export const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Folder upload Cloudinary untuk gambar menfess sementara. */
export const CLOUDINARY_FOLDER = "fess-unair";

/** Caption IG: teks menfess + sumber + hashtag. */
export const IG_CAPTION_TAGS = "#MenfessUnair #UnairHebat #Menfess";

/**
 * Rate limit sederhana (in-memory, per instance server).
 * Catatan: di serverless (Vercel) ini per-instance; cukup sebagai lapisan
 * pertama — Turnstile menangani bot di lapisan kedua.
 */
export const RATE_LIMIT = {
  /** Jeda minimum antar submit dari IP yang sama (detik). */
  COOLDOWN_SECONDS: 20,
  /** Maksimum submit per IP dalam window. */
  MAX_PER_WINDOW: 3,
  /** Window rate limit (milidetik) — 15 menit. */
  WINDOW_MS: 15 * 60 * 1000,
} as const;

/** Buffer kuota IG: berhenti menerima submit jika sisa kuota <= nilai ini. */
export const IG_QUOTA_BUFFER = 1;

/**
 * Ukuran font (px) konten pada gambar IG, dipilih berdasarkan panjang teks.
 * Dipakai bersama oleh render Satori (server) dan preview di /kirim (client)
 * agar preview akurat.
 */
export const IMAGE_FONT_TIERS: Array<{ maxLen: number; size: number }> = [
  { maxLen: 30, size: 84 },
  { maxLen: 90, size: 68 },
  { maxLen: 180, size: 54 },
  { maxLen: 300, size: 44 },
  { maxLen: 400, size: 38 },
  { maxLen: Number.MAX_SAFE_INTEGER, size: 33 },
];
