/**
 * Normalisasi dan validasi teks menfess dari user.
 * Teks diperlakukan sebagai input hostile: zero-width characters,
 * Unicode direction-override, kontrol ASCII, spasi berlebih, dan format
 * baris baru Windows dinormalisasi sebelum diproses oleh pipeline render & upload.
 */
import { MAX_CHARS, MIN_CHARS } from "@/constants";

/** Karakter zero-width dan Unicode directional override (potensi bypass/obfuscation). */
export const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;

/** Karakter kontrol ASCII kecuali newline (\n) dan horizontal tab (\t). */
export const CONTROL_CHARS = /[\x00-\x08\x0B-\x1F\x7F]/g;

/** Baris kosong beruntun (3 atau lebih) dirapatkan jadi maksimal 2 (\n\n). */
export const EXCESS_NEWLINES = /\n{3,}/g;

export type TextValidation =
  | { ok: true; text: string; length: number }
  | { ok: false; message: string };

/**
 * Normalisasi teks mentah:
 * 1. Menyeragamkan line-ending Windows (\r\n -> \n)
 * 2. Menghapus karakter zero-width & directional override
 * 3. Menghapus karakter kontrol non-cetak
 * 4. Merapatkan baris baru berlebih
 * 5. Membuang trailing space per baris
 * 6. Membuang leading/trailing whitespace
 */
export function normalizeMenfessText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(ZERO_WIDTH, "")
    .replace(CONTROL_CHARS, "")
    .replace(EXCESS_NEWLINES, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/**
 * Validasi dan sanitasi isi menfess.
 * Mengembalikan hasil sukses beserta teks yang telah dinormalkan,
 * atau pesan error spesifik jika tidak memenuhi kriteria.
 */
export function validateMenfessText(raw: unknown): TextValidation {
  if (typeof raw !== "string") {
    return { ok: false, message: "Isi menfess harus berupa teks yang valid." };
  }

  const normalized = normalizeMenfessText(raw);

  if (normalized.length < MIN_CHARS) {
    return {
      ok: false,
      message:
        "Isi menfessnya masih kosong atau kependekan. Tulis minimal beberapa kata ya.",
    };
  }

  if (normalized.length > MAX_CHARS) {
    return {
      ok: false,
      message: `Menfess kamu ${normalized.length} karakter — batasnya ${MAX_CHARS}. Pangkas dulu sebelum kirim.`,
    };
  }

  return { ok: true, text: normalized, length: normalized.length };
}
