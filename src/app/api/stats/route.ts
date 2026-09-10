/**
 * Statistik ringan untuk landing: jumlah post yang pernah tayang di
 * akun IG (field media_count), jumlah suka di post-post terbaru (dari
 * pool bersama lib/media-pool), dan total reaksi pembaca situs (dari
 * database sendiri). Fail-open — jika sumber mana pun gagal, angkanya
 * null/undefined dan UI menyembunyikan segmen itu (bukan angka karangan).
 *
 * Cache in-memory 5 menit supaya landing ramai tidak menghujat Graph API
 * maupun database.
 */
import { NextResponse } from "next/server";
import { getTotalMediaCount, InstagramError } from "@/lib/instagram";
import { getRecentLikesTotal } from "@/lib/media-pool";
import { getTotalReactionCount } from "@/lib/reaksi";

export const runtime = "nodejs";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: {
  posts: number;
  likes?: number;
  readerReactions?: number | null;
  fetchedAt: number;
} | null = null;

export interface StatsResponse {
  ok: true;
  /** Jumlah post tayang; null = tidak bisa dicek saat ini. */
  posts: number | null;
  /** Jumlah suka di post-post terbaru; undefined = tidak bisa dihitung saat ini. */
  likes?: number;
  /** Total reaksi pembaca situs (aggregate DB sendiri); null = DB tak terjangkau. */
  readerReactions?: number | null;
  /** Epoch ms saat angka terakhir benar-benar diambil. */
  checkedAt?: number;
}

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json<StatsResponse>(
      {
        ok: true,
        posts: cache.posts,
        likes: cache.likes,
        readerReactions: cache.readerReactions,
        checkedAt: cache.fetchedAt,
      },
      { headers: { "Cache-Control": "public, s-maxage=180, stale-while-revalidate=600" } }
    );
  }

  try {
    const posts = await getTotalMediaCount();
    const likes = await getRecentLikesTotal();
    // Reaksi dari database sendiri — gagalnya independen dari IG.
    const readerReactions = await getTotalReactionCount();
    cache = { posts, likes, readerReactions, fetchedAt: now };
    return NextResponse.json<StatsResponse>(
      {
        ok: true,
        posts,
        likes,
        readerReactions,
        checkedAt: now,
      },
      { headers: { "Cache-Control": "public, s-maxage=180, stale-while-revalidate=600" } }
    );
  } catch (err) {
    if (err instanceof InstagramError) {
      console.warn("[stats] Instagram error:", err.message, "code:", err.fbCode);
    } else {
      console.warn(
        "[stats] gagal ambil media_count:",
        err instanceof Error ? err.message : err
      );
    }

    // Cache lama masih boleh dipakai (label tetap akurat via checkedAt).
    if (cache) {
      return NextResponse.json<StatsResponse>(
        {
          ok: true,
          posts: cache.posts,
          likes: cache.likes,
          readerReactions: cache.readerReactions,
          checkedAt: cache.fetchedAt,
        },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }

    return NextResponse.json<StatsResponse>(
      { ok: true, posts: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
