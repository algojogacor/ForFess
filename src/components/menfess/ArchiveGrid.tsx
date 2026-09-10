"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Check,
  ExternalLink,
  Instagram,
  Link2,
  RefreshCcw,
  Search,
  SearchX,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { IG_HANDLE, IG_PROFILE_URL } from "@/constants";
import type { ArchiveItem, ArchiveResponse, ArchiveSource } from "@/types/menfess";
import { cn } from "@/lib/utils";

/** Panjang excerpt caption sebelum dipotong. */
const CAPTION_EXCERPT_LEN = 160;
/** Jumlah kartu per "halaman" tombol Muat lebih banyak. */
const PAGE_SIZE = 9;

/**
 * Ambil bagian "isi menfess" dari caption IG — buang boilerplate
 * sumber link & hashtag yang kita tambahkan sendiri saat posting.
 */
function excerptFromCaption(caption: string | undefined): string {
  if (!caption) return "";
  const body = caption.split("\n\nKirim menfess")[0].trim();
  if (body.length <= CAPTION_EXCERPT_LEN) return body;
  return `${body.slice(0, CAPTION_EXCERPT_LEN).trimEnd()}…`;
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

/** Bagikan / salin tautan satu kartu — Web Share API, fallback ke clipboard. */
async function shareOrCopy(item: ArchiveItem, excerpt: string): Promise<"shared" | "copied"> {
  const url = item.permalink ?? IG_PROFILE_URL;
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

function ItemCard({ item }: { item: ArchiveItem }) {
  const excerpt = excerptFromCaption(item.caption);
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
    <article className="group flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-paper-raised transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--hard-strong)]">
      <a
        href={item.permalink ?? IG_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={excerpt ? `Buka post di Instagram: ${excerpt}` : "Buka post di Instagram"}
        className="relative block aspect-square overflow-hidden border-b-2 border-ink bg-paper"
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
        <span className="pointer-events-none absolute right-3 top-3 rounded-md border-2 border-ink bg-signal px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-fixed opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Buka IG
        </span>
      </a>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
          {relative ? <span title={date}>{relative}</span> : date || "Tanpa tanggal"}
        </p>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">
          {excerpt || "Tanpa caption."}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
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

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/arsip", { cache: "no-store" });
      const data = (await res.json()) as ArchiveResponse;
      setItems(data.items ?? []);
      setSource(data.source);
      setFetchTime(data.fetchedAt);
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

  // Filter klien-samping: cari di caption SEMUA post yang sudah dimuat
  // (tidak dibatasi halaman yang terlihat) — lebih berguna buat pencarian.
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const filtered =
    items && searching
      ? items.filter((item) => (item.caption ?? "").toLowerCase().includes(q))
      : items;

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

      {/* Pencarian klien-samping di atas post yang sudah dimuat */}
      <div className="relative max-w-md">
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

      {searching && (filtered?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border-2 border-dashed border-ink/25 bg-paper-raised/60 px-5 py-8">
          <SearchX className="size-6 text-ink-faint" aria-hidden />
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Nggak ada yang cocok dengan &ldquo;{query}&rdquo; di {items.length} post
            terakhir. Coba kata kunci lain, atau cari langsung di akun{" "}
            {IG_HANDLE}.
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
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
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
