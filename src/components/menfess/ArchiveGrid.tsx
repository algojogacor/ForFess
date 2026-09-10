"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  Bookmark,
  Instagram,
  Loader2,
  RefreshCcw,
  Search,
  SearchX,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  MenfessCard,
  SkeletonCard,
  formatDate,
  type ReactionChip,
} from "@/components/menfess/MenfessCard";
import { useKoleksi } from "@/lib/koleksi";
import { IG_HANDLE, IG_PROFILE_URL, MENFESS_CATEGORIES, REACTIONS, findCategory } from "@/constants";
import type { ArchiveItem, ArchiveResponse, ArchiveSource } from "@/types/menfess";
import { excerptFromCaption, extractCategoryFromCaption } from "@/lib/caption";
import { cn } from "@/lib/utils";

/** Jumlah kartu per "halaman" tombol Muat lebih banyak. */
const PAGE_SIZE = 9;

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
 * Grid arsip menfess — data live dari /api/arsip (Instagram Graph API).
 * Tidak pernah menampilkan "error" keras: degrade ke cache lama atau
 * empty state dengan ajakan buka IG langsung.
 *
 * Ekstra: pencarian klien-samping, tombol bagikan per kartu, waktu
 * relatif, dan pagination ringan "Muat lebih banyak".
 */
