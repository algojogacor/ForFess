"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BookmarkX, Search, Shuffle } from "lucide-react";
import { toast } from "sonner";
import {
  MenfessCard,
  type ReactionChip,
} from "@/components/menfess/MenfessCard";
import { clearKoleksi, useKoleksi } from "@/lib/koleksi";
import { REACTIONS } from "@/constants";
import { cn } from "@/lib/utils";
import { KoleksiExport } from "./KoleksiExport";

/** Deteksi mount tanpa setState-in-effect (aman hydration & lint). */
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/** Dari hitungan per-kind, ambil reaksi dominan buat chip kartu. */
function dominantReaction(counts: { total: number } & Partial<Record<string, number>>): ReactionChip | null {
  let best: { emoji: string; label: string; n: number } | null = null;
  for (const r of REACTIONS) {
    const n = counts[r.kind];
    if (typeof n === "number" && n > 0 && (!best || n > best.n)) {
      best = { emoji: r.emoji, label: r.label, n };
    }
  }
  if (!best) return null;
  return { emoji: best.emoji, label: best.label, total: counts.total };
}

/**
 * Grid koleksi tersimpan — snapshot kartu dari localStorage perangkat.
 * Data reaksi pembaca tetap ditarik live (bulk /api/reaksi) supaya chip-nya
 * tidak basi. Semua kartu punya tombol simpan yang (karena kartunya memang
 * tersimpan) berfungsi sebagai tombol hapus.
 */
export function KoleksiGrid() {
  const { list } = useKoleksi();
  const mounted = useMounted();
  const [query, setQuery] = useState("");
  const [reactionMap, setReactionMap] = useState<
    Record<string, { total: number } & Partial<Record<string, number>>>
  >({});
  /** Konfirmasi dua langkah "hapus semua" — false = idle. */
  const [confirmClear, setConfirmClear] = useState(false);

  // Tarik hitungan reaksi untuk id yang tersimpan (maks 50 — batas endpoint).
  const idsKey = useMemo(() => list.slice(0, 50).map((s) => s.item.id).join(","), [list]);

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reaksi?ids=${encodeURIComponent(idsKey)}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          counts?: Record<string, { total: number } & Partial<Record<string, number>>>;
        };
        if (!cancelled) setReactionMap(data.counts ?? {});
      } catch {
        /* reaksi adalah bonus — koleksi tetap tampil tanpa chip */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  // Reset konfirmasi otomatis kalau user berhenti di tengah dua langkah.
  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return list;
    return list.filter((s) => (s.item.caption ?? "").toLowerCase().includes(q));
  }, [list, q]);

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearKoleksi();
    setConfirmClear(false);
    toast.success("Koleksi dibersihkan", {
      description: "Semua kartu tersimpan dihapus dari perangkat ini. Arsip di Instagram nggak terpengaruh.",
    });
  };

  // Sebelum mount: SSR & hydration sengaja merender skeleton (bukan empty
  // state) — supaya yang punya koleksi nggak keburu melihat "kosong" lalu lompat.
  if (!mounted) {
    return (
      <div aria-hidden className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-2xl border-2 border-ink/20 bg-paper-raised"
          >
            <div className="aspect-square border-b-2 border-ink/10 bg-muted" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    /* ==== Empty state — belum ada yang disimpan ==== */
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-ink/30 bg-paper-raised/50 px-6 py-16 text-center">
        <span aria-hidden className="grid size-16 place-items-center rounded-2xl border-2 border-ink bg-signal text-3xl shadow-[4px_4px_0_0_var(--hard-soft)]">
          ✳️
        </span>
        <div className="max-w-md">
          <h2 className="text-xl font-bold">Koleksinya masih kosong.</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Jalan-jalan ke arsip, temukan menfess yang berkesan, lalu tekan
            ikon bookmark di pojok kartunya. Kartu yang kamu simpan bakal
            nongol di sini — cuma di perangkat ini.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/arsip"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-ink px-4 py-2.5 font-mono text-[12px] font-bold uppercase tracking-wider text-paper transition-transform hover:-translate-y-0.5"
          >
            <Search className="size-4" aria-hidden />
            Buka arsip
          </Link>
          <Link
            href="/acak"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-4 py-2.5 font-mono text-[12px] font-bold uppercase tracking-wider transition-colors hover:bg-signal-soft"
          >
            <Shuffle className="size-4" aria-hidden />
            Kocok kartu acak
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ==== Toolbar: cari dalam koleksi + hapus semua ==== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cari teks di ${list.length} kartu tersimpan…`}
            aria-label="Cari menfess di koleksi tersimpan"
            className="w-full rounded-xl border-2 border-ink bg-paper-raised py-2.5 pl-10 pr-4 text-[14px] outline-none transition-shadow placeholder:text-ink-faint/80 focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-ink-faint">
            {list.length} kartu · di perangkat ini saja
          </p>
          <KoleksiExport list={list} />
          <button
            type="button"
            onClick={handleClearAll}
            aria-label={
              confirmClear
                ? "Tekan sekali lagi untuk menghapus seluruh koleksi"
                : "Hapus seluruh koleksi tersimpan"
            }
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wider transition-all outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]",
              confirmClear
                ? "border-tomato-deep bg-tomato-deep text-paper"
                : "border-ink bg-paper-raised text-ink hover:bg-signal-soft"
            )}
          >
            <BookmarkX className="size-3.5" aria-hidden />
            {confirmClear ? "Yakin? Klik lagi" : "Hapus semua"}
          </button>
        </div>
      </div>

      {/* ==== Hasil kosong dalam pencarian ==== */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border-2 border-dashed border-ink/25 bg-paper-raised/60 px-5 py-8">
          <Search className="size-6 text-ink-faint" aria-hidden />
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Nggak ada kartu tersimpan yang cocok dengan “{query}”. Coba kata
            kunci lain, atau bersihkan pencariannya.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="font-mono text-[12px] font-bold uppercase tracking-wider text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
          >
            Bersihkan pencarian
          </button>
        </div>
      ) : (
        <div className="zine-tilt grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const rc = reactionMap[s.item.id];
            const reaction =
              rc && rc.total > 0
                ? (dominantReaction(rc) ?? undefined)
                : undefined;
            return <MenfessCard key={s.item.id} item={s.item} reaction={reaction} />;
          })}
        </div>
      )}
    </div>
  );
}
