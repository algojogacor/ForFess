"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowUpRight,
  ExternalLink,
  Heart,
  Instagram,
  RefreshCcw,
  Shuffle,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { IG_HANDLE, SITE_URL } from "@/constants";
import type { ArchiveItem } from "@/types/menfess";
import { extractMenfessText } from "@/lib/caption";
import { PostPreview } from "@/components/menfess/PostPreview";
import { cn } from "@/lib/utils";

type AcakResponse = {
  ok: true;
  item: ArchiveItem | null;
  reason?: "unavailable" | "empty";
};

type Status = "loading" | "ready" | "empty" | "unavailable";

/** Jeda minimal biar animasi kocok terasa, walau API-nya sekejap. */
const MIN_SPIN_MS = 500;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/**
 * Deck kartu acak: tampilkan satu post sembarang, kocok lagi sesuka hati.
 * Bisa juga pakai keyboard — tekan K untuk kocok (kecuali lagi ngetik).
 */
export function RandomFess() {
  const [item, setItem] = useState<ArchiveItem | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [spinning, setSpinning] = useState(false);
  const currentId = useRef<string | undefined>(undefined);
  const spinningRef = useRef(false);

  const kocok = useCallback(async () => {
    if (spinningRef.current) return; // jangan tumpuk request
    spinningRef.current = true;
    setSpinning(true);

    try {
      const exclude = currentId.current ? `?exclude=${currentId.current}` : "";
      const [res] = await Promise.all([
        fetch(`/api/acak${exclude}`, { cache: "no-store" }),
        wait(MIN_SPIN_MS),
      ]);
      const data = (await res.json()) as AcakResponse;

      if (data.item) {
        setItem(data.item);
        currentId.current = data.item.id;
        setStatus("ready");
      } else {
        setItem(null);
        setStatus(data.reason === "empty" ? "empty" : "unavailable");
      }
    } catch {
      setItem(null);
      setStatus("unavailable");
    } finally {
      spinningRef.current = false;
      setSpinning(false);
    }
  }, []);

  // Muat kartu pertama saat halaman dibuka.
  useEffect(() => {
    void kocok();
  }, [kocok]);

  // Shortcut keyboard: tekan K (tanpa modifier) untuk kocok.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      e.preventDefault();
      void kocok();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kocok]);

  const handleShare = async (card: ArchiveItem) => {
    const url = `${SITE_URL}/fess/${card.id}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Fess UNAIR", url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tautan tersalin", {
        description: "Tinggal tempel di chat buat membagikan kartu ini.",
      });
    } catch {
      toast.error("Gagal menyalin tautan", {
        description: "Browser memblokir clipboard. Salin manual alamatnya, ya.",
      });
    }
  };

  const showDeck = status === "ready" && item !== null;
  const text = item ? extractMenfessText(item.caption) : "";
  const relative = relativeTime(item?.timestamp);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* ==== Deck: kartu utama + dua kartu "gacoan" di belakang ==== */}
      <div className="relative w-full max-w-md">
        {/* Kartu di belakang — bawaan deck */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-6 top-4 -z-10 h-full rounded-2xl border-2 border-ink bg-paper-raised transition-transform duration-300",
            spinning ? "rotate-[7deg]" : "rotate-[3.5deg]"
          )}
        />
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-3 top-2 -z-10 h-full rounded-2xl border-2 border-ink bg-paper-raised transition-transform duration-300",
            spinning ? "-rotate-[6deg]" : "-rotate-[2deg]"
          )}
        />

        {/* Label "Acak" — nempel di tepi atas kartu, di luar area gambar */}
        {showDeck ? (
          <span className="absolute -top-3 left-5 z-20 rotate-[-3deg] rounded-md border-2 border-ink bg-signal px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink-fixed">
            Acak
          </span>
        ) : null}

        {/* Kartu utama */}
        {showDeck && item ? (
          <article
            key={item.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[8px_8px_0_0_var(--hard-strong)]",
              spinning ? "animate-shuffle" : "animate-pop"
            )}
          >
            {item.mediaUrl ? (
              <Link
                href={`/fess/${item.id}`}
                aria-label="Buka halaman kartu menfess ini"
                className="block aspect-square outline-none"
              >
                <img
                  src={item.mediaUrl}
                  alt={text ? `Kartu menfess: ${text.slice(0, 100)}` : "Kartu menfess acak"}
                  className="size-full object-cover"
                  loading="eager"
                />
              </Link>
            ) : (
              <div className="p-4">
                <PostPreview
                  text={text || "Kartu ini tanpa teks."}
                  ariaLabel={text ? `Isi menfess: ${text.slice(0, 120)}` : "Kartu menfess tanpa teks"}
                  className="rounded-xl border-2 border-ink/20"
                />
              </div>
            )}

            {/* Baris meta + aksi di bawah kartu */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-ink bg-paper-raised px-4 py-3">
              {typeof item.likeCount === "number" ? (
                <span
                  className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold tabular-nums text-tomato-deep"
                  title={`${item.likeCount} suka di Instagram`}
                >
                  <Heart className="size-3.5 fill-current" aria-hidden />
                  {item.likeCount}
                </span>
              ) : null}
              {relative ? (
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
                  {relative}
                </span>
              ) : null}

              <div className="ml-auto flex items-center gap-3">
                <Link
                  href={`/fess/${item.id}`}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
                >
                  Halaman kartu
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => void handleShare(item)}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
                >
                  Bagikan
                </button>
                {item.permalink ? (
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Buka postingan asli di Instagram"
                    className="inline-flex items-center gap-1 text-ink-soft transition-colors hover:text-tomato-deep"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    <span className="sr-only">Buka di Instagram</span>
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}

        {/* ==== State: memuat ==== */}
        {status === "loading" && !showDeck ? (
          <div
            aria-hidden
            className="flex aspect-square w-full animate-pulse items-center justify-center rounded-2xl border-2 border-ink/25 bg-paper-raised/60"
          >
            <Instagram className="size-10 text-ink-faint/50" />
          </div>
        ) : null}

        {/* ==== State: belum bisa / belum ada ==== */}
        {(status === "unavailable" || status === "empty") && !spinning ? (
          <Alert
            variant={status === "empty" ? "info" : "warning"}
            title={status === "empty" ? "Arsipnya masih kosong" : "Belum bisa dikocok"}
          >
            {status === "empty" ? (
              <p>
                Belum ada postingan yang bisa diacak. Jadi yang pertama, kirim
                menfess kamu sendiri, yuk.
              </p>
            ) : (
              <p>
                Arsip Instagram lagi nggak bisa dijangkau dari sini (token API
                atau koneksi bermasalah). Kartu tetap bisa dilihat langsung di{" "}
                {IG_HANDLE}.
              </p>
            )}
          </Alert>
        ) : null}
      </div>

      {/* ==== Tombol kocok ==== */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => void kocok()}
          disabled={spinning}
          className={cn(
            buttonVariants({ variant: "signal", size: "lg" }),
            "min-w-56 text-base tracking-wide"
          )}
        >
          {spinning ? (
            <>
              <RefreshCcw className="size-4 animate-spin" aria-hidden />
              Mengocok…
            </>
          ) : (
            <>
              <Shuffle className="size-4" aria-hidden />
              Kocok kartu
            </>
          )}
        </button>
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          atau tekan <kbd className="kbd-chip">K</kbd> di keyboard
        </p>
      </div>

      {/* Peringatan jaringan kecil di bawah tombol — hanya saat status unavailable */}
      {status === "unavailable" ? (
        <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          <WifiOff className="size-3.5" aria-hidden />
          cek koneksi, lalu kocok lagi
        </p>
      ) : null}
    </div>
  );
}
