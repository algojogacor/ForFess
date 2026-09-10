"use client";

import { useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import type { CheckLimitResponse } from "@/types/menfess";

/**
 * Status kuota posting IG secara LIVE (data nyata dari /api/check-limit).
 * Kalau kuota mendekati habis, user langsung tahu kenapa kiriman bisa
 * tertahan — transparansi, bukan statistik karangan.
 */
export function QuotaStatus() {
  const [state, setState] = useState<{
    loading: boolean;
    remaining: number | null;
    total: number | null;
    unknown: boolean;
  }>({ loading: true, remaining: null, total: null, unknown: false });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/check-limit")
      .then((res) => res.json() as Promise<CheckLimitResponse>)
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.quota) {
          setState({
            loading: false,
            remaining: data.quota.remaining,
            total: data.quota.total,
            unknown: false,
          });
        } else {
          setState((s) => ({ ...s, loading: false, unknown: true }));
        }
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, unknown: true }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border-2 border-ink bg-paper-raised px-4 py-2 font-mono text-[13px]">
      {state.loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span className="text-ink-faint">Ngecek kurir…</span>
        </>
      ) : state.unknown ? (
        <>
          <span className="size-2 rounded-full bg-ink-faint" aria-hidden />
          <span className="text-ink-faint">Kurir: nggak bisa dicek sekarang</span>
        </>
      ) : state.remaining !== null && state.remaining <= 2 ? (
        <>
          <span className="size-2 animate-pulse rounded-full bg-tomato" aria-hidden />
          <span className="text-tomato-deep">
            Kurir lagi ngos-ngosan — kuota IG sisa {state.remaining}
          </span>
        </>
      ) : (
        <>
          <Activity className="size-4 text-ink" aria-hidden />
          <span>
            Kurir siap antar ·{" "}
            <span className="font-bold">
              kuota hari ini {state.remaining}/{state.total}
            </span>
          </span>
        </>
      )}
    </div>
  );
}
