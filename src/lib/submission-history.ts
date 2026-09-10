/**
 * Riwayat kiriman lokal ("Kiriman kamu") — disimpan di localStorage
 * perangkat pengguna, BUKAN di server. Data yang disimpan hanyalah teks
 * yang memang sudah tayang publik di Instagram + link post-nya, jadi
 * risiko privasinya minimal; tetap bisa dihapus kapan saja lewat UI.
 *
 * Terpisah dari draf (yang menyimpan teks BELUM terkirim).
 */
import { MAX_CHARS } from "@/constants";

export interface SubmissionRecord {
  /** ID unik lokal (crypto.randomUUID dengan fallback sederhana). */
  id: string;
  /** Teks menfess yang terkirim (sudah public — bukan data rahasia). */
  text: string;
  /** Link post IG jika berhasil didapat. */
  permalink?: string;
  /** True jika pipeline berjalan dalam mode dry-run (belum tayang beneran). */
  dryRun: boolean;
  /** Epoch ms saat submit sukses. */
  at: number;
}

const STORAGE_KEY = "fess-unair:submissions:v1";
/** Batas jumlah riwayat yang disimpan — cukup untuk sesi perangkat ini. */
const MAX_RECORDS = 10;

/**
 * Nama event window yang di-dispatch setelah kiriman baru tersimpan.
 * Komponen riwayat mendengarkan event ini supaya daftarnya langsung
 * menyegarkan tanpa perlu reload halaman.
 */
export const SUBMISSION_SAVED_EVENT = "fess-unair:submission-saved";

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Baca semua riwayat (terbaru dulu). Aman dipanggil di server —
 * mengembalikan array kosong karena localStorage hanya ada di browser.
 */
export function listSubmissions(): SubmissionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SubmissionRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          typeof r.text === "string" &&
          typeof r.at === "number"
      )
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_RECORDS);
  } catch {
    /* localStorage diblokir / JSON rusak — riwayat adalah bonus, bukan syarat */
    return [];
  }
}

/**
 * Simpan satu kiriman sukses ke riwayat. Dipanggil setelah response
 * ok:true dari /api/submit. Mengembalikan record lengkap yang tersimpan.
 */
export function saveSubmission(input: {
  text: string;
  permalink?: string;
  dryRun: boolean;
}): SubmissionRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const record: SubmissionRecord = {
      id: makeId(),
      text: input.text.slice(0, MAX_CHARS),
      ...(input.permalink ? { permalink: input.permalink } : {}),
      dryRun: input.dryRun,
      at: Date.now(),
    };
    const existing = listSubmissions();
    const next = [record, ...existing].slice(0, MAX_RECORDS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Beri tahu UI (SubmissionHistory) bahwa ada data baru.
    window.dispatchEvent(new CustomEvent(SUBMISSION_SAVED_EVENT));
    return record;
  } catch {
    /* penyimpanan penuh/diblokir — jangan biarkan gagal menyimpan merusak UX */
    return null;
  }
}

/** Hapus seluruh riwayat kiriman di perangkat ini. */
export function clearSubmissions(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* abaikan */
  }
}
