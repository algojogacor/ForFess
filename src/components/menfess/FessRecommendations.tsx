"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Dices } from "lucide-react";
import { MenfessCard, SkeletonCard } from "@/components/menfess/MenfessCard";
import type { ArchiveItem } from "@/types/menfess";

/** Deteksi mount tanpa setState-in-effect (aman hydration & lint). */
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/** Fisher–Yates: acak jujur tanpa bias (sort(Math.random()) itu bias). */
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * "Kartu lainnya" — rekomendasi 3 kartu acak dari arsip di bawah halaman
 * /fess/[id], mengecualikan kartu yang sedang dibuka. Fail-soft: kalau
 * /api/arsip gagal atau kosong, seluruh section menghilang tanpa meninggalkan
 * jejak error — rekomendasi itu bonus, bukan isi halaman.
 */
export function FessRecommendations({ currentId }: { currentId: string }) {
  const mounted = useMounted();
  // null = sedang memuat; [] = arsip kosong/tidak ada kandidat; terisi = tampil.
  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/arsip");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items?: ArchiveItem[] };
        const pool = (data.items ?? []).filter((it) => it && it.id !== currentId);
        if (!cancelled) setItems(pool.length > 0 ? pickRandom(pool, 3) : []);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentId, mounted]);

  // Gagal / belum ada data → section nyaris tak terlihat (skeleton saat memuat).
  if (failed) return null;

  return (
    <section
      aria-labelledby="rekomen-heading"
      className="mx-auto mt-14 max-w-3xl border-t-2 border-dashed border-ink/20 pt-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.2em] text-ink-soft">
            <span
              aria-hidden
              className="inline-grid size-6 rotate-[-4deg] place-items-center rounded-md border-2 border-ink bg-signal"
            >
              <Dices className="size-3.5 text-ink-fixed" aria-hidden />
            </span>
            Kartu lainnya
          </p>
          <h2
            id="rekomen-heading"
            className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Mumpung lagi di sini…
          </h2>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Tiga kartu acak dari arsip — siapa tahu ada yang cocok sama
            perasaan kamu hari ini.
          </p>
        </div>
        <Link
          href="/arsip"
          className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-wider text-ink underline decoration-signal decoration-[3px] underline-offset-4 transition-colors hover:decoration-tomato"
        >
          Lihat semua arsip
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="zine-tilt mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items === null
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : items.map((item) => <MenfessCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}
