"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, SmilePlus, Sparkles } from "lucide-react";
import { OnlinePresence } from "@/components/common/OnlinePresence";

interface StatsResponse {
  ok: true;
  posts: number | null;
  likes?: number;
  readerReactions?: number | null;
  checkedAt?: number;
}

/**
 * Strip statistik live di landing: jumlah menfess yang sudah tayang
 * (media_count IG), jumlah suka di post-post terbaru (IG), dan total
 * reaksi pembaca situs (database sendiri) — angka NYATA, bukan angka
 * karangan. Fail-open: segmen yang nggak bisa dicek tidak dirender —
 * lebih jujur daripada memamerkan palang palsu. Strip tampil kalau
 * minimal satu angka tersedia.
 */
export function LiveStats() {
  const [posts, setPosts] = useState<number | null>(null);
  const [likes, setLikes] = useState<number | undefined>(undefined);
  const [readerReactions, setReaderReactions] = useState<number | null | undefined>(undefined);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { cache: "no-store" })
      .then((res) => res.json() as Promise<StatsResponse>)
      .then((data) => {
        if (cancelled) return;
        setPosts(typeof data.posts === "number" ? data.posts : null);
        setLikes(typeof data.likes === "number" ? data.likes : undefined);
        setReaderReactions(
          typeof data.readerReactions === "number" ? data.readerReactions : data.readerReactions === null ? null : undefined
        );
      })
      .catch(() => {
        /* jaringan gagal — strip tidak muncul, bukan error untuk user */
      })
      .finally(() => {
        if (!cancelled) setDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tunggu fetch selesai; strip tampil kalau minimal satu angka ada.
  if (!done) return null;
  const hasPosts = posts !== null;
  const hasReactions = typeof readerReactions === "number";
  if (!hasPosts && !hasReactions) return null;

  return (
    <div className="animate-rise inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-ink bg-paper-raised px-4 py-3 shadow-[4px_4px_0_0_var(--hard-soft)] transition-shadow hover:shadow-[6px_6px_0_0_var(--hard-strong)]">
      {hasPosts ? (
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg border-2 border-ink bg-tomato">
            <Sparkles className="size-3.5 text-paper" aria-hidden />
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-soft">
            Sudah{" "}
            <strong className="text-xl font-bold tabular-nums text-ink">{posts}</strong>{" "}
            menfess tayang
          </span>
        </span>
      ) : null}
      {typeof likes === "number" ? (
        <>
          <span aria-hidden className="hidden h-4 w-0.5 bg-ink/15 sm:block" />
          <span className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-soft">
            <Heart className="size-3.5 fill-tomato text-tomato" aria-hidden />
            <strong className="text-base font-bold tabular-nums text-tomato-deep">
              {likes}
            </strong>{" "}
            suka di post terbaru
          </span>
        </>
      ) : null}
      {hasReactions ? (
        <>
          <span aria-hidden className="hidden h-4 w-0.5 bg-ink/15 sm:block" />
          <span
            className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-soft"
            title="Total reaksi yang diberikan pembaca di situs ini — satu per perangkat per kartu"
          >
            <SmilePlus className="size-3.5 text-signal-deep" aria-hidden />
            <strong className="text-base font-bold tabular-nums text-ink">
              {readerReactions as number}
            </strong>{" "}
            reaksi pembaca
          </span>
        </>
      ) : null}
      <span aria-hidden className="hidden h-4 w-0.5 bg-ink/15 sm:block" />
      <OnlinePresence variant="stat" />
      <Link
        href="/arsip"
        className="group inline-flex items-center gap-1 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-tomato-deep underline decoration-tomato/50 decoration-2 underline-offset-4 transition-colors hover:decoration-tomato"
      >
        Lihat arsip
        <ArrowRight
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}
