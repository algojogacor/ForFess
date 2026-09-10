/**
 * Koleksi "Tersimpan" — bookmark menfess favorit di localStorage perangkat,
 * BUKAN di server. Prinsip privasinya sama dengan riwayat kiriman: yang
 * disimpan hanyalah data kartu yang memang sudah tayang publik di Instagram
 * (caption, URL gambar, permalink, timestamp, jumlah suka) — nggak ada
 * identitas, nggak ada yang dikirim balik ke server.
 *
 * Kenapa snapshot (bukan cuma ID)? Karena URL gambar IG itu berumur pendek
 * dan arsip situs hanya menampung ~50 post terakhir — kartu lama yang
 * disimpan tetap harus bisa dibuka dari halaman koleksi.
 */

import { useSyncExternalStore } from "react";

import type { ArchiveItem } from "@/types/menfess";

/** Satu kartu yang disimpan — snapshot data publik + waktu simpan. */
export interface SavedFess {
  /** Epoch ms saat disimpan — urutan tampil koleksi (terbaru dulu). */
  savedAt: number;
  /** Snapshot data publik kartu (subset ArchiveItem). */
  item: ArchiveItem;
}

const STORAGE_KEY = "fess-unair:koleksi:v1";
/** Batas jumlah kartu tersimpan — kalau lebih, yang terlama dibuang (FIFO). */
export const KOLEKSI_MAX = 100;

/**
 * Nama event window yang di-dispatch setiap koleksi berubah (dalam tab yang
 * sama). Antar-tab sinkronnya lewat event `storage` bawaan browser —
 * keduanya didengarkan hook useKoleksi.
 */
export const KOLEKSI_CHANGED_EVENT = "fess-unair:koleksi-changed";

/* ------------------------------------------------------------------ */
/* Cache snapshot stabil untuk useSyncExternalStore                    */
/* ------------------------------------------------------------------ */

let cachedList: SavedFess[] | null = null;

/** Parse + validasi isi localStorage → SavedFess[] (terbaru dulu). */
function readRaw(): SavedFess[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedFess[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s) =>
          s &&
          typeof s.savedAt === "number" &&
          s.item &&
          typeof s.item.id === "string"
      )
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, KOLEKSI_MAX);
  } catch {
    /* localStorage diblokir / JSON rusak — koleksi adalah bonus, bukan syarat */
    return [];
  }
}

/** Baca koleksi dengan cache stabil (referensi berubah hanya saat data berubah). */
function readCached(): SavedFess[] {
  if (typeof window === "undefined") return [];
  if (cachedList) return cachedList;
  cachedList = readRaw();
  return cachedList;
}

/** Invalidate semua cache + umumkan ke UI bahwa koleksi berubah. */
function announce(): void {
  cachedList = null;
  cachedIds = null;
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(KOLEKSI_CHANGED_EVENT));
  } catch {
    /* abaikan */
  }
}

/* ------------------------------------------------------------------ */
/* Operasi koleksi                                                     */
/* ------------------------------------------------------------------ */

/** Daftar semua kartu tersimpan (terbaru dulu). Aman dipanggil di server → []. */
export function listKoleksi(): SavedFess[] {
  return readCached();
}

/** ID semua kartu tersimpan — untuk cek cepat isSaved. */
export function koleksiIds(): Set<string> {
  return new Set(readCached().map((s) => s.item.id));
}

/** Apakah kartu dengan id ini tersimpan? */
export function isSaved(id: string): boolean {
  return readCached().some((s) => s.item.id === id);
}

/**
 * Simpan snapshot kartu ke koleksi. Sudah ada? Update snapshotnya
 * (misal likeCount baru) tanpa mengubah urutan savedAt lama.
 * Gagal simpan (storage penuh/diblokir) → null, UI tetap jalan.
 */
export function saveFess(item: ArchiveItem): SavedFess | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = readRaw();
    const prev = existing.find((s) => s.item.id === item.id);
    const record: SavedFess = {
      savedAt: prev?.savedAt ?? Date.now(),
      item: { ...item },
    };
    const next = [record, ...existing.filter((s) => s.item.id !== item.id)]
      .slice(0, KOLEKSI_MAX);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    announce();
    return record;
  } catch {
    return null;
  }
}

/** Hapus satu kartu dari koleksi. true = ada yang terhapus. */
export function unsaveFess(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const existing = readRaw();
    const next = existing.filter((s) => s.item.id !== id);
    if (next.length === existing.length) return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    announce();
    return true;
  } catch {
    return false;
  }
}

/** Toggle: simpan kalau belum, hapus kalau sudah. Balikin state terbaru. */
export function toggleFess(item: ArchiveItem): { saved: boolean } {
  if (isSaved(item.id)) {
    unsaveFess(item.id);
    return { saved: false };
  }
  const rec = saveFess(item);
  return { saved: Boolean(rec) };
}

/** Hapus seluruh koleksi di perangkat ini. */
export function clearKoleksi(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* abaikan */
  }
  announce();
}

/* ------------------------------------------------------------------ */
/* Hook React — useKoleksi (sinkron antar-komponen & antar-tab)         */
/* ------------------------------------------------------------------ */

const subscribe = (onChange: () => void) => {
  const handler = () => {
    // Event `storage` dari tab lain tidak lewat announce() — invalidate
    // manual supaya getSnapshot membaca ulang localStorage.
    cachedList = null;
    cachedIds = null;
    onChange();
  };
  window.addEventListener(KOLEKSI_CHANGED_EVENT, handler);
  // Sinkron antar-tab browser (event storage hanya fire di tab LAIN).
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(KOLEKSI_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};

/** Snapshot kosong stabil — server & pre-hydration. */
const EMPTY: SavedFess[] = [];
const EMPTY_SET: Set<string> = new Set<string>();

let cachedIds: Set<string> | null = null;
function koleksiIdsCached(): Set<string> {
  if (cachedIds) return cachedIds;
  cachedIds = koleksiIds();
  return cachedIds;
}

/**
 * State koleksi yang reaktif: daftar tersimpan + set ID untuk cek cepat.
 * useSyncExternalStore bikin semua SaveButton & badge navbar tersinkar
 * tanpa prop drilling atau context — dan tetap konsisten SSR (server: []).
 */
export function useKoleksi(): {
  list: SavedFess[];
  ids: Set<string>;
  count: number;
} {
  const list = useSyncExternalStore(subscribe, readCached, () => EMPTY);
  const ids = useSyncExternalStore(subscribe, koleksiIdsCached, () => EMPTY_SET);
  return { list, ids, count: list.length };
}
