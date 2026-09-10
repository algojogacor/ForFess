/**
 * Kolam media bersama — SATU cache in-memory untuk semua kebutuhan
 * yang butuh daftar post terakhir: /api/arsip, /api/acak, /api/stats,
 * dan jumlah suka. Dulu tiap route punya cache sendiri; sekarang satu
 * sumber supaya 1x fetch per 5 menit melayani semuanya (hemat kuota Graph).
 *
 * Prinsip fail-open tetap sama: pemanggil menerima `null` saat data sama
 * sekali tidak ada, dan memutuskan sendiri respons degrade-nya.
 */
import { listRecentMedia } from "@/lib/instagram";
import type { ArchiveItem } from "@/types/menfess";

/** Umur cache segar (milidetik) — 5 menit. */
const POOL_TTL_MS = 5 * 60 * 1000;
/** Berapa post diambil sekali fetch (cukup buat arsip 24 + pilihan acak). */
const POOL_SIZE = 50;

interface PoolState {
  items: ArchiveItem[];
  fetchedAt: number;
}

let pool: PoolState | null = null;
/** Mencegah beberapa request bersamaan memicu fetch ganda (thundering herd). */
let inflight: Promise<PoolState | null> | null = null;

async function fetchPool(): Promise<PoolState | null> {
  try {
    const items = await listRecentMedia(POOL_SIZE);
    const next: PoolState = { items, fetchedAt: Date.now() };
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

/** Item untuk halaman arsip — pool dipotong ke jumlah maksimum arsip. */
export async function getArsipItems(maxItems: number): Promise<{
  items: ArchiveItem[];
  fetchedAt: number;
  source: "live" | "stale";
} | null> {
  const state = await getMediaPool();
  if (!state) return null;
  const age = Date.now() - state.fetchedAt;
  return {
    items: state.items.slice(0, maxItems),
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
