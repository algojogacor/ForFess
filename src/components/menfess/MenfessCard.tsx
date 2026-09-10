"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Eye,
  Heart,
  SearchX,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { SaveButton } from "@/components/menfess/SaveButton";
import { PostPreview } from "@/components/menfess/PostPreview";
import { IG_HANDLE, SITE_URL, findCategory } from "@/constants";
import type { ArchiveItem } from "@/types/menfess";
import { excerptFromCaption, extractCategoryFromCaption } from "@/lib/caption";

/** Chip reaksi pembaca di meta kartu — emoji terbanyak + jumlah total. */
export interface ReactionChip {
  emoji: string;
  label: string;
  total: number;
}

export function formatDate(timestamp: string | undefined): string {
  if (!timestamp) return "";
  try {
    return format(new Date(timestamp), "d MMM yyyy · HH:mm", { locale: localeId });
  } catch {
    return "";
  }
}

export function relativeTime(timestamp: string | undefined): string {
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

/**
 * Gambar kartu dengan fallback jujur: URL CDN Instagram itu berumur pendek,
 * jadi kalau <img> gagal dimuat (kartu tersimpan lama), render ulang kartunya
 * di browser dari teks caption — mesin yang sama dengan kartu aslinya.
 */
function CardImage({ item, excerpt }: { item: ArchiveItem; excerpt: string }) {
  // State "rusak" dikunci ke pasangan id+URL: ganti kartu/URL → derivasi
  // otomatis balik ke mode gambar, tanpa perlu reset lewat useEffect.
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const mediaKey = `${item.id}|${item.mediaUrl ?? ""}`;
  const broken = failedKey === mediaKey;

  if (!item.mediaUrl || broken) {
    return (
      <div className="grid size-full place-items-center bg-paper p-4">
        <PostPreview
          text={excerptFromCaption(item.caption, 500) || "Kartu ini tanpa teks."}
          category={findCategory(extractCategoryFromCaption(item.caption) ?? "")?.id}
          ariaLabel={
            excerpt ? `Isi menfess: ${excerpt.slice(0, 120)}` : "Kartu menfess tanpa teks"
          }
          className="max-h-full w-full border-2 border-ink/15 shadow-none"
        />
      </div>
    );
  }

  return (
    <img
      src={item.mediaUrl}
      alt={excerpt || "Kartu menfess di Instagram"}
      loading="lazy"
      onError={() => setFailedKey(mediaKey)}
      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}

interface MenfessCardProps {
  item: ArchiveItem;
  /** Chip reaksi dominan (opsional — bonus, bukan syarat). */
  reaction?: ReactionChip;
  /**
   * Arah tombol simpan: "overlay" = nempel di pojok gambar (grid arsip/koleksi),
   * "row" = tombol berlabel di baris aksi (kartu acak). Default "overlay".
   */
  saveVariant?: "overlay" | "row";
  /** Sembunyikan tombol simpan (mis. kartu demo statis). */
  hideSave?: boolean;
}

/**
 * Kartu menfess serbaguna — dipakai grid arsip, koleksi tersimpan, dan
 * kartu acak. Selalu render tombol simpan (koleksi lokal), bagikan, dan
 * link ke halaman kartu + IG aslinya.
 */
export function MenfessCard({ item, reaction, saveVariant = "overlay", hideSave = false }: MenfessCardProps) {
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-ink bg-paper-raised transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--hard-strong)] focus-within:shadow-[6px_6px_0_0_var(--hard-strong)]">
      <div className="relative block aspect-square overflow-hidden border-b-2 border-ink bg-paper">
        <Link
          href={`/fess/${item.id}`}
          aria-label={excerpt ? `Buka halaman kartu menfess: ${excerpt}` : "Buka halaman kartu menfess"}
          className="absolute inset-0 block outline-none focus-visible:shadow-[inset_0_0_0_3px_var(--focus-ring)]"
        >
          <CardImage item={item} excerpt={excerpt} />
        </Link>

        {/* Hover hint "Lihat kartu" */}
        <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-signal px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-fixed opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <Eye className="size-3" aria-hidden />
          Lihat kartu
        </span>

        {/* Tombol simpan overlay — di pojok kiri atas gambar */}
        {saveVariant === "overlay" && !hideSave ? (
          <div className="absolute left-3 top-3 z-10">
            <SaveButton item={item} variant="overlay" />
          </div>
        ) : null}
      </div>

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
          <div className="ml-auto flex items-center gap-2">
            {saveVariant === "row" && !hideSave ? <SaveButton item={item} variant="row" /> : null}
            <button
              type="button"
              onClick={() => void handleShare()}
              aria-label={
                copied
                  ? "Tautan tersalin ke clipboard"
                  : `Bagikan menfess${excerpt ? `: ${excerpt.slice(0, 60)}` : ""}`
              }
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-paper px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-ink transition-colors hover:bg-signal-soft"
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
      </div>
    </article>
  );
}

/** Skeleton kartu — dipakai grid yang sedang memuat. */
export function SkeletonCard() {
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

/** Kartu "tidak ada hasil" — dipakai koleksi saat snapshot sudah dibersihkan. */
export function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border-2 border-dashed border-ink/25 bg-paper-raised/60 px-5 py-8">
      <SearchX className="size-6 text-ink-faint" aria-hidden />
      <p className="text-[15px] leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}
