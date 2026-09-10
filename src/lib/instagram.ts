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
  like_count?: number;
}

const MEDIA_FIELDS = "id,caption,media_url,permalink,timestamp,like_count";

/** Normalisasi like_count — angka negatif/aneh dianggap tidak ada. */
function toLikeCount(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

/** Bentuk mentah respons /media Graph API, termasuk info pagination. */
interface GraphMediaPage {
  data?: GraphMediaItem[];
  paging?: {
    cursors?: { after?: string; before?: string };
    /** URL halaman berikutnya — hanya ada kalau benar-benar masih ada sisa. */
    next?: string;
  };
}

/**
 * Ambil SATU halaman postingan akun IG, dengan cursor pagination asli
 * dari Graph API. `after` = cursor halaman sebelumnya (opaque, dari Meta).
 *
 * `nextCursor` hanya diisi kalau Meta bilang masih ada halaman berikutnya
 * (ada `paging.next`) — jadi pemanggil tidak pernah dapat cursor mati.
 * Melempar InstagramError jika gagal.
 */
export async function listMediaPage(options: {
  limit: number;
  after?: string;
}): Promise<{ items: ArchiveItem[]; nextCursor: string | null }> {
  const { limit, after } = options;

  const query: Record<string, string> = {
    fields: MEDIA_FIELDS,
    limit: String(limit),
    access_token: accessToken,
  };
  if (after) query.after = after;

  const data = await graphFetch<GraphMediaPage>(`${userId}/media`, { query });

  const items = (data.data ?? [])
    .filter((m) => Boolean(m.media_url))
    .map((m) => ({
      id: m.id,
      caption: m.caption,
      mediaUrl: m.media_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
      likeCount: toLikeCount(m.like_count),
    }));

  const hasMore = typeof data.paging?.next === "string";
  const cursor = data.paging?.cursors?.after;
  return {
    items,
    nextCursor: hasMore && typeof cursor === "string" && cursor.length > 0 ? cursor : null,
  };
}

/**
 * Ambil postingan terbaru akun IG (halaman pertama saja) — dipakai
 * media-pool. Melempar InstagramError jika gagal.
 */
export async function listRecentMedia(limit = 12): Promise<ArchiveItem[]> {
  const { items } = await listMediaPage({ limit });
  return items;
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
      fields: MEDIA_FIELDS,
      access_token: accessToken,
    },
  });

  return {
    id: data.id,
    caption: data.caption,
    mediaUrl: data.media_url,
    permalink: data.permalink,
    timestamp: data.timestamp,
    likeCount: toLikeCount(data.like_count),
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
