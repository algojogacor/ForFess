/**
 * Utilitas caption IG — satu sumber kebenaran cara memisahkan "isi
 * menfess" dari boilerplate yang kita tambahkan sendiri saat posting.
 *
 * Dikenali format boilerplate:
 *  - Format v3 (dengan tiket): `${content}\n\n[kategori: x]\n\n— terkirim anonim via ${SITE_URL} · NO.${ticketCode}\n\n${tags}`
 *  - Format v2 (/api/submit lama): `${content}\n\n[kategori: x]\n\nKirim menfess kamu juga lewat ${SITE_URL}\n\n${tags}`
 *  - Format v1 (post lama di akun): `${content}\n\n— terkirim anonim melalui ${host}\n\n${tags}`
 */

import {
  DEFAULT_CATEGORY,
  IG_CAPTION_TAGS,
  MENFESS_CATEGORY_IDS,
  SITE_URL,
} from "@/constants";

/** Penanda awal boilerplate — yang paling AWAL di caption yang menang. */
const BOILERPLATE_MARKERS = [
  "— terkirim anonim via",
  "— terkirim anonim melalui",
  "Terkirim anonim via",
  "Kirim menfess kamu juga lewat",
];

/** Baris kategori (opsional) — ditulis /api/submit saat user memilih kategori. */
const CATEGORY_LINE_RE = /^kategori:\s*([a-z-]+)\s*$/gm;

/** Baris yang isinya cuma hashtag (dibersihkan dari ekor caption). */
const TRAILING_TAGS_RE = /(?:\s*#[^\s#]+\s*)+$/;

/** Pola tiket di baris atribusi, mis. "· NO.R4LG" atau "· tiket NO.R4LG". */
const TICKET_PATTERN = /(?:·|\u00b7)\s*(?:tiket\s+)?NO\.([A-Z0-9]{4})(?=\s*\n|$)/i;

/**
 * Bangun caption Instagram standar:
 * [isi menfess]
 *
 * [kategori: id] (hanya jika bukan "bebas")
 *
 * Terkirim anonim via [URL] · NO.[KODE]
 *
 * #Hashtags
 */
export function buildMenfessCaption(
  content: string,
  options?: {
    category?: string;
    ticketCode?: string;
    siteUrl?: string;
  }
): string {
  const category = options?.category ?? DEFAULT_CATEGORY;
  const ticketCode = options?.ticketCode;
  const siteUrl = options?.siteUrl ?? SITE_URL;

  const categoryLine =
    category !== DEFAULT_CATEGORY ? `kategori: ${category}\n\n` : "";
  const ticketSuffix = ticketCode ? ` · NO.${ticketCode}` : "";
  const attribution = `Terkirim anonim via ${siteUrl}${ticketSuffix}`;

  return `${content}\n\n${categoryLine}${attribution}\n\n${IG_CAPTION_TAGS}`;
}

/**
 * Ambil nomor tiket menfess dari caption IG.
 * Mengembalikan 4 karakter kode tiket (mis. "R4LG") atau null jika tidak ada.
 */
export function extractTicketFromCaption(
  caption: string | undefined | null
): string | null {
  if (!caption) return null;
  const match = caption.match(TICKET_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Ambil bagian "isi menfess" dari caption IG — buang boilerplate
 * sumber link, baris kategori, nomor tiket, & hashtag. Aman untuk caption
 * undefined/bentuk aneh: selalu mengembalikan string (bisa kosong).
 */
export function extractMenfessText(caption: string | undefined | null): string {
  if (!caption) return "";

  let body = caption;
  let earliest = -1;
  for (const marker of BOILERPLATE_MARKERS) {
    const idx = body.indexOf(marker);
    if (idx >= 0 && (earliest < 0 || idx < earliest)) earliest = idx;
  }
  if (earliest >= 0) body = body.slice(0, earliest);

  return body
    .replace(CATEGORY_LINE_RE, "") // baris "kategori: x" bukan bagian isi
    .replace(TRAILING_TAGS_RE, "")
    .trim();
}

/**
 * Ambil kategori dari caption IG (baris `kategori: <id>` di boilerplate).
 * null kalau tidak ada / id-nya tidak dikenal — post lama & kategori
 * "bebas" memang tidak menulis baris ini.
 */
export function extractCategoryFromCaption(
  caption: string | undefined | null
): string | null {
  if (!caption) return null;
  CATEGORY_LINE_RE.lastIndex = 0; // regex global & dipakai bersama — mulai dari awal
  const match = CATEGORY_LINE_RE.exec(caption);
  CATEGORY_LINE_RE.lastIndex = 0; // reset cursor supaya panggilan berikutnya bersih
  if (!match) return null;
  const id = match[1];
  return MENFESS_CATEGORY_IDS.includes(id) ? id : null;
}

/**
 * Versi pendek untuk judul/meta/cuplikan — dipotong di batas kata
 * supaya nggak ada kata terpotong di tengah.
 */
export function excerptOfText(text: string, maxLen: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLen) return flat;

  const sliced = flat.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  // Kalau ada spasi yang masuk akal (jangan buang setengah kata panjang),
  // potong di situ; kalau nggak, terima saja potongan kasar.
  const boundary = lastSpace > maxLen * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${boundary.trimEnd()}…`;
}

/** Gabungan praktis: caption → cuplikan siap tampil. */
export function excerptFromCaption(
  caption: string | undefined | null,
  maxLen: number
): string {
  return excerptOfText(extractMenfessText(caption), maxLen);
}
