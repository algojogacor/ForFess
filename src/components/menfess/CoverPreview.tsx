"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { findCategory, SITE_HOST } from "@/constants";
import type { CoverStyle } from "@/lib/cover-template";
import type { AspectRatio } from "@/components/menfess/ImageCropperModal";
import { cn } from "@/lib/utils";

interface CoverPreviewProps {
  title: string;
  imageSrc: string | null;
  style: CoverStyle;
  aspectRatio: AspectRatio;
  category?: string;
  ticketCode?: string;
}

/**
 * Pratinjau langsung Cover Slide 1 di form /kirim.
 * Tampilan identik 100% dengan hasil render Satori di server.
 */
export function CoverPreview({
  title,
  imageSrc,
  style,
  aspectRatio,
  category,
  ticketCode = "DEMO",
}: CoverPreviewProps) {
  const dateStr = useMemo(() => {
    try {
      return format(new Date(), "d MMM yyyy", { locale: localeId }).toUpperCase();
    } catch {
      return "1 OKT 2026";
    }
  }, []);

  const catObj = useMemo(() => findCategory(category ?? ""), [category]);
  const displayTitle = title.trim() || "JUDUL COVER MENFESS AKAN MUNCUL DI SINI";

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border-2 border-ink shadow-[6px_6px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[6px_6px_0_0_#000]",
        aspectRatio === "4:5" ? "aspect-[4/5]" : "aspect-square"
      )}
    >
      {style === "brutalist" ? (
        // ---- GAYA NEO-BRUTALIST FRAME ----
        <div className="flex size-full flex-col justify-between bg-paper p-4 font-sans text-ink">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <span className="rounded-full border border-ink bg-signal px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-ink-fixed">
              ✳ FESS UNERR
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-ink">
              <span>{dateStr}</span>
              <span className="rounded border border-ink bg-[#FFE500] px-1 py-0.2">
                NO. {ticketCode}
              </span>
            </div>
          </div>

          {/* Tengah: Foto */}
          <div className="relative my-2.5 flex-1 overflow-hidden rounded-xl border-2 border-ink bg-black shadow-[3px_3px_0_0_#1B1710]">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt="Pratinjau Cover"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-paper-raised p-4 text-center font-mono text-xs text-ink-faint">
                Belum ada foto yang dipilih
              </div>
            )}
            {catObj && catObj.id !== "bebas" && (
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md border border-ink bg-paper px-2 py-0.5 text-[10px] font-bold shadow-[2px_2px_0_0_#1B1710]">
                <span>{catObj.emoji}</span>
                <span>{catObj.label}</span>
              </div>
            )}
          </div>

          {/* Banner Judul Bawah */}
          <div className="rounded-xl border-2 border-ink bg-[#1B1710] p-3 text-paper shadow-[3px_3px_0_0_#F25C05]">
            <p className="line-clamp-2 font-serif text-[15px] font-extrabold uppercase leading-snug tracking-tight text-[#F8F3E9]">
              {displayTitle}
            </p>
          </div>
        </div>
      ) : (
        // ---- GAYA GLASS BLUR OVERLAY ----
        <div className="relative flex size-full flex-col justify-between overflow-hidden bg-black text-white">
          {/* Foto Full Bleed */}
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt="Pratinjau Cover"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-ink p-4 text-center font-mono text-xs text-paper-soft">
              Belum ada foto yang dipilih
            </div>
          )}

          {/* Header Overlay */}
          <div className="relative z-10 flex items-center justify-between p-3.5">
            <span className="rounded-full border border-white/20 bg-ink/80 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-md">
              ✳ @fess_unerr
            </span>
            <span className="rounded-full border border-ink bg-[#FFE500] px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
              NO. {ticketCode}
            </span>
          </div>

          {/* Bottom Glass Overlay */}
          <div className="relative z-10 flex flex-col bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4 pt-8">
            <p className="line-clamp-3 font-serif text-[16px] font-black uppercase leading-tight text-white drop-shadow-md">
              {displayTitle}
            </p>
            <div className="mt-2 flex items-center justify-between border-t border-white/20 pt-1.5 font-mono text-[9px] text-white/70">
              <span>{SITE_HOST}</span>
              <span>{dateStr}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
