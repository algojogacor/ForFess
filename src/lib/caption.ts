/**
 * Utilitas caption IG — satu sumber kebenaran cara memisahkan "isi
 * menfess" dari boilerplate yang kita tambahkan sendiri saat posting.
 *
 * Dikenali dua format boilerplate:
 *  - Format sekarang (/api/submit): `${content}\n\nKirim menfess kamu juga lewat ${SITE_URL}\n\n${tags}`
 *  - Format lama (post lama di akun): `${content}\n\n— terkirim anonim melalui ${host}\n\n${tags}`
 */

/** Penanda awal boilerplate — yang paling AWAL di caption yang menang. */
const BOILERPLATE_MARKERS = [
  "Kirim menfess kamu juga lewat",
  "— terkirim anonim melalui",
];

/** Baris yang isinya cuma hashtag (dibersihkan dari ekor caption). */
const TRAILING_TAGS_RE = /(?:\s*#[^\s#]+\s*)+$/;

/**
 * Ambil bagian "isi menfess" dari caption IG — buang boilerplate
 * sumber link & hashtag. Aman untuk caption undefined/bentuk aneh:
 * selalu mengembalikan string (bisa kosong).
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

  return body.replace(TRAILING_TAGS_RE, "").trim();
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
