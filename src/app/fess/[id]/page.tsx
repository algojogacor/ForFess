/**
 * Halaman kartu tunggal — /fess/[id]
 * "Permalink lokal" untuk satu menfess: kartunya dirender ulang persis
 * seperti di IG (komponen yang sama dengan generator Satori), plus
 * metadata tanggal, tombol bagikan, dan link ke postingan aslinya.
 *
 * Sumber data: Instagram Graph API lewat getMediaCached (cache 10 menit).
 * Kalau post tidak ada / API gagal → 404 dengan halaman not-found yang
 * sudah dibranding.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, Heart, Instagram } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { buttonVariants } from "@/components/ui/button-variants";
import { PostPreview } from "@/components/menfess/PostPreview";
import { MenfessActions } from "@/components/menfess/MenfessActions";
import { SaveButton } from "@/components/menfess/SaveButton";
import { ReactionBar } from "@/components/menfess/ReactionBar";
import { FessRecommendations } from "@/components/menfess/FessRecommendations";
import { getMediaCached } from "@/lib/media-lookup";
import { InstagramError } from "@/lib/instagram";
import {
  extractMenfessText,
  excerptOfText,
  extractCategoryFromCaption,
} from "@/lib/caption";
import { findCategory, IG_HANDLE } from "@/constants";
import { cn } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/* ---------- Data & metadata (server) ---------- */

async function loadMedia(id: string) {
  try {
    return await getMediaCached(id);
  } catch (err) {
    if (err instanceof InstagramError) {
      console.warn(`[fess/${id}] Instagram error:`, err.message);
    } else {
      console.warn(
        `[fess/${id}] gagal ambil media:`,
        err instanceof Error ? err.message : err
      );
    }
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const media = await loadMedia(id);
  const text = extractMenfessText(media?.caption);

  const title = text
    ? `“${excerptOfText(text, 60)}” — menfess ${IG_HANDLE}`
    : `Kartu menfess — ${IG_HANDLE}`;
  const description = text
    ? `Satu cerita anonim dari civitas UNAIR, tayang di ${IG_HANDLE}.`
    : `Kartu menfess anonim dari ${IG_HANDLE}.`;

  return {
    title,
    description,
    robots: { index: Boolean(text), follow: true },
    alternates: { canonical: `/fess/${id}` },
  };
}

/* ---------- Halaman ---------- */

export default async function FessDetailPage({ params }: PageProps) {
  const { id } = await params;
  const media = await loadMedia(id);

  if (!media) notFound();

  const text = extractMenfessText(media.caption);
  const category = findCategory(extractCategoryFromCaption(media.caption) ?? "");

  let dateLabel = "";
  let dateIso: string | undefined;
  if (media.timestamp) {
    try {
      dateIso = new Date(media.timestamp).toISOString();
      dateLabel = format(new Date(media.timestamp), "d MMMM yyyy · HH:mm 'WIB'", {
        locale: localeId,
      });
    } catch {
      /* timestamp aneh — biarkan kosong, bukan alasan gagal render */
    }
  }

  return (
    <div className="bg-dotgrid">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Breadcrumb kembali */}
        <nav aria-label="Navigasi kembali" className="mb-8">
          <Link
            href="/arsip"
            className="inline-flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-tomato-deep"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Kembali ke arsip
          </Link>
        </nav>

        {/* ==== Kartu utama ==== */}
        <article className="animate-pop">
          <div className="relative mx-auto max-w-xl">
            <span className="absolute -top-3 left-5 z-10 rotate-[-3deg] rounded-md border-2 border-ink bg-signal px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink-fixed">
              Kartu menfess
            </span>
            <PostPreview
              text={text || "Kartu ini tanpa teks."}
              category={category?.id}
              ariaLabel={text ? `Isi menfess: ${excerptOfText(text, 120)}` : "Kartu menfess tanpa teks"}
              className="rounded-2xl border-2 border-ink bg-paper shadow-[8px_8px_0_0_var(--hard-strong)]"
            />
          </div>

          {/* ==== Metadata ==== */}
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border-2 border-ink bg-paper-raised p-5 shadow-[5px_5px_0_0_var(--hard-soft)] sm:p-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] uppercase tracking-[0.15em] text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden />
                {dateLabel ? (
                  dateIso ? (
                    <time dateTime={dateIso}>{dateLabel}</time>
                  ) : (
                    dateLabel
                  )
                ) : (
                  "Tanpa tanggal"
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Instagram className="size-3.5" aria-hidden />
                {IG_HANDLE}
              </span>
              {typeof media.likeCount === "number" ? (
                <span
                  className="inline-flex items-center gap-1.5 font-bold normal-case tracking-normal text-tomato-deep"
                  title={`${media.likeCount} suka di Instagram`}
                >
                  <Heart className="size-3.5 fill-current" aria-hidden />
                  {media.likeCount} suka
                </span>
              ) : null}
              <span className="ml-auto inline-flex items-center gap-1.5 normal-case tracking-normal">
                <span aria-hidden className="text-signal-deep">*</span>
                Anonim
              </span>
            </div>

            {/* Stempel kategori — kalau kiriman memilih satu */}
            {category ? (
              <div className="mt-3">
                <span
                  className="inline-flex -rotate-2 items-center gap-1.5 rounded-md border-2 border-tomato-deep px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-tomato-deep"
                  title={`Kategori kiriman: ${category.label}`}
                >
                  <span aria-hidden className="text-[13px] leading-none">{category.emoji}</span>
                  {category.label}
                </span>
              </div>
            ) : null}

            {/* Teks lengkap — buat screen reader & yang mau salin teksnya */}
            {text ? (
              <blockquote className="mt-4 border-l-4 border-signal pl-4 text-[15px] leading-relaxed text-ink-soft">
                {text}
              </blockquote>
            ) : null}

            {/* ==== Reaksi pembaca (data nyata dari database situs) ==== */}
            <ReactionBar fessId={id} />

            {/* ==== Aksi: bagikan lokal / buka IG / simpan koleksi ==== */}
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-ink/15 pt-5">
              <MenfessActions fessId={id} text={text} />
              {/* Snapshot kartu untuk koleksi localStorage (data publik kartu, bukan data rahasia) */}
              <SaveButton
                item={{
                  id: media.id,
                  caption: media.caption,
                  mediaUrl: media.mediaUrl,
                  permalink: media.permalink,
                  timestamp: media.timestamp,
                  likeCount: media.likeCount,
                }}
                variant="row"
              />
              {media.permalink ? (
                <a
                  href={media.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "md" }))}
                >
                  Postingan asli
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
        </article>

        {/* ==== Rekomendasi: tiga kartu acak dari arsip (fail-soft) ==== */}
        <FessRecommendations currentId={id} />

        {/* ==== CTA lanjutan ==== */}
        <div className="mx-auto mt-12 max-w-xl rounded-2xl border-2 border-dashed border-ink/30 bg-paper-raised/50 p-6 text-center">
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Ada cerita yang mau keluar juga?
          </p>
          <Link
            href="/kirim"
            className={cn(buttonVariants({ variant: "signal", size: "lg" }), "mt-4")}
          >
            Tulis menfess kamu
          </Link>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            Tanpa nama · tanpa akun · langsung tayang
          </p>
        </div>
      </div>
    </div>
  );
}
