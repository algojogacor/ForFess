/**
 * Arsip menfess — ambil postingan terbaru @fess_unair dari Instagram Graph API.
 *
 * Pagination server-side:
 * - Tanpa `?cursor=` → halaman pertama (dari pool bersama, hemat kuota).
 * - Dengan `?cursor=o<k>` → lanjutan yang masih dilayani pool (instan).
 * - Dengan `?cursor=g<after>` → post lebih tua dari pool, langsung Graph API.
 *   Cursor ini opaque dari Meta — client cukup mengembalikannya apa adanya.
 * - `?limit=` 6–24 (default 24).
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
import { NextResponse, type NextRequest } from "next/server";
import { getArsipPage } from "@/lib/media-pool";
import type { ArchiveResponse } from "@/types/menfess";

export const runtime = "nodejs";

/** Jumlah item default & batas per halaman. */
const DEFAULT_LIMIT = 24;
const MIN_LIMIT = 6;
const MAX_LIMIT = 24;

/** Header cache CDN: 3 menit segar, boleh stale 10 menit saat revalidasi. */
const CACHE_HEADER = "public, s-maxage=180, stale-while-revalidate=600";

export async function GET(req: NextRequest) {
  /* ---------- Parameter ---------- */
  const params = req.nextUrl.searchParams;

  const limitRaw = Number.parseInt(params.get("limit") ?? "", 10);
  const limit =
    Number.isInteger(limitRaw) && limitRaw >= MIN_LIMIT && limitRaw <= MAX_LIMIT
      ? limitRaw
      : DEFAULT_LIMIT;

  // Cursor opaque dari server sendiri — bukan input bebas yang dieksekusi.
  const cursorParam = params.get("cursor") ?? undefined;
  const cursor =
    cursorParam && /^(o\d{1,4}|g[A-Za-z0-9._-]{1,512})$/.test(cursorParam)
      ? cursorParam
      : undefined;

  const result = await getArsipPage({ limit, cursor }).catch((err: unknown) => {
    // Halaman lanjutan `g…` langsung menyentuh Graph API — bisa gagal
    // (cursor basi, token bermasalah, jaringan). Endpoint ini dijanjikan
    // TIDAK PERNAH 500: gagal dikomunikasikan terstruktur (ok:false) supaya
    // client bisa menampilkan pesan spesifik tanpa merusak halaman.
    console.error(
      "[api/arsip] halaman lanjutan gagal:",
      err instanceof Error ? err.message : err
    );
    return "failed" as const;
  });

  if (result === "failed") {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Post yang lebih lama nggak bisa diambil dari Instagram saat ini (cursor mungkin sudah basi atau Instagram lagi bermasalah). Coba muat ulang halaman, atau coba lagi sebentar.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (result) {
    return NextResponse.json<ArchiveResponse>(
      {
        ok: true,
        items: result.items,
        source: result.source,
        fetchedAt: result.fetchedAt,
        nextCursor: result.nextCursor,
      },
      { headers: { "Cache-Control": CACHE_HEADER } }
    );
  }

  // Tidak ada data sama sekali — bukan error, cukup kosong.
  return NextResponse.json<ArchiveResponse>(
    { ok: true, items: [], source: "unavailable", nextCursor: null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
