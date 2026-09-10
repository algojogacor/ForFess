/**
 * Lookup satu post IG dengan cache in-memory — dipakai bersama oleh
 * halaman /fess/[id] dan OG image-nya, supaya satu kunjungan tidak
 * memanggil Graph API dua kali, dan kunjungan ulang dalam beberapa
 * menit tidak memanggil sama sekali.
 *
 * Pola sama dengan cache arsip: positif 10 menit, negatif 60 detik
 * (biar ID sampah yang di-brute tidak membanjiri Graph API).
 */
import { getMediaById, InstagramError } from "@/lib/instagram";
import type { ArchiveItem } from "@/types/menfess";

const POSITIVE_TTL_MS = 10 * 60 * 1000;
const NEGATIVE_TTL_MS = 60 * 1000;
const MAX_ENTRIES = 100;

const cache = new Map<string, { item: ArchiveItem; at: number }>();
const failedAt = new Map<string, number>();

/**
 * Ambil satu media dengan cache. Melempar InstagramError jika gagal
 * (dan gagal berulang dalam 60 detik terakhir langsung dilempar ulang
 * tanpa menyentuh Graph API).
 */
export async function getMediaCached(mediaId: string): Promise<ArchiveItem> {
  const now = Date.now();

  const hit = cache.get(mediaId);
  if (hit && now - hit.at < POSITIVE_TTL_MS) {
    return hit.item;
  }

  const fail = failedAt.get(mediaId);
  if (fail && now - fail < NEGATIVE_TTL_MS) {
    throw new InstagramError("Baru saja gagal diambil — coba lagi nanti");
  }

  try {
    const item = await getMediaById(mediaId);
    // Jaga ukuran cache tetap kecil (in-memory serverless, bukan database).
    if (cache.size >= MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(mediaId, { item, at: now });
    failedAt.delete(mediaId);
    return item;
  } catch (err) {
    failedAt.set(mediaId, now);
    if (failedAt.size > MAX_ENTRIES) {
      const oldestKey = failedAt.keys().next().value;
      if (oldestKey !== undefined) failedAt.delete(oldestKey);
    }
    throw err;
  }
}
