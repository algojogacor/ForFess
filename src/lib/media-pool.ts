/**
 * Kolam media bersama — SATU cache in-memory untuk semua kebutuhan
 * yang butuh daftar post terakhir: /api/arsip, /api/acak, /api/stats,
 * dan jumlah suka. Dulu tiap route punya cache sendiri; sekarang satu
 * sumber supaya 1x fetch per 5 menit melayani semuanya (hemat kuota Graph).
 *
 * Prinsip fail-open tetap sama: pemanggil menerima `null` saat data sama
 * sekali tidak ada, dan memutuskan sendiri respons degrade-nya.
 */
import { listMediaPage } from "@/lib/instagram";
import type { ArchiveItem } from "@/types/menfess";

/** Umur cache segar (milidetik) — 5 menit. */
const POOL_TTL_MS = 5 * 60 * 1000;
/** Berapa post diambil sekali fetch (cukup buat arsip 24 + pilihan acak). */
const POOL_SIZE = 50;

interface PoolState {
  items: ArchiveItem[];
  fetchedAt: number;
  /**
   * Cursor Graph API setelah item TERAKHIR pool — hanya ada kalau akun
   * punya lebih banyak post daripada POOL_SIZE. Dipakai pagination arsip
   * buat melanjutkan ke post yang lebih tua dari pool.
   */
  nextCursor: string | null;
}

let pool: PoolState | null = null;
/** Mencegah beberapa request bersamaan memicu fetch ganda (thundering herd). */
let inflight: Promise<PoolState | null> | null = null;

async function fetchPool(): Promise<PoolState | null> {
  try {
    const { items, nextCursor } = await listMediaPage({ limit: POOL_SIZE });
    const next: PoolState = { items, fetchedAt: Date.now(), nextCursor };
    pool = next;
    return next;
  } catch {
    // IG gagal → jangan hancurkan cache lama; pemanggil yang putuskan.
    return null;
  }
}

/**
 * Ambil pool terkini. Segar dari cache bila masih dalam TTL; kalau basi,
 * coba fetch baru — dan kalau fetch gagal, pakai cache lama (stale).
 * Mengembalikan null HANYA kalau tidak pernah ada data sama sekali.
 */
export async function getMediaPool(): Promise<PoolState | null> {
  const now = Date.now();

  // Cache masih segar → pakai langsung.
  if (pool && now - pool.fetchedAt < POOL_TTL_MS) return pool;

  // Sudah ada fetch berjalan → ikut antre hasilnya saja.
  if (inflight) return inflight;

  inflight = fetchPool().finally(() => {
    inflight = null;
  });

  const fresh = await inflight;
  if (fresh) return fresh;
  return pool; // bisa null (belum pernah sukses) atau stale (pernah).
}

/**
 * Satu halaman arsip dengan cursor opaque milik aplikasi sendiri.
 *
 * Bentuk cursor:
 *   `o<angka>`      → halaman masih bisa dilayani dari pool (instan, hemat kuota)
 *   `g<cursor IG>`  → lanjut ke post yang lebih tua dari pool, langsung ke Graph API
 * Cursor tidak ada / tidak dikenal → diperlakukan sebagai halaman pertama.
 *
 * Halaman pertama & halaman `o…` memakai pool (cache 5 menit, stale-safe);
 * halaman `g…` selalu langsung ke Graph API (data lama tidak masuk akal
 * untuk caching pool, dan jarang diminta — hanya oleh user yang memang
 * menjelajah jauh ke belakang).
 *
 * Mengembalikan null HANYA kalau tidak pernah ada data sama sekali.
 */
export async function getArsipPage(options: {
  /** Jumlah item maksimum halaman ini (sudah divalidasi pemanggil). */
  limit: number;
  /** Cursor opaque dari respons sebelumnya; kosong = halaman pertama. */
  cursor?: string;
}): Promise<{
  items: ArchiveItem[];
  nextCursor: string | null;
  fetchedAt: number;
  source: "live" | "stale";
} | null> {
  const { limit } = options;
  const cursor = options.cursor?.trim() || undefined;

  /* ---------- Lanjutan di luar pool: langsung Graph API ---------- */
  if (cursor?.startsWith("g")) {
    const graphAfter = cursor.slice(1);
    if (!graphAfter) return null;
    const page = await listMediaPage({ limit, after: graphAfter });
    return {
      items: page.items,
      nextCursor: page.nextCursor ? `g${page.nextCursor}` : null,
      fetchedAt: Date.now(),
      source: "live",
    };
  }

  /* ---------- Halaman dari pool ---------- */
  let offset = 0;
  if (cursor) {
    if (!/^o\d{1,4}$/.test(cursor)) return null; // cursor asing → halaman pertama
    offset = Number.parseInt(cursor.slice(1), 10);
  }

  const state = await getMediaPool();
  if (!state) return null;

  const slice = state.items.slice(offset, offset + limit);
  const poolLeft = state.items.length - (offset + slice.length);
  const nextCursor =
    poolLeft > 0
      ? `o${offset + slice.length}`
      : state.nextCursor && slice.length > 0
        ? `g${state.nextCursor}`
        : null;

  const age = Date.now() - state.fetchedAt;
  return {
    items: slice,
    nextCursor,
    fetchedAt: state.fetchedAt,
    source: age < POOL_TTL_MS ? "live" : "stale",
  };
}

/**
 * Pilih SATU post acak dari pool. `excludeId` mencegah kartu yang sama
 * muncul dua kali berturut-turut (kalau masih ada kandidat lain).
 * Mengembalikan null kalau pool kosong/tidak tersedia.
 */
export async function pickRandomMedia(
  excludeId?: string
): Promise<ArchiveItem | null> {
  const state = await getMediaPool();
  if (!state || state.items.length === 0) return null;

  let candidates = state.items;
  if (excludeId && state.items.length > 1) {
    const filtered = state.items.filter((m) => m.id !== excludeId);
    if (filtered.length > 0) candidates = filtered;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

/**
 * Jumlah total suka di seluruh pool (post yang berhasil diambil).
 * undefined kalau data tidak tersedia — dipakai strip statistik landing,
 * yang lebih suka tidak tampil daripada menampilkan angka karangan.
 */
export async function getRecentLikesTotal(): Promise<number | undefined> {
  const state = await getMediaPool();
  if (!state) return undefined;

  // Kalau SATU PUN item tidak punya likeCount, anggap data suka tidak
  // bisa diandalkan → undefined (jangan jumlah sebagian).
  if (state.items.some((m) => typeof m.likeCount !== "number")) {
    return undefined;
  }

  return state.items.reduce((sum, m) => sum + (m.likeCount ?? 0), 0);
}