export function ArchiveGrid() {
  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [source, setSource] = useState<ArchiveSource>("live");
  const [fetchTime, setFetchTime] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  /** Urutan tampil: "recent" | "likes" (suka IG) | "reaksi" (pembaca situs). */
  const [sort, setSort] = useState<"recent" | "likes" | "reaksi">("recent");
  /** Filter kategori: null = semua; id kategori = hanya kategori itu. */
  const [category, setCategory] = useState<string | null>(null);
  /** Hitungan reaksi pembaca (database situs) untuk post yang dimuat. */
  const [reactionMap, setReactionMap] = useState<Record<string, { total: number } & Partial<Record<string, number>>>>({});
  /**
   * Cursor opaque pagination server-side. undefined = belum tahu (load pertama),
   * null = habis, string = masih ada halaman berikutnya di server.
   */
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  /** Jumlah koleksi lokal — buat badge tombol Tersimpan di toolbar. */
  const { count: koleksiCount } = useKoleksi();
  /** Ref input pencarian — fokus via shortcut "/". */
  const searchRef = useRef<HTMLInputElement>(null);

  /**
   * Tarik hitungan reaksi pembaca untuk sekumpulan id, lalu gabung ke map.
   * `replace` = buang hitungan lama (load pertama); default = gabung
   * (halaman lanjutan). Reaksi adalah bonus — kegagalan diabaikan diam-diam.
   */
  const mergeReactions = useCallback(async (ids: string[], replace = false) => {
    if (ids.length === 0) return;
    try {
      // Maks 50 id per permintaan — sesuai batas endpoint /api/reaksi.
      const query = ids.slice(0, 50).join(",");
      const rres = await fetch(`/api/reaksi?ids=${encodeURIComponent(query)}`);
      if (!rres.ok) return;
      const rdata = (await rres.json()) as {
        counts?: Record<string, { total: number } & Partial<Record<string, number>>>;
      };
      const counts = rdata.counts ?? {};
      setTimeout(() => {
        setReactionMap((prev) => (replace ? counts : { ...prev, ...counts }));
      }, 0);
    } catch {
      // Arsip tetap tampil tanpa chip reaksi.
    }
  }, []);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/arsip", { cache: "no-store" });
      const data = (await res.json()) as ArchiveResponse;
      const loaded = data.items ?? [];
      setItems(loaded);
      setSource(data.source);
      setFetchTime(data.fetchedAt);
      setNextCursor(data.nextCursor ?? null);

      // Sekalian tarik hitungan reaksi pembaca untuk post yang dimuat.
      if (loaded.length > 0) {
        await mergeReactions(loaded.map((m) => m.id), true);
      } else {
        setTimeout(() => setReactionMap({}), 0);
      }
    } catch {
      // Jaringan gagal total — tampilkan empty state, jangan error keras.
      setItems([]);
      setSource("unavailable");
      setNextCursor(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mergeReactions]);

  useEffect(() => {
    void load(false);
  }, [load]);

  /**
   * Shortcut "/" buat loncat ke pencarian — khas situs arsip. Abaikan
   * kalau user sedang mengetik di input/textarea atau pakai modifier.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Urutkan SEKALI setiap items/sort berubah — bukan di dalam render.
  const sortedItems = useMemo(() => {
    if (!items) return null;
    if (sort === "recent") return items;
    if (sort === "reaksi") {
      return [...items].sort((a, b) => {
        const diff = (reactionMap[b.id]?.total ?? 0) - (reactionMap[a.id]?.total ?? 0);
        if (diff !== 0) return diff;
        // Seri? Yang lebih baru menang.
        return new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime();
      });
    }
    return [...items].sort((a, b) => {
      const likeDiff = (b.likeCount ?? -1) - (a.likeCount ?? -1);
      if (likeDiff !== 0) return likeDiff;
      // Seri? Yang lebih baru menang.
      return new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime();
    });
  }, [items, sort, reactionMap]);

  // Menu urut cuma muncul kalau datanya benar-benar ada —
  // jangan menawarkan pilihan urutan lalu mengurutkan kosong.
  const hasLikeData = useMemo(
    () => (items ?? []).some((m) => typeof m.likeCount === "number"),
    [items]
  );
  const hasReactionData = useMemo(
    () => (items ?? []).some((m) => (reactionMap[m.id]?.total ?? 0) > 0),
    [items, reactionMap]
  );

  // Kategori yang benar-benar ada di post yang dimuat — filter chip cuma
  // menawarkan kategori yang punya isinya (tidak ada chip mati).
  const availableCategories = useMemo(() => {
    const present = new Map<string, number>();
    for (const item of items ?? []) {
      const cat = extractCategoryFromCaption(item.caption);
      if (cat) present.set(cat, (present.get(cat) ?? 0) + 1);
    }
    // Urut sesuai urutan definisi constants, biar konsisten.
    return MENFESS_CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({
      ...c,
      count: present.get(c.id) ?? 0,
    }));
  }, [items]);
  const sortOptions = useMemo(
    () =>
      (
        [
          { value: "recent", label: "Terbaru" },
          ...(hasLikeData ? [{ value: "likes" as const, label: "Paling disukai" }] : []),
          ...(hasReactionData ? [{ value: "reaksi" as const, label: "Paling direaksi" }] : []),
        ] as const
      ),
    [hasLikeData, hasReactionData]
  );

  // Filter klien-samping: kategori + pencarian, di caption SEMUA post yang
  // sudah dimuat (tidak dibatasi halaman yang terlihat) — lebih berguna.
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const filtered = useMemo(() => {
    if (!sortedItems) return null;
    let result = sortedItems;
    if (category) {
      result = result.filter((item) => extractCategoryFromCaption(item.caption) === category);
    }
    if (searching) {
      result = result.filter((item) => (item.caption ?? "").toLowerCase().includes(q));
    }
    return result;
  }, [sortedItems, category, searching, q]);

  /**
   * Tombol "Muat lebih banyak": dua lapis.
   * a) Masih ada kartu yang sudah terdimuat tapi belum diperlihatkan →
   *    cukup geser jendela tampil (instan, tanpa jaringan).
   * b) Lokal habis tapi server masih punya halaman lanjutan (nextCursor) →
   *    ambil halaman berikutnya, gabung (dedupe jaga-jaga), lanjutkan.
   */
  const loadMore = useCallback(async () => {
    if (!items || loadingMore) return;

    if (items.length > visibleCount) {
      setVisibleCount((n) => n + PAGE_SIZE);
      return;
    }

    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/arsip?cursor=${encodeURIComponent(nextCursor)}&limit=18`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        // Server punya pesan spesifik (cursor basi, IG down) — pakai itu.
        let serverMsg: string | undefined;
        try {
          const body = (await res.json()) as { message?: string };
          serverMsg = typeof body.message === "string" ? body.message : undefined;
        } catch {
          // Body bukan JSON — biarkan pesan generik yang tampil.
        }
        throw Object.assign(new Error(serverMsg ?? "fetch gagal"), {
          status: res.status,
          serverMsg,
        });
      }
      const data = (await res.json()) as ArchiveResponse;
      const incoming = data.items ?? [];

      // Dedupe jaga-jaga: pool bisa saja di-refresh di antara dua klik,
      // dan post baru masuk menggeser isi pool — jangan sampai dobel.
      const seen = new Set(items.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));

      const added = fresh.length;
      setItems((prev) => [...(prev ?? []), ...fresh]);
      setNextCursor(data.nextCursor ?? null);
      if (added > 0) {
        setVisibleCount((n) => n + Math.max(added, PAGE_SIZE));
      }
      void mergeReactions(fresh.map((m) => m.id));
    } catch (err) {
      // Halaman lanjutan gagal — data yang sudah tampil tetap utuh,
      // user diberi tahu persis apa yang terjadi.
      const extra = err as { status?: number; serverMsg?: string };
      toast.error("Gagal memuat kartu tambahan", {
        description:
          extra.serverMsg ??
          (extra.status === 400
            ? "Cursor halaman nggak dikenal server (mungkin data sudah di-refresh). Muat ulang halaman, lalu coba lagi."
            : "Instagram nggak bisa dihubungi buat post yang lebih lama. Kartu yang sudah tampil tetap aman — coba lagi sebentar."),
      });
    } finally {
      setLoadingMore(false);
    }
  }, [items, visibleCount, nextCursor, loadingMore, mergeReactions]);

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert variant="info" title="Arsip belum bisa ditampilkan">
          <p>
            Data arsip belum bisa diambil dari Instagram saat ini (mungkin
            token API perlu diperbarui, atau belum ada postingan). Semua
            menfess tetap tayang langsung di akun {IG_HANDLE}.
          </p>
        </Alert>
        <a
          href={IG_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "ink", size: "md" }))}
        >
          <Instagram className="size-4" aria-hidden />
          Lihat langsung di {IG_HANDLE}
        </a>
      </div>
    );
  }

  const visibleItems = searching
    ? filtered ?? []
    : (filtered ?? []).slice(0, visibleCount);
  // Sisa kartu yang sudah terdimuat tapi belum diperlihatkan (pagination instan).
  const localRemaining = searching ? 0 : (filtered?.length ?? 0) - visibleItems.length;
  // Server masih punya halaman lanjutan — post lebih lama dari yang sudah dimuat.
  const serverHasMore = !searching && typeof nextCursor === "string";
  const hasMore = localRemaining > 0 || serverHasMore;
  const totalLabel = searching
    ? `${filtered?.length ?? 0} cocok dari ${items.length} post`
    : `${items.length} post dimuat${
        typeof nextCursor === "string" ? " · masih ada yang lebih lama" : ""
      }`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-ink-faint">
          {totalLabel} ·{" "}
          {source === "stale" ? (
            <span className="text-signal-deep">
              cache sementara{fetchTime ? ` (${formatDate(new Date(fetchTime).toISOString())})` : ""}
            </span>
          ) : (
            "data live dari Instagram"
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tersimpan"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wider transition-colors hover:bg-signal-soft"
          >
            <Bookmark className="size-3.5" aria-hidden />
            Tersimpan
            {koleksiCount > 0 ? (
              <span
                className="rounded-full bg-signal px-1.5 py-px font-mono text-[10px] font-bold tabular-nums leading-none text-ink-fixed"
                title={`${koleksiCount} kartu di koleksi perangkat ini`}
              >
                {koleksiCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/acak"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wider transition-colors hover:bg-signal-soft"
          >
            <Shuffle className="size-3.5" aria-hidden />
            Kartu acak
          </Link>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wider transition-colors hover:bg-signal-soft disabled:opacity-50"
          >
            <RefreshCcw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden />
            Muat ulang
          </button>
        </div>
      </div>

      {/* Pencarian + filter kategori + urutan */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder={`Cari teks di ${items.length} post ini…`}
              aria-label="Cari menfess di arsip yang dimuat"
              className="w-full rounded-xl border-2 border-ink bg-paper-raised py-2.5 pl-10 pr-12 text-[14px] outline-none transition-shadow placeholder:text-ink-faint/80 focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
            />
            {query.length === 0 ? (
              <kbd
                aria-hidden
                title="Tekan / buat langsung mencari"
                className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-ink/25 bg-paper px-1.5 py-px font-mono text-[11px] font-bold text-ink-faint sm:block"
              >
                /
              </kbd>
            ) : null}
          </div>

          {/* Toggle urutan: terbaru / paling disukai / paling direaksi — hanya jika datanya tersedia */}
          {sortOptions.length > 1 ? (
            <div
              role="group"
              aria-label="Urutkan arsip"
              className="flex items-center gap-1 self-start rounded-xl border-2 border-ink bg-paper-raised p-1 sm:self-auto"
            >
              <ArrowDownWideNarrow className="mx-1.5 size-3.5 text-ink-faint" aria-hidden />
              {sortOptions.map((opt) => {
                const active = sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSort(opt.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
                      active
                        ? "bg-signal text-ink-fixed shadow-[2px_2px_0_0_var(--hard-soft)]"
                        : "text-ink-soft hover:bg-ink/5"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Filter kategori — hanya kategori yang benar-benar ada di arsip */}
        {availableCategories.length > 0 ? (
          <div
            role="group"
            aria-label="Saring per kategori"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
              Kategori:
            </span>
            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setVisibleCount(PAGE_SIZE);
              }}
              aria-pressed={category === null}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-150",
                "hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--hard-soft)]",
                category === null
                  ? "bg-ink text-paper"
                  : "bg-paper-raised text-ink-soft"
              )}
            >
              Semua
            </button>
            {availableCategories.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(active ? null : cat.id);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  aria-pressed={active}
                  title={cat.hint}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-150",
                    "hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--hard-soft)]",
                    active
                      ? "border-tomato-deep bg-tomato-deep text-paper"
                      : "border-ink bg-paper-raised text-ink-soft"
                  )}
                >
                  <span aria-hidden className="text-[12px] leading-none">{cat.emoji}</span>
                  {cat.label}
                  <span className={cn("tabular-nums", active ? "opacity-80" : "text-ink-faint")}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {(searching || category) && (filtered?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border-2 border-dashed border-ink/25 bg-paper-raised/60 px-5 py-8">
          <SearchX className="size-6 text-ink-faint" aria-hidden />
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Nggak ada yang cocok{category ? " di kategori ini" : ""}
            {searching ? ` dengan “${query}”` : ""} di {items.length} post
            terakhir. Coba kata kunci lain, atau cari langsung di akun {IG_HANDLE}.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {category ? (
              <button
                type="button"
                onClick={() => {
                  setCategory(null);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="font-mono text-[12px] font-bold uppercase tracking-wider text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
              >
                Bersihkan filter kategori
              </button>
            ) : null}
            {searching ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="font-mono text-[12px] font-bold uppercase tracking-wider text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
              >
                Bersihkan pencarian
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="zine-tilt grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => {
              const rc = reactionMap[item.id];
              const reaction = rc && rc.total > 0 ? dominantReaction(rc) : undefined;
              return <MenfessCard key={item.id} item={item} reaction={reaction} />;
            })}
          </div>
          {hasMore ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Memuat…
                  </>
                ) : localRemaining > 0 ? (
                  <>
                    Muat lebih banyak
                    <span className="font-mono text-[12px] text-ink-faint">
                      {localRemaining} lagi
                    </span>
                  </>
                ) : (
                  <>
                    Muat lebih banyak
                    <span className="font-mono text-[12px] text-ink-faint">
                      dari Instagram
                    </span>
                  </>
                )}
              </button>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
                {Math.min(visibleCount, filtered?.length ?? 0)} dari {items.length} post
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
