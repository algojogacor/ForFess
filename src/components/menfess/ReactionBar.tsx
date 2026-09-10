"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { REACTIONS, type ReactionKind } from "@/constants";
import { cn } from "@/lib/utils";

/**
 * Reaksi pembaca — baris tombol emoji di halaman kartu /fess/[id].
 *
 * Prinsip:
 * - Hitungan datang dari database (nyata), bukan angka karangan.
 * - SATU reaksi per perangkat per kartu — dikunci lewat tiket anonim
 *   (ID baris) di localStorage. Ganti reaksi boleh, hapus ke belakang
 *   tidak — supaya hitungannya tetap jujur.
 * - Optimistic UI: angka jalan dulu, kalau server gagal di-rollback
 *   + toast yang menjelaskan apa yang salah (tidak ada feedback diam).
 */

/** Bentuk pilihan reaksi yang disimpan di localStorage per kartu. */
interface MyReaction {
  kind: ReactionKind;
  rowId: string;
}

interface ReactionCountsShape {
  total: number;
  [kind: string]: number | undefined;
}

const storageKey = (fessId: string) => `fess:reaksi:${fessId}`;

function readMyReaction(fessId: string): MyReaction | null {
  try {
    const raw = window.localStorage.getItem(storageKey(fessId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { kind?: string; rowId?: string };
    const match = REACTIONS.find((r) => r.kind === parsed.kind);
    if (!match || typeof parsed.rowId !== "string") return null;
    return { kind: match.kind, rowId: parsed.rowId };
  } catch {
    return null;
  }
}

function writeMyReaction(fessId: string, value: MyReaction | null): void {
  try {
    if (value) window.localStorage.setItem(storageKey(fessId), JSON.stringify(value));
    else window.localStorage.removeItem(storageKey(fessId));
  } catch {
    /* localStorage penuh/diblokir — reaksi tetap terkirim, cuma tidak diingat */
  }
}

export function ReactionBar({ fessId }: { fessId: string }) {
  /** null = masih memuat; angka = hitungan dari server. */
  const [counts, setCounts] = useState<ReactionCountsShape | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  const [my, setMy] = useState<MyReaction | null>(null);
  const [pendingKind, setPendingKind] = useState<ReactionKind | null>(null);
  /** Snapshot hitungan sebelum optimistic — buat rollback kalau gagal. */
  const snapshotRef = useRef<ReactionCountsShape | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Muat hitungan + pilihan lama dari perangkat ini.
  useEffect(() => {
    const readLocal = setTimeout(() => setMy(readMyReaction(fessId)), 0);
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        const res = await fetch(`/api/reaksi?ids=${encodeURIComponent(fessId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          counts?: Record<string, { total: number } & Partial<Record<string, number>>>;
        };
        const entry = data.counts?.[fessId];
        timer = setTimeout(() => {
          if (!mountedRef.current) return;
          setCounts(entry ? { ...entry } : { total: 0 });
        }, 0);
      } catch {
        timer = setTimeout(() => {
          if (!mountedRef.current) return;
          setCountsFailed(true);
          setCounts({ total: 0 });
        }, 0);
      }
    })();
    return () => {
      clearTimeout(readLocal);
      clearTimeout(timer);
    };
  }, [fessId]);

  const handleClick = useCallback(
    (kind: ReactionKind) => {
      // Sudah memilih yang ini → cukup umpan balik visual (button pop), tidak POST lagi.
      if (my?.kind === kind || pendingKind) return;

      const def = REACTIONS.find((r) => r.kind === kind);
      if (!def) return;

      // Optimistic update dengan snapshot buat rollback.
      const base = counts ?? { total: 0 };
      snapshotRef.current = base;
      const optimistic: ReactionCountsShape = { ...base, total: base.total + 1 };
      optimistic[kind] = (optimistic[kind] ?? 0) + 1;
      if (my && my.kind !== kind) {
        optimistic[my.kind] = Math.max((optimistic[my.kind] ?? 1) - 1, 0);
      }
      setCounts(optimistic);
      setPendingKind(kind);

      (async () => {
        try {
          const res = await fetch("/api/reaksi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mediaId: fessId,
              kind,
              replaceRowId: my?.rowId,
            }),
          });
          const data = (await res.json().catch(() => null)) as
            | { ok: boolean; counts?: ReactionCountsShape; rowId?: string; error?: string; detail?: string; retryAfter?: number }
            | null;

          if (!res.ok || !data?.ok || !data.counts || !data.rowId) {
            // Rollback — tampilkan keadaan server terakhir yang valid.
            if (mountedRef.current) {
              setCounts(snapshotRef.current ?? { total: 0 });
              setPendingKind(null);
            }
            if (res.status === 429) {
              toast.error("Kamu terlalu cepat", {
                description: `Tunggu ${data?.retryAfter ?? 2} detik, lalu tekan lagi reaksinya.`,
              });
            } else if (res.status === 503) {
              toast.error(data?.error ?? "Reaksi gagal disimpan", {
                description: data?.detail ?? "Database reaksi sedang tidak bisa dijangkau. Coba beberapa saat lagi.",
              });
            } else {
              toast.error(data?.error ?? "Reaksi gagal disimpan", {
                description: data?.detail ?? `Server menjawab ${res.status}. Coba lagi sebentar, ya.`,
              });
            }
            return;
          }

          if (mountedRef.current) {
            setCounts({ ...data.counts });
            setPendingKind(null);
          }
          const next: MyReaction = { kind, rowId: data.rowId };
          setMy(next);
          writeMyReaction(fessId, next);
        } catch {
          if (mountedRef.current) {
            setCounts(snapshotRef.current ?? { total: 0 });
            setPendingKind(null);
          }
          toast.error("Koneksi bermasalah", {
            description: "Reaksi nggak sampai ke server. Periksa internet lalu tekan lagi, ya.",
          });
        }
      })();
    },
    [counts, my, pendingKind, fessId]
  );

  return (
    <div
      role="group"
      aria-label="Reaksi pembaca untuk kartu ini"
      className="mt-5 border-t-2 border-dashed border-ink/15 pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink-soft">
          <span aria-hidden className="text-signal-deep">*</span>
          Reaksi pembaca
        </p>
        {counts && counts.total > 0 ? (
          <p className="font-mono text-[12px] tabular-nums text-ink-faint">
            <span key={counts.total} className="animate-pop inline-block font-bold text-ink">
              {counts.total}
            </span>{" "}
            reaksi
          </p>
        ) : counts && counts.total === 0 && !countsFailed ? (
          <p className="font-mono text-[12px] text-ink-faint">jadi yang pertama</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const selected = my?.kind === r.kind;
          const n = counts?.[r.kind];
          const pending = pendingKind === r.kind;
          return (
            <button
              key={r.kind}
              type="button"
              onClick={() => handleClick(r.kind)}
              aria-pressed={selected}
              aria-label={`${r.label}${typeof n === "number" ? ` — ${n} reaksi` : ""}`}
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 text-[13px] font-semibold transition-all duration-150",
                "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--hard-soft)] active:translate-y-0 active:shadow-none",
                selected
                  ? "bg-signal text-ink-fixed shadow-[3px_3px_0_0_var(--hard-soft)]"
                  : "bg-paper-raised text-ink",
                pending && "opacity-70"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "text-[15px] leading-none transition-transform duration-200",
                  selected && "group-hover:scale-125 group-active:scale-95"
                )}
              >
                {r.emoji}
              </span>
              {r.label}
              {typeof n === "number" && n > 0 ? (
                <span
                  key={n}
                  className="animate-pop inline-block min-w-[1ch] font-mono text-[12px] font-bold tabular-nums opacity-80"
                >
                  {n}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[12px] leading-relaxed text-ink-faint">
        {countsFailed
          ? "Hitungan reaksi nggak bisa dimuat sekarang — kamu tetap bisa bereaksi, angkanya menyusul."
          : my
            ? "Reaksi kamu tercatat. Salah tekan? Tinggal pilih yang lain — bisa diganti, nggak bisa dicabut."
            : "Satu reaksi per pembaca untuk tiap kartu — tanpa nama, tanpa akun."}
      </p>
    </div>
  );
}
