"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ExternalLink, History, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PostPreview } from "@/components/menfess/PostPreview";
import {
  clearSubmissions,
  listSubmissions,
  SUBMISSION_SAVED_EVENT,
  type SubmissionRecord,
} from "@/lib/submission-history";

/** Panjang cuplikan teks per baris riwayat. */
const EXCERPT_LEN = 140;

function excerptOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= EXCERPT_LEN) return flat;
  return `${flat.slice(0, EXCERPT_LEN).trimEnd()}…`;
}

function exactDate(at: number): string {
  try {
    return format(new Date(at), "d MMM yyyy · HH:mm", { locale: localeId });
  } catch {
    return "";
  }
}

function relativeDate(at: number): string {
  try {
    return formatDistanceToNowStrict(new Date(at), {
      locale: localeId,
      addSuffix: true,
    });
  } catch {
    return "";
  }
}

/**
 * "Kiriman kamu" — daftar menfess yang pernah dikirim SUKSES dari
 * perangkat ini. Semua data hanya di localStorage; panel hilang kalau
 * riwayat kosong. Bantu user mengingat & menemukan kiriman lamanya
 * tanpa server menyimpan siapa pun identitasnya.
 */
export function SubmissionHistory() {
  const [records, setRecords] = useState<SubmissionRecord[] | null>(null);

  // Baca localStorage saat mount, lalu segarkan ulang setiap kali ada
  // kiriman baru tersimpan (event dari MenfessForm) — tanpa reload.
  // (pembacaan pertama via timeout agar aman dari rule
  // react-hooks/set-state-in-effect)
  useEffect(() => {
    const reread = () => setRecords(listSubmissions());
    const timer = setTimeout(reread, 0);
    window.addEventListener(SUBMISSION_SAVED_EVENT, reread);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(SUBMISSION_SAVED_EVENT, reread);
    };
  }, []);

  const handleClear = useCallback(() => {
    clearSubmissions();
    setRecords([]);
    toast.success("Riwayat kiriman dihapus", {
      description: "Data lokal di perangkat ini sudah bersih. Menfess yang sudah tayang di IG tetap ada di akunnya.",
    });
  }, []);

  // Belum terbaca / memang kosong → jangan render apa pun.
  if (!records || records.length === 0) return null;

  return (
    <section
      aria-label="Riwayat kiriman dari perangkat ini"
      className="mt-12 rounded-2xl border-2 border-ink bg-paper-raised shadow-[6px_6px_0_0_var(--hard-soft)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-ink/15 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg border-2 border-ink bg-signal">
            <History className="size-4 text-ink-fixed" aria-hidden />
          </span>
          Kiriman kamu
          <span className="rounded-md border border-ink/20 bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-faint">
            {records.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wide text-ink-faint transition-colors hover:bg-tomato/10 hover:text-tomato-deep"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Hapus riwayat
        </button>
      </header>

      <ul className="divide-y divide-dashed divide-ink/10">
        {records.slice(0, 5).map((record) => (
          <li
            key={record.id}
            className="flex gap-4 px-5 py-4 transition-colors hover:bg-signal-soft/30 sm:px-6"
          >
            {/* Mini kartu — pratinjau persis seperti yang diposting ke IG.
                Dibungkus div berlebar tetap karena PostPreview selalu w-full
                terhadap kontainernya (konflik w-16 vs w-full kalau langsung). */}
            <div className="hidden w-16 shrink-0 sm:block">
              <PostPreview
                text={record.text}
                ariaLabel={`Pratinjau kartu kiriman: ${excerptOf(record.text).slice(0, 60)}`}
                className="rounded-lg border-2 border-ink shadow-[2px_2px_0_0_var(--hard-soft)]"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span
                  className={
                    record.dryRun
                      ? "inline-flex items-center gap-1 rounded-md border border-tomato-deep/40 bg-tomato/10 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-tomato-deep"
                      : "inline-flex items-center gap-1 rounded-md border border-ink/25 bg-signal px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-fixed"
                  }
                >
                  <UserRound className="size-3" aria-hidden />
                  {record.dryRun ? "Uji coba (dry-run)" : "Tayang"}
                </span>
                <time
                  dateTime={new Date(record.at).toISOString()}
                  title={exactDate(record.at)}
                  className="font-mono text-[12px] uppercase tracking-wider text-ink-faint"
                >
                  {relativeDate(record.at)}
                </time>
                {record.permalink ? (
                  <a
                    href={record.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
                  >
                    Buka post
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                ) : null}
              </div>
              <p className="text-[14px] leading-relaxed text-ink-soft">
                {excerptOf(record.text)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <footer className="border-t-2 border-dashed border-ink/15 px-5 py-3 sm:px-6">
        <p className="text-[12px] leading-relaxed text-ink-faint">
          Daftar ini cuma ada di perangkat kamu — server kami nggak menyimpan
          riwayat apa pun, dan nggak tahu menfess mana milikmu.
        </p>
      </footer>
    </section>
  );
}
