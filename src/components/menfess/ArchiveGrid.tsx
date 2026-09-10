"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  Check,
  ExternalLink,
  Eye,
  Heart,
  Instagram,
  RefreshCcw,
  Search,
  SearchX,
  Share2,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { IG_HANDLE, IG_PROFILE_URL, MENFESS_CATEGORIES, REACTIONS, SITE_URL, findCategory } from "@/constants";
import type { ArchiveItem, ArchiveResponse, ArchiveSource } from "@/types/menfess";
import { excerptFromCaption, extractCategoryFromCaption } from "@/lib/caption";
import { cn } from "@/lib/utils";

/** Jumlah kartu per "halaman" tombol Muat lebih banyak. */
const PAGE_SIZE = 9;

/** Chip reaksi pembaca di meta kartu — emoji terbanyak + jumlah total. */
interface ReactionChip {
  emoji: string;
  label: string;
  total: number;
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

function formatDate(timestamp: string | undefined): string {
  if (!timestamp) return "";
  try {
    return format(new Date(timestamp), "d MMM yyyy · HH:mm", { locale: localeId });
  } catch {
    return "";
  }
}

function relativeTime(timestamp: string | undefined): string {
  if (!timestamp) return "";
  try {
    return formatDistanceToNowStrict(new Date(timestamp), {
      locale: localeId,
      addSuffix: true,
    });
  } catch {
    return "";
  }
}

/** Bagikan / salin tautan satu kartu — Web Share API, fallback ke clipboard.
 *  Yang dibagikan adalah halaman kartu LOKAL (cepat, ada OG image), bukan IG. */
async function shareOrCopy(item: ArchiveItem, excerpt: string): Promise<"shared" | "copied"> {
  const url = `${SITE_URL}/fess/${item.id}`;
  const text = excerpt ? `Menfess: "${excerpt}"` : `Menfess dari ${IG_HANDLE}`;

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Fess UNAIR", text, url });
      return "shared";
    } catch (err) {
      // User batal share (AbortError) — bukan kegagalan, jangan fallback.
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      // Share gagal karena alasan lain → turun ke clipboard.
    }
  }

  await navigator.clipboard.writeText(url);
  return "copied";
}

