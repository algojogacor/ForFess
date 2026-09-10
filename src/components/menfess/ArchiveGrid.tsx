"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ExternalLink, Instagram, RefreshCcw } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { IG_HANDLE, IG_PROFILE_URL } from "@/constants";
import type { ArchiveItem, ArchiveResponse, ArchiveSource } from "@/types/menfess";
import { cn } from "@/lib/utils";

/** Panjang excerpt caption sebelum dipotong. */
const CAPTION_EXCERPT_LEN = 160;

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

function ItemCard({ item }: { item: ArchiveItem }) {
  const excerpt = excerptFromCaption(item.caption);
  const date = formatDate(item.timestamp);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-paper-raised transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(22,19,16,0.85)]">
      <a
        href={item.permalink ?? IG_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={excerpt ? `Buka post di Instagram: ${excerpt}` : "Buka post di Instagram"}
        className="relative block aspect-square overflow-hidden border-b-2 border-ink bg-paper"
      >
        {item.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL CDN IG berumur pendek; next/image butuh konfigurasi domain yang terus berubah
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
      </a>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
          {date || "Tanpa tanggal"}
        </p>
        <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">
          {excerpt || "Tanpa caption."}
        </p>
        {item.permalink ? (
          <a
            href={item.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
          >
            Buka di IG
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
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
 */
export function ArchiveGrid() {
  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [source, setSource] = useState<ArchiveSource>("live");
  const [fetchTime, setFetchTime] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-ink-faint">
          {items.length} post terakhir ·{" "}
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
