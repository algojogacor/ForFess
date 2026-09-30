/**
 * Helper untuk memuat aset SVG Twemoji secara dinamis untuk Satori.
 *
 * Mengambil SVG dari CDN (cdnjs dengan fallback ke jsdelivr jdecked/twemoji)
 * lalu di-cache di memory. Tidak membutuhkan aset file lokal di node_modules
 * sehingga bundle serverless Vercel tetap sangat kecil dan andal.
 *
 * Mendukung seluruh spektrum emoji:
 * - Emoji ekspresi & simbol umum
 * - Bendera negara & wilayah (Regional Indicator symbols, e.g. 🇮🇩, 🇵🇸, 🏴󠁧󠁢󠁥󠁮󠁧󠁿)
 * - Modifikasi warna kulit / Fitzpatrick skin tone modifiers (e.g. 👍🏽, 👨🏻‍💻)
 * - ZWJ sequences (Zero-Width Joiner: ❤️‍🔥, 🏳️‍🌈, 👨‍👩‍👧‍👦, 👁️‍🗨️)
 * - Keycap digits (1️⃣, 2️⃣, #️⃣, *️⃣)
 * - Emoji modern Unicode 14/15/15.1 (🫠, 🥹, 🫡, 🫶, 🫨, 🩷, 🩵, 🩶)
 */

const emojiCache = new Map<string, string>();

/**
 * Hasilkan daftar kandidat nama file Twemoji hex untuk suatu emoji.
 * Menangani variasi selector (\uFE0F) yang berbeda antar-versi CDN Twemoji.
 */
export function getTwemojiFileCandidates(emoji: string): string[] {
  if (!emoji) return [];

  const candidates: string[] = [];

  const toHex = (str: string): string | null => {
    const codePoints: string[] = [];
    for (const char of str) {
      const cp = char.codePointAt(0);
      if (cp !== undefined) codePoints.push(cp.toString(16));
    }
    return codePoints.length > 0 ? codePoints.join("-") : null;
  };

  const isZwjSequence = emoji.includes("\u200D");

  // Kandidat 1: Aturan standar Twemoji (hilangkan \uFE0F jika bukan ZWJ)
  const norm1 = isZwjSequence ? emoji : emoji.replace(/\uFE0F/g, "");
  const c1 = toHex(norm1);
  if (c1) candidates.push(c1);

  // Kandidat 2: Hilangkan semua \uFE0F tanpa syarat (mengatasi ZWJ langka seperti 👁️‍🗨️)
  const norm2 = emoji.replace(/\uFE0F/g, "");
  const c2 = toHex(norm2);
  if (c2 && !candidates.includes(c2)) candidates.push(c2);

  // Kandidat 3: Pertahankan semua \uFE0F utuh (mengatasi keycaps / variasi eksplisit)
  const c3 = toHex(emoji);
  if (c3 && !candidates.includes(c3)) candidates.push(c3);

  return candidates;
}

/**
 * Backward-compatible helper untuk nama file hex Twemoji utama.
 */
export function toTwemojiFileName(emoji: string): string | null {
  const candidates = getTwemojiFileCandidates(emoji);
  return candidates[0] ?? null;
}

/**
 * Fetch SVG Twemoji untuk satu karakter/grapheme emoji dan ubah menjadi Data URI.
 */
export async function loadEmoji(emoji: string): Promise<string | null> {
  const cached = emojiCache.get(emoji);
  if (cached) return cached;

  const candidates = getTwemojiFileCandidates(emoji);
  if (candidates.length === 0) return null;

  for (const fileName of candidates) {
    // 1. Coba CDN cdnjs (sangat cepat, di-edge cache Cloudflare)
    const cdnjsUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${fileName}.svg`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(cdnjsUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const svgText = await res.text();
        const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgText).toString("base64")}`;
        emojiCache.set(emoji, dataUri);
        return dataUri;
      }
    } catch {
      // Lanjut ke fallback
    }

    // 2. Fallback: jsdelivr jdecked/twemoji (mendukung emoji baru Unicode 14/15/15.1)
    const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${fileName}.svg`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(jsdelivrUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const svgText = await res.text();
        const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgText).toString("base64")}`;
        emojiCache.set(emoji, dataUri);
        return dataUri;
      }
    } catch {
      // Coba kandidat berikutnya
    }
  }

  return null;
}
