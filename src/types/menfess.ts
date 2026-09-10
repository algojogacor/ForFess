/**
 * TypeScript types yang dipakai lintas file (client + server).
 * Semua response API mengikuti bentuk ApiResponse supaya kontrak jelas.
 */

/** Kode error spesifik — client memakai ini untuk pesan yang tepat. */
export type SubmitErrorCode =
  | "VALIDATION_ERROR"
  | "CAPTCHA_FAILED"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "IMAGE_FAILED"
  | "UPLOAD_FAILED"
  | "IG_MEDIA_FAILED"
  | "IG_PUBLISH_FAILED"
  | "INTERNAL_ERROR";

export interface SubmitError {
  ok: false;
  code: SubmitErrorCode;
  /** Pesan manusiawi dalam Bahasa Indonesia, siap ditampilkan. */
  message: string;
  /** Detik sampai user boleh coba lagi (hanya untuk RATE_LIMITED). */
  retryAfter?: number;
}

export interface SubmitSuccess {
  ok: true;
  /** Link post IG jika berhasil didapat (best effort). */
  permalink?: string;
  /** True jika berjalan dalam mode dry-run (tidak benar-benar posting). */
  dryRun?: boolean;
}

export type SubmitResponse = SubmitSuccess | SubmitError;

/** Body POST /api/submit. */
export interface SubmitRequestBody {
  /** Isi menfess dari user. */
  content: string;
  /** Token dari widget Turnstile. */
  turnstileToken: string;
  /** Honeypot anti-bot — harus kosong; kalau terisi, request dibuang diam-diam. */
  website?: string;
}

/** Hasil cek kuota content_publishing_limit Instagram. */
export interface InstagramQuota {
  /** Kuota yang dipakai dalam 24 jam terakhir. */
  used: number;
  /** Total kuota per 24 jam. */
  total: number;
  /** Sisa kuota. */
  remaining: number;
}

export interface CheckLimitSuccess {
  ok: true;
  /** null = kuota tidak bisa dicek (API IG gagal) — sistem tetap mengizinkan submit. */
  quota: InstagramQuota | null;
}

export interface CheckLimitError {
  ok: false;
  message: string;
}

export type CheckLimitResponse = CheckLimitSuccess | CheckLimitError;

/** Hasil verifikasi Turnstile di server. */
export interface TurnstileResult {
  success: boolean;
  /**
   * true jika verifikasi dilewati karena siteverify-nya sendiri gagal dihubungi
   * (network error). Fail-open yang disengaja — rate limit tetap jalan.
   */
  softFail?: boolean;
  /** Kode error dari Cloudflare (jika ada). */
  errorCodes?: string[];
}

/** Hasil upload ke Cloudinary. */
export interface CloudinaryUploadResult {
  /** public_id — WAJIB disimpan untuk delete nanti (bukan URL). */
  publicId: string;
  /** URL publik gambar yang bisa diakses Meta. */
  url: string;
}
