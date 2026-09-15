/**
 * Generate gambar post Instagram 1080x1080 dari teks menfess.
 * Pipeline: template (src/lib/post-template.ts) → SVG (Satori) → PNG (sharp).
 * Font di-embed dari base64 (src/lib/fonts.generated.ts) agar tidak
 * bergantung pada filesystem/CDN — aman di lokal maupun Vercel.
 */
import satori from "satori";
import sharp from "sharp";
import {
  spaceGroteskRegularBase64,
  spaceGroteskRegularMeta,
  spaceGroteskMediumBase64,
  spaceGroteskMediumMeta,
  spaceGroteskBoldBase64,
  spaceGroteskBoldMeta,
  spaceMonoRegularBase64,
  spaceMonoRegularMeta,
  frauncesRegularBase64,
  frauncesRegularMeta,
  frauncesBoldBase64,
  frauncesBoldMeta,
} from "@/lib/fonts.generated";
import fs from "fs";
import path from "path";
import {
  buildTemplateNode,
  buildSlide2TemplateNode,
  SATORI_FONTS_REF,
  type BuildTemplateOptions,
  type PostTheme,
} from "@/lib/post-template";
import { loadEmoji } from "@/lib/emoji";

function decodeBase64Font(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

// Daftar font Satori — didaftarkan sekali di level modul.
const SATORI_FONTS = [
  { ...spaceGroteskRegularMeta, data: decodeBase64Font(spaceGroteskRegularBase64) },
  { ...spaceGroteskMediumMeta, data: decodeBase64Font(spaceGroteskMediumBase64) },
  { ...spaceGroteskBoldMeta, data: decodeBase64Font(spaceGroteskBoldBase64) },
  { ...spaceMonoRegularMeta, data: decodeBase64Font(spaceMonoRegularBase64) },
  { ...frauncesRegularMeta, data: decodeBase64Font(frauncesRegularBase64) },
  { ...frauncesBoldMeta, data: decodeBase64Font(frauncesBoldBase64) },
];

export type RenderCardOptions = BuildTemplateOptions;

/**
 * Render teks menfess menjadi PNG 1080x1080.
 * Mendukung opsi kategori, nomor tiket, dan tema warna kartu.
 * Melempar Error jika Satori/sharp gagal — pemanggil (API route)
 * yang menerjemahkannya menjadi pesan yang ramah untuk user.
 */
export async function renderMenfessCard(
  text: string,
  optionsOrCategoryId?: RenderCardOptions | string,
  ticketCode?: string,
  theme?: PostTheme
): Promise<Buffer> {
  let opts: RenderCardOptions = {};
  if (typeof optionsOrCategoryId === "object" && optionsOrCategoryId !== null) {
    opts = optionsOrCategoryId;
  } else if (typeof optionsOrCategoryId === "string") {
    opts = { categoryId: optionsOrCategoryId, ticketCode, theme };
  }

  const node = buildTemplateNode(text, SATORI_FONTS_REF, opts);

  const svg = await satori(node as never, {
    width: 1080,
    height: 1080,
    fonts: SATORI_FONTS as any,
    loadAdditionalAsset: async (code: string, segment: string) => {
      if (code === "emoji") {
        return (await loadEmoji(segment)) ?? [];
      }
      return [];
    },
  });

  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

let cachedQrDataUri: string | null = null;

export function getQrDataUri(): string {
  if (cachedQrDataUri) return cachedQrDataUri;
  const qrPath = path.join(process.cwd(), "public", "qr-fess.png");
  if (fs.existsSync(qrPath)) {
    const b64 = fs.readFileSync(qrPath).toString("base64");
    cachedQrDataUri = `data:image/png;base64,${b64}`;
    return cachedQrDataUri;
  }
  throw new Error(`QR code asset not found at ${qrPath}`);
}

const slide2Cache = new Map<string, Buffer>();

/**
 * Render slide ke-2 (statis QR + CTA) menjadi PNG 1080x1080.
 * Hasil di-cache di memori agar cepat dan tidak membebani server saat submit berikutnya.
 */
export async function renderSlide2Card(theme?: PostTheme): Promise<Buffer> {
  const themeKey = theme || "klasik";
  const cached = slide2Cache.get(themeKey);
  if (cached) return cached;

  const qrDataUri = getQrDataUri();
  const node = buildSlide2TemplateNode({ qrDataUri, theme: themeKey }, SATORI_FONTS_REF);

  const svg = await satori(node as never, {
    width: 1080,
    height: 1080,
    fonts: SATORI_FONTS as any,
  });

  const buffer = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();

  slide2Cache.set(themeKey, buffer);
  return buffer;
}