function ItemCard({ item, reaction }: { item: ArchiveItem; reaction?: ReactionChip }) {
  const excerpt = excerptFromCaption(item.caption, 160);
  const category = findCategory(extractCategoryFromCaption(item.caption) ?? "");
  const date = formatDate(item.timestamp);
  const relative = relativeTime(item.timestamp);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const result = await shareOrCopy(item, excerpt);
      if (result === "copied") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Tautan tersalin", {
          description: "Browser kamu nggak dukung dialog share, jadi tautannya disalin ke clipboard.",
        });
      } else {
        toast.success("Siap dibagikan!");
      }
    } catch (err) {
      // User batal share — bukan error yang perlu diberitahu.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Clipboard/share gagal betulan (izin diblokir, dsb.) — jangan diam.
      toast.error("Gagal menyalin tautan", {
        description: "Browser memblokir akses clipboard. Pakai tombol \"Buka di IG\" lalu bagikan dari Instagram, ya.",
      });
    }
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-paper-raised transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--hard-strong)] focus-within:shadow-[6px_6px_0_0_var(--hard-strong)]">
      <Link
        href={`/fess/${item.id}`}
        aria-label={excerpt ? `Buka halaman kartu menfess: ${excerpt}` : "Buka halaman kartu menfess"}
        className="relative block aspect-square overflow-hidden border-b-2 border-ink bg-paper outline-none focus-visible:shadow-[inset_0_0_0_3px_var(--focus-ring)]"
      >
        {item.mediaUrl ? (
          <img
            src={item.mediaUrl}
            alt={excerpt || "Kartu menfess di Instagram"}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-ink-faint">
            <Instagram className="size-8" aria-hidden />
          </div>
        )}
        <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-signal px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-fixed opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <Eye className="size-3" aria-hidden />
          Lihat kartu
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
          {typeof item.likeCount === "number" ? (
            <span
              className="inline-flex items-center gap-1 font-bold tabular-nums text-tomato-deep"
              title={`${item.likeCount} suka di Instagram`}
            >
              <Heart className="size-3 fill-current" aria-hidden />
              {item.likeCount}
            </span>
          ) : null}
          {reaction ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-ink/25 bg-signal-soft/60 px-1.5 py-px font-bold tabular-nums text-ink"
              title={`${reaction.total} reaksi pembaca di situs ini (terbanyak: ${reaction.label})`}
            >
              <span aria-hidden className="text-[11px] leading-none">{reaction.emoji}</span>
              {reaction.total}
            </span>
          ) : null}
          {category ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-tomato-deep/40 px-1.5 py-px font-mono text-[10px] font-bold uppercase tracking-wider text-tomato-deep"
              title={`Kategori: ${category.label}`}
            >
              <span aria-hidden className="text-[10px] leading-none">{category.emoji}</span>
              {category.label}
            </span>
          ) : null}
          {relative ? <span title={date}>{relative}</span> : date ? <span>{date}</span> : "Tanpa tanggal"}
        </div>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">
          {excerpt || "Tanpa caption."}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={`/fess/${item.id}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
          >
            Halaman kartu
            <Eye className="size-3.5" aria-hidden />
          </Link>
          {item.permalink ? (
            <a
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
            >
              Buka di IG
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label={
              copied
                ? "Tautan tersalin ke clipboard"
                : `Bagikan menfess${excerpt ? `: ${excerpt.slice(0, 60)}` : ""}`
            }
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-paper px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-ink transition-colors hover:bg-signal-soft"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-tomato-deep" aria-hidden />
                Tersalin
              </>
            ) : (
              <>
                <Share2 className="size-3.5" aria-hidden />
                Bagikan
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="animate-pulse overflow-hidden rounded-2xl border-2 border-ink/20 bg-paper-raised"
    >
      <div className="aspect-square border-b-2 border-ink/10 bg-muted" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>
    </div>
  );
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

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/arsip", { cache: "no-store" });
      const data = (await res.json()) as ArchiveResponse;
      const loaded = data.items ?? [];
      setItems(loaded);
      setSource(data.source);
      setFetchTime(data.fetchedAt);

      // Sekalian tarik hitungan reaksi pembaca untuk post yang dimuat
      // (maks 50 id — sesuai batas endpoint /api/reaksi).
      if (loaded.length > 0) {
        try {
          const ids = loaded.slice(0, 50).map((m) => m.id).join(",");
          const rres = await fetch(`/api/reaksi?ids=${encodeURIComponent(ids)}`);
          if (rres.ok) {
            const rdata = (await rres.json()) as {
              counts?: Record<string, { total: number } & Partial<Record<string, number>>>;
            };
            setTimeout(() => setReactionMap(rdata.counts ?? {}), 0);
          }
        } catch {
          // Reaksi adalah bonus — arsip tetap tampil tanpa chip reaksi.
        }
      } else {
        setTimeout(() => setReactionMap({}), 0);
      }
    } catch {
      // Jaringan gagal total — tampilkan empty state, jangan error keras.
      setItems([]);
      setSource("unavailable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

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
  const hasMore = !searching && (filtered?.length ?? 0) > visibleCount;
  const totalLabel = searching
    ? `${filtered?.length ?? 0} cocok dari ${items.length} post`
    : `${items.length} post terakhir`;

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
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder={`Cari teks di ${items.length} post ini…`}
              aria-label="Cari menfess di arsip yang dimuat"
              className="w-full rounded-xl border-2 border-ink bg-paper-raised py-2.5 pl-10 pr-4 text-[14px] outline-none transition-shadow placeholder:text-ink-faint/80 focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
            />
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => {
              const rc = reactionMap[item.id];
              const reaction = rc && rc.total > 0 ? dominantReaction(rc) : undefined;
              return <ItemCard key={item.id} item={item} reaction={reaction} />;
            })}
          </div>
          {hasMore ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Muat lebih banyak
                <span className="font-mono text-[12px] text-ink-faint">
                  {(filtered?.length ?? 0) - visibleCount} lagi
                </span>
              </button>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
                {visibleCount} dari {filtered?.length ?? 0} post
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
