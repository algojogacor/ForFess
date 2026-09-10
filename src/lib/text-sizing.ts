/**
 * Logika penentuan ukuran font konten di gambar menfess.
 * File ini MURNI (tanpa dependency server) supaya bisa dipakai bersama:
 * - generate-image.ts (Satori di server)
 * - PostPreview.tsx (preview real-time di /kirim)
 * sehingga preview client 100% akurat dengan hasil server.
 */
import { IMAGE_FONT_TIERS } from "@/constants";

/** Ambil ukuran font (px) yang cocok untuk teks sepanjang `length` karakter. */
export function getFontTier(length: number): number {
  const tier = IMAGE_FONT_TIERS.find((t) => length <= t.maxLen);
  return tier ? tier.size : IMAGE_FONT_TIERS[IMAGE_FONT_TIERS.length - 1].size;
}
