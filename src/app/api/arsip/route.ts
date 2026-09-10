/**
 * Arsip menfess — ambil postingan terbaru @fess_unair dari Instagram Graph API.
 *
 * Strategi resilience:
 * - Cache in-memory 5 menit → menghemat kuota Graph API saat ramai.
 * - Kalau IG gagal dihubungi tapi cache lama ada → sajikan cache (source: stale).
 * - Kalau benar-benar tidak ada data → tetap 200 dengan items kosong;
 *   UI yang menampilkan empty state yang ramah. Endpoint ini tidak pernah 500.
 */
import { NextResponse } from "next/server";
import { listRecentMedia, InstagramError } from "@/lib/instagram";
import type { ArchiveItem, ArchiveResponse } from "@/types/menfess";

export const runtime = "nodejs";

/** Umur cache segar (milidetik) — 5 menit. */
const CACHE_TTL_MS = 5 * 60 * 1000;
/** Jumlah post maksimum yang disajikan (client membaginya per halaman). */
const MAX_ITEMS = 24;

let cache: { items: ArchiveItem[]; fetchedAt: number } | null = null;

export async function GET() {
  const now = Date.now();

  // 1) Cache masih segar → langsung sajikan tanpa menyentuh Graph API.
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json<ArchiveResponse>({
      ok: true,
      items: cache.items,
      source: "live",
      fetchedAt: cache.fetchedAt,
    });
  }

  // 2) Coba ambil data terbaru dari Instagram.
  try {
    const items = await listRecentMedia(MAX_ITEMS);
    cache = { items, fetchedAt: now };
    return NextResponse.json<ArchiveResponse>({
      ok: true,
      items,
      source: "live",
      fetchedAt: now,
    });
  } catch (err) {
    if (err instanceof InstagramError) {
      console.warn("[arsip] Instagram error:", err.message, "code:", err.fbCode);
    } else {
      console.warn(
        "[arsip] gagal ambil media:",
        err instanceof Error ? err.message : err
      );
    }

    // 3) Punya cache lama → sajikan dengan label stale.
    if (cache) {
      return NextResponse.json<ArchiveResponse>({
        ok: true,
        items: cache.items,
        source: "stale",
        fetchedAt: cache.fetchedAt,
      });
    }

    // 4) Tidak ada data sama sekali — bukan error, cukup kosong.
    return NextResponse.json<ArchiveResponse>({
      ok: true,
      items: [],
      source: "unavailable",
    });
  }
}
