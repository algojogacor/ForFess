"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface StatsResponse {
  ok: true;
  posts: number | null;
  checkedAt?: number;
}

/**
 * Strip statistik live di landing: jumlah menfess yang sudah tayang,
 * angka NYATA dari field media_count akun IG (bukan angka karangan).
 * Fail-open: kalau angka nggak bisa dicek, strip-nya tidak dirender —
 * lebih jujur daripada memamerkan palang palsu.
 */
export function LiveStats() {
  const [posts, setPosts] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { cache: "no-store" })
      .then((res) => res.json() as Promise<StatsResponse>)
      .then((data) => {
        if (!cancelled) setPosts(typeof data.posts === "number" ? data.posts : null);
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

  if (!done || posts === null) return null;

  return (
    <div className="animate-rise inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-ink bg-paper-raised px-4 py-3 shadow-[4px_4px_0_0_var(--hard-soft)]">
      <span className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg border-2 border-ink bg-tomato">
          <Sparkles className="size-3.5 text-paper" aria-hidden />
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-soft">
          Sudah{" "}
          <strong className="text-xl font-bold tabular-nums text-ink">{posts}</strong>{" "}
          {posts === 1 ? "menfess" : "menfess"} tayang
        </span>
      </span>
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
