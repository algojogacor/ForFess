"use client";

import { useState } from "react";
import { Check, Download, Link2, Loader2, Quote, Share2 } from "lucide-react";
import { toast } from "sonner";
import { SITE_URL } from "@/constants";

/**
 * Tombol aksi di halaman /fess/[id]: bagikan (Web Share API dengan
 * fallback clipboard), salin tautan, salin teks menfessnya, dan unduh
 * gambar kartunya (1200×630, dibuat server dari teks asli).
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
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // Gambar kartu dibuat server (route opengraph-image — mesin yang
      // sama dengan generator kartu, jadi hasilnya konsisten).
      const res = await fetch(`/fess/${fessId}/opengraph-image`);
      if (!res.ok) {
        throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fess-unair-${fessId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Gambar kartu terunduh", {
        description: "Cek folder unduhan — siap dipasang story atau dikirim ke chat.",
      });
    } catch (err) {
      const status = err instanceof Error && "status" in err ? (err as { status?: number }).status : undefined;
      toast.error("Gagal mengunduh gambar", {
        description:
          status === 404
            ? "Gambar kartu ini nggak ditemukan. Mungkin kartunya sudah tidak tersedia di Instagram."
            : "Server nggak bisa menyiapkan gambarnya sekarang. Coba lagi sebentar, ya.",
      });
    } finally {
      setDownloading(false);
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
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading}
        aria-label="Unduh gambar kartu menfess ini"
        className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3.5 py-2 text-[13px] font-bold uppercase tracking-wide transition-colors hover:bg-signal-soft disabled:cursor-wait disabled:opacity-60"
      >
        {downloading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Menyiapkan…
          </>
        ) : (
          <>
            <Download className="size-4" aria-hidden />
            Unduh gambar
          </>
        )}
      </button>
    </>
  );
}
