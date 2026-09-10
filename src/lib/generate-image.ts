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
} from "@/lib/fonts.generated";
import { buildTemplateNode, SATORI_FONTS_REF } from "@/lib/post-template";

function decodeBase64Font(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

// Daftar font Satori — didaftarkan sekali di level modul.
const SATORI_FONTS = [
  { ...spaceGroteskRegularMeta, data: decodeBase64Font(spaceGroteskRegularBase64) },
  { ...spaceGroteskMediumMeta, data: decodeBase64Font(spaceGroteskMediumBase64) },
  { ...spaceGroteskBoldMeta, data: decodeBase64Font(spaceGroteskBoldBase64) },
  { ...spaceMonoRegularMeta, data: decodeBase64Font(spaceMonoRegularBase64) },
];

/**
 * Render teks menfess menjadi PNG 1080x1080.
 * Melempar Error jika Satori/sharp gagal — pemanggil (API route)
 * yang menerjemahkannya menjadi pesan yang ramah untuk user.
 */
export async function renderMenfessCard(text: string): Promise<Buffer> {
  const node = buildTemplateNode(text, SATORI_FONTS_REF);

  const svg = await satori(node as never, {
    width: 1080,
    height: 1080,
    fonts: SATORI_FONTS,
  });

  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();
}
