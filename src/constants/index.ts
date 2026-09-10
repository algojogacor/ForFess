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

/* == Kategori menfess == */

/**
 * Kategori opsional saat mengirim menfess — satu-satunya sumber kebenaran.
 * "bebas" adalah default & TIDAK ditulis ke caption IG (post lama otomatis
 * dianggap bebas, jadi tidak ada migrasi data).
 */
export const MENFESS_CATEGORIES = [
  { id: "bebas", label: "Bebas", emoji: "✳️", hint: "Tanpa label — langsung ke isinya" },
  { id: "curhat", label: "Curhat", emoji: "🌧️", hint: "Uneg-uneg, lelah, butuh didengar" },
  { id: "pengakuan", label: "Pengakuan", emoji: "🤫", hint: "Rahasia yang belum pernah diceritakan" },
  { id: "lucu", label: "Lucu", emoji: "😂", hint: "Kejadian kocak, meme hidup" },
  { id: "semangat", label: "Semangat", emoji: "🔥", hint: "Dukungan, apresiasi, kabar bahagia" },
  { id: "tanya", label: "Nanya", emoji: "🤔", hint: "Pertanyaan buat warga kampus" },
] as const;

export type MenfessCategoryId = (typeof MENFESS_CATEGORIES)[number]["id"];

/** Daftar id yang valid (validasi API & ekstraksi caption). */
export const MENFESS_CATEGORY_IDS: readonly string[] = MENFESS_CATEGORIES.map((c) => c.id);

/** Kategori default — dipakai kalau pengirim tidak memilih apa pun. */
export const DEFAULT_CATEGORY: MenfessCategoryId = "bebas";

/** Cari definisi kategori by id; undefined kalau id tidak dikenal. */
export function findCategory(id: string): (typeof MENFESS_CATEGORIES)[number] | undefined {
  return MENFESS_CATEGORIES.find((c) => c.id === id);
}

/* == Reaksi pembaca (disimpan di SQLite via Prisma) == */

/** Definisi reaksi yang tersedia — satu-satunya sumber kebenaran. */
export const REACTIONS = [
  { kind: "relate", emoji: "🫶", label: "Relate" },
  { kind: "lucu", emoji: "😂", label: "Lucu" },
  { kind: "sedih", emoji: "🥲", label: "Ikut sedih" },
  { kind: "semangat", emoji: "🔥", label: "Semangat" },
] as const;

export type ReactionKind = (typeof REACTIONS)[number]["kind"];

/** Daftar kind yang valid (untuk validasi di API). */
export const REACTION_KINDS: readonly string[] = REACTIONS.map((r) => r.kind);

/** Batas ID media IG yang dianggap wajar (regex validasi di API). */
export const REACTION_MAX_IDS = 50;

/** Format ID media IG yang diterima API reaksi. */
export const REACTION_ID_PATTERN = /^[0-9]{5,25}$/;

/**
 * Rate limit khusus reaksi — jauh lebih longgar dari submit karena
 * klik reaksi itu ringan; tetap ada agar tidak bisa flood database.
 */
export const REACTION_RATE_LIMIT = {
  /** Jeda minimum antar klik reaksi dari IP yang sama (detik). */
  COOLDOWN_SECONDS: 2,
  /** Maksimum reaksi per IP dalam window. */
  MAX_PER_WINDOW: 30,
  /** Window rate limit reaksi (milidetik) — 10 menit. */
  WINDOW_MS: 10 * 60 * 1000,
} as const;
