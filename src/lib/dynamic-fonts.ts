/**
 * On-demand dynamic font loader untuk Satori.
 *
 * Mengambil subset font Google Fonts TTF secara dinamis berdasarkan karakter (segment)
 * yang diketikkan user jika karakter tersebut di luar font Latin dan font Arab yang sudah
 * di-preload di memori.
 *
 * Contoh dukungan:
 * - Jepang (Hiragana/Katakana/Kanji) -> Noto Sans JP
 * - Korea (Hangul) -> Noto Sans KR
 * - Tionghoa (Hanzi) -> Noto Sans SC
 * - Sirilik / Rusia -> Noto Sans
 * - Thai -> Noto Sans Thai
 * - Devanagari / Hindi -> Noto Sans Devanagari
 * - Ibrani / Hebrew -> Noto Sans Hebrew
 * - Yunani / Greek -> Noto Sans
 *
 * Keuntungan:
 * - Bundle serverless Vercel tidak membengkak 30-50MB oleh CJK font lengkap.
 * - Font subset hanya diunduh sesuai teks yang dibutuhkan (~5KB - 25KB saja).
 * - Hasil di-cache di memori serverless instance.
 */

export interface SatoriDynamicFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal" | "italic";
}

const dynamicFontCache = new Map<string, SatoriDynamicFont[]>();

function resolveFontFamily(code: string): string {
  const c = code.toLowerCase();
  if (c.includes("ja")) return "Noto Sans JP";
  if (c.includes("ko")) return "Noto Sans KR";
  if (c.includes("zh")) return "Noto Sans SC";
  if (c.includes("th")) return "Noto Sans Thai";
  if (c.includes("devanagari")) return "Noto Sans Devanagari";
  if (c.includes("he") || c.includes("hebrew")) return "Noto Sans Hebrew";
  if (c.includes("ar")) return "Noto Sans Arabic";
  // Default untuk Cyrillic, Greek, atau aksara lainnya
  return "Noto Sans";
}

export async function loadDynamicFont(
  code: string,
  segment: string
): Promise<SatoriDynamicFont[]> {
  if (!code || !segment) return [];

  const family = resolveFontFamily(code);
  const cacheKey = `${family}:${segment}`;
  const cached = dynamicFontCache.get(cacheKey);
  if (cached) return cached;

  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400&text=${encodeURIComponent(segment)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(cssUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const css = await res.text();
    const match = css.match(/src:\s*url\(([^)]+)\)/);
    if (!match) return [];

    const fontUrl = match[1].replace(/['"]/g, "");
    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) return [];

    const fontBuf = Buffer.from(await fontRes.arrayBuffer());
    const fontObj: SatoriDynamicFont[] = [
      {
        name: family,
        data: fontBuf,
        weight: 400,
        style: "normal",
      },
    ];

    dynamicFontCache.set(cacheKey, fontObj);
    return fontObj;
  } catch (err) {
    console.warn(`[font] Gagal memuat dynamic font untuk ${code} ("${segment}"):`, err);
    return [];
  }
}
