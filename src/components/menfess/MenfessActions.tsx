"use client";

import { useState } from "react";
import { Check, Link2, Quote, Share2 } from "lucide-react";
import { toast } from "sonner";
import { SITE_URL } from "@/constants";

/**
 * Tombol aksi di halaman /fess/[id]: bagikan (Web Share API dengan
 * fallback clipboard), salin tautan, dan salin teks menfessnya.
 * Semua feedback pakai state tombol + toast — tidak ada yang diam.
 */
export function MenfessActions({ fessId, text }: { fessId: string; text: string }) {
  const pageUrl = `${SITE_URL}/fess/${fessId}`;
  const shareText = text
    ? `Menfess: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`
    : "Menfess anonim dari @fess_unair";

  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
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
    const ok = await copyToClipboard(pageUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.info("Browser kamu nggak dukung dialog share", {
        description: "Tautannya udah disalin ke clipboard — tinggal tempel di chat.",
      });
    } else {
      toast.error("Gagal menyalin tautan", {
        description:
          "Browser memblokir akses clipboard. Salin manual alamatnya dari address bar, ya.",
      });
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(pageUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Gagal menyalin tautan", {
        description:
          "Browser memblokir akses clipboard. Salin manual alamatnya dari address bar, ya.",
      });
    }
  };

  const handleCopyText = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    } else {
      toast.error("Gagal menyalin teks", {
        description: "Browser memblokir akses clipboard. Blok teksnya manual, ya.",
      });
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
      {text ? (
        <button
          type="button"
          onClick={() => void handleCopyText()}
          aria-label={textCopied ? "Teks menfess tersalin" : "Salin teks menfess ini"}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3.5 py-2 text-[13px] font-bold uppercase tracking-wide transition-colors hover:bg-signal-soft"
        >
          {textCopied ? (
            <>
              <Check className="size-4 text-tomato-deep" aria-hidden />
              Teks tersalin
            </>
          ) : (
            <>
              <Quote className="size-4" aria-hidden />
              Salin teks
            </>
          )}
        </button>
      ) : null}
    </>
  );
}
