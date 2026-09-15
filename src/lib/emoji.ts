/**
 * Helper untuk memuat aset SVG Twemoji secara dinamis untuk Satori.
 *
 * Mengambil SVG dari CDN (cdnjs dengan fallback ke jsdelivr jdecked/twemoji)
 * lalu di-cache di memory. Tidak membutuhkan aset file lokal di node_modules
 * sehingga bundle serverless Vercel tetap sangat kecil dan andal.
 */

const emojiCache = new Map<string, string>();

/**
 * Konversi karakter/grapheme emoji ke format nama file Twemoji hex.
 * - Untuk non-ZWJ sequence: hilangkan variation selector (\uFE0F) -> misal ❤️ jadi 2764.svg
 * - Untuk ZWJ sequence (e.g. ❤️‍🔥): pertahankan utuh -> 2764-fe0f-200d-1f525.svg
 */
export function toTwemojiFileName(emoji: string): string | null {
  if (!emoji) return null;
  const isZwjSequence = emoji.includes("\u200D");
  const normalized = isZwjSequence ? emoji : emoji.replace(/\uFE0F/g, "");

  const codePoints: string[] = [];
  for (const char of normalized) {
    const cp = char.codePointAt(0);
    if (cp === undefined) continue;
    codePoints.push(cp.toString(16));
  }

  if (codePoints.length === 0) return null;
  return codePoints.join("-");
}

/**
 * Fetch SVG Twemoji untuk satu karakter/grapheme emoji dan ubah menjadi Data URI.
 */
export async function loadEmoji(emoji: string): Promise<string | null> {
  const cached = emojiCache.get(emoji);
  if (cached) return cached;

  const fileName = toTwemojiFileName(emoji);
  if (!fileName) return null;

  // 1. Coba CDN cdnjs (sangat cepat, di-edge cache Cloudflare)
  const cdnjsUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${fileName}.svg`;
  try {
    const res = await fetch(cdnjsUrl);
    if (res.ok) {
      const svgText = await res.text();
      const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgText).toString("base64")}`;
      emojiCache.set(emoji, dataUri);
      return dataUri;
    }
  } catch {
    // Lanjut ke fallback di bawah
  }

  // 2. Fallback: jsdelivr jdecked/twemoji (mendukung emoji baru Unicode 15/15.1)
  const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${fileName}.svg`;
  try {
    const res = await fetch(jsdelivrUrl);
    if (res.ok) {
      const svgText = await res.text();
      const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgText).toString("base64")}`;
      emojiCache.set(emoji, dataUri);
      return dataUri;
    }
  } catch (err) {
    console.warn(`[emoji] Gagal memuat twemoji untuk "${emoji}" (${fileName}):`, err);
  }

  return null;
}
