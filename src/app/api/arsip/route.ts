/**
 * Arsip menfess — ambil postingan terbaru @fess_unair dari Instagram Graph API.
 *
 * Strategi resilience:
 * - Satu cache bersama (lib/media-pool) 5 menit → menghemat kuota Graph API
 *   dan dipakai juga oleh /api/acak dan /api/stats.
 * - Kalau IG gagal dihubungi tapi cache lama ada → sajikan cache (source: stale).
 * - Kalau benar-benar tidak ada data → tetap 200 dengan items kosong;
 *   UI yang menampilkan empty state yang ramah. Endpoint ini tidak pernah 500.
 *
 * Cache-Control s-maxage membantu CDN (Vercel) menyajikan respons yang sama
 * untuk banyak pengunjung tanpa menyentuh server function.
 */
import { NextResponse } from "next/server";
import { getArsipItems } from "@/lib/media-pool";
import type { ArchiveResponse } from "@/types/menfess";

export const runtime = "nodejs";

/** Jumlah post maksimum yang disajikan (client membaginya per halaman). */
const MAX_ITEMS = 24;

/** Header cache CDN: 3 menit segar, boleh stale 10 menit saat revalidasi. */
const CACHE_HEADER = "public, s-maxage=180, stale-while-revalidate=600";

export async function GET() {
  const result = await getArsipItems(MAX_ITEMS);

  if (result) {
    return NextResponse.json<ArchiveResponse>(
      {
        ok: true,
        items: result.items,
        source: result.source,
        fetchedAt: result.fetchedAt,
      },
      { headers: { "Cache-Control": CACHE_HEADER } }
    );
  }

  // Tidak ada data sama sekali — bukan error, cukup kosong.
  return NextResponse.json<ArchiveResponse>(
    { ok: true, items: [], source: "unavailable" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
