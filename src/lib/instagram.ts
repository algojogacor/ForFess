/**
 * Semua interaksi dengan Instagram Graph API:
 * cek kuota, buat media container, publish, dan ambil permalink.
 * Error dibungkus InstagramError supaya API route bisa menerjemahkannya
 * jadi pesan yang spesifik untuk user.
 */
import { IG_GRAPH_URL } from "@/constants";
import { getInstagramConfig } from "@/lib/config";
import type { ArchiveItem, InstagramQuota } from "@/types/menfess";

export class InstagramError extends Error {
  /** Kode error dari Meta (jika ada), berguna untuk logging & mapping pesan. */
  readonly fbCode?: number;
  readonly fbSubcode?: number;
  readonly fbType?: string;

  constructor(
    message: string,
    opts?: { fbCode?: number; fbSubcode?: number; fbType?: string }
  ) {
    super(message);
    this.name = "InstagramError";
    this.fbCode = opts?.fbCode;
    this.fbSubcode = opts?.fbSubcode;
    this.fbType = opts?.fbType;
  }
}

/** Bentuk error standar Graph API. */
interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

async function graphFetch<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {}
): Promise<T> {
  const url = new URL(`${IG_GRAPH_URL}/${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      ...init,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new InstagramError(
      `Tidak bisa menghubungi Instagram Graph API: ${
        err instanceof Error ? err.message : "network error"
      }`
    );
  }

  const body = (await res.json().catch(() => ({}))) as
    | (T & GraphErrorBody)
    | GraphErrorBody;

  if (!res.ok || body.error) {
    const e = body.error;
    throw new InstagramError(
      e?.message ?? `Instagram Graph API merespons ${res.status}`,
      {
        fbCode: e?.code,
        fbSubcode: e?.error_subcode,
        fbType: e?.type,
      }
    );
  }

  return body as T;
}

const { userId, accessToken } = getInstagramConfig();

/**
 * Cek kuota content_publishing_limit (24 jam terakhir).
 * Melempar InstagramError jika panggilan gagal — pemanggil yang
 * memutuskan mau fail-open atau tidak.
 */
export async function checkLimit(): Promise<InstagramQuota> {
  const data = await graphFetch<{
    quota_total?: number;
    quota_remaining?: number;
  }>(userId, {
    query: {
      fields: "content_publishing_limit",
      access_token: accessToken,
    },
  });

  const cpl = (
    data as unknown as {
      content_publishing_limit?: {
        quota_total?: number;
        quota_remaining?: number;
      };
    }
  ).content_publishing_limit;

  const total = cpl?.quota_total ?? 25;
  const remaining = cpl?.quota_remaining ?? 0;
  return { total, remaining, used: Math.max(0, total - remaining) };
}

/** Buat media container (belum tampil di feed). Mengembalikan creation_id. */
export async function createMediaContainer(imageUrl: string, caption: string): Promise<string> {
  const body = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });

  const data = await graphFetch<{ id: string }>(`${userId}/media`, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data.id;
}

/** Publish media container yang sudah jadi. Mengembalikan media id. */
export async function publishMedia(creationId: string): Promise<string> {
  const body = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  const data = await graphFetch<{ id: string }>(`${userId}/media_publish`, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data.id;
}

/** Ambil permalink post (best effort — boleh gagal tanpa menggagalkan submission). */
export async function getPermalink(mediaId: string): Promise<string | undefined> {
  try {
    const data = await graphFetch<{ permalink?: string }>(mediaId, {
      query: { fields: "permalink", access_token: accessToken },
    });
    return data.permalink;
  } catch {
    return undefined;
  }
}

/** Bentuk item dari endpoint /media Graph API. */
interface GraphMediaItem {
  id: string;
  caption?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
}

/**
 * Ambil postingan terbaru akun IG untuk halaman arsip.
 * Melempar InstagramError jika gagal — pemanggil (API arsip) yang
 * memutuskan degrade ke cache atau empty state.
 */
export async function listRecentMedia(limit = 12): Promise<ArchiveItem[]> {
  const data = await graphFetch<{ data?: GraphMediaItem[] }>(`${userId}/media`, {
    query: {
      fields: "id,caption,media_url,permalink,timestamp",
      limit: String(limit),
      access_token: accessToken,
    },
  });

  return (data.data ?? [])
    .filter((m) => Boolean(m.media_url))
    .map((m) => ({
      id: m.id,
      caption: m.caption,
      mediaUrl: m.media_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
    }));
}

/**
 * Ambil SATU post berdasarkan ID — dipakai halaman /fess/[id].
 * Melempar InstagramError jika gagal (termasuk ID nggak dikenal —
 * Meta membalas error "(#100) Tried accessing nonexisting field" dsb.).
 */
export async function getMediaById(mediaId: string): Promise<ArchiveItem> {
  // Hanya terima karakter yang masuk akal untuk ID media Graph API —
  // jaga-jaga biar path nggak bisa diisi hal aneh oleh user.
  if (!/^[A-Za-z0-9_]{5,64}$/.test(mediaId)) {
    throw new InstagramError("Format ID media tidak dikenal");
  }

  const data = await graphFetch<GraphMediaItem>(mediaId, {
    query: {
      fields: "id,caption,media_url,permalink,timestamp",
      access_token: accessToken,
    },
  });

  return {
    id: data.id,
    caption: data.caption,
    mediaUrl: data.media_url,
    permalink: data.permalink,
    timestamp: data.timestamp,
  };
}

/**
 * Jumlah TOTAL post yang pernah tayang di akun (field media_count
 * di node user). Dipakai strip statistik di landing.
 * Melempar InstagramError jika gagal — pemanggil yang memutuskan fail-open.
 */
export async function getTotalMediaCount(): Promise<number> {
  const data = await graphFetch<{ media_count?: number }>(userId, {
    query: {
      fields: "media_count",
      access_token: accessToken,
    },
  });

  const count = data.media_count;
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    throw new InstagramError("media_count tidak valid");
  }
  return count;
}
