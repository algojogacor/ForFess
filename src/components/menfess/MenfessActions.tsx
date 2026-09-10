"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { SITE_URL } from "@/constants";

/**
 * Tombol aksi di halaman /fess/[id]: bagikan (Web Share API dengan
 * fallback clipboard) dan salin tautan. Semua feedback pakai state
 * tombol + toast — tidak ada yang diam begitu saja.
 */
export function MenfessActions({ fessId, text }: { fessId: string; text: string }) {
  const pageUrl = `${SITE_URL}/fess/${fessId}`;
  const shareText = text
    ? `Menfess: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`
    : "Menfess anonim dari @fess_unair";

  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      return true;
    } catch {
      toast.error("Gagal menyalin tautan", {
        description:
          "Browser memblokir akses clipboard. Salin manual alamatnya dari address bar, ya.",
      });
      return false;
    }
  };

  const handleShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Fess UNAIR", text: shareText, url: pageUrl });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch (err) {
        // User membatalkan dialog share — bukan error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Gagal karena alasan lain → turun ke clipboard.
      }
    }
    const ok = await copyToClipboard();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.info("Browser kamu nggak dukung dialog share", {
        description: "Tautannya udah disalin ke clipboard — tinggal tempel di chat.",
      });
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShare()}
        aria-label={shared ? "Tautan halaman ini terbagikan" : "Bagikan kartu menfess ini"}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-signal px-3.5 py-2 text-[13px] font-bold uppercase tracking-wide text-ink-fixed transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        {shared ? (
          <>
            <Check className="size-4" aria-hidden />
            Terbagikan
          </>
        ) : (
          <>
            <Share2 className="size-4" aria-hidden />
            Bagikan kartu
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={copied ? "Tautan tersalin ke clipboard" : "Salin tautan halaman ini"}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3.5 py-2 text-[13px] font-bold uppercase tracking-wide transition-colors hover:bg-signal-soft"
      >
        {copied ? (
          <>
            <Check className="size-4 text-tomato-deep" aria-hidden />
            Tersalin
          </>
        ) : (
          <>
            <Link2 className="size-4" aria-hidden />
            Salin tautan
          </>
        )}
      </button>
    </>
  );
}
