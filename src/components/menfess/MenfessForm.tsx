"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  SendHorizonal,
  RotateCcw,
  ExternalLink,
  PartyPopper,
  Eye,
} from "lucide-react";
import { MAX_CHARS, MIN_CHARS, IG_PROFILE_URL } from "@/constants";
import { Button } from "@/components/ui/Button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Alert } from "@/components/ui/Alert";
import { CharCounter } from "@/components/menfess/CharCounter";
import { TurnstileWidget } from "@/components/menfess/TurnstileWidget";
import { PostPreview } from "@/components/menfess/PostPreview";
import type { SubmitResponse } from "@/types/menfess";
import { cn } from "@/lib/utils";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface SuccessInfo {
  permalink?: string;
  dryRun?: boolean;
}

/**
 * Form kirim menfess: textarea + captcha Turnstile + pratinjau kartu live.
 * Semua feedback (sukses/error/rate-limit) ditampilkan spesifik dan
 * manusiawi — bukan "Something went wrong".
 */
export function MenfessForm() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const submitting = status === "submitting";
  const trimmedLength = content.trim().length;
  const canSubmit =
    !submitting &&
    captchaToken !== null &&
    trimmedLength >= MIN_CHARS &&
    trimmedLength <= MAX_CHARS;

  // Hitung mundur saat kena rate limit.
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit) return;

      setStatus("submitting");
      setErrorMessage(null);

      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            turnstileToken: captchaToken,
            website: honeypotRef.current?.value ?? "",
          }),
        });

        const data = (await res
          .json()
          .catch(() => null)) as SubmitResponse | null;

        if (!data) {
          setErrorMessage(
            "Server nggak ngasih jawaban yang jelas. Tunggu sebentar lalu kirim lagi ya."
          );
          setStatus("error");
          return;
        }

        if (data.ok) {
          setSuccess({ permalink: data.permalink, dryRun: data.dryRun });
          setStatus("success");
          return;
        }

        setErrorMessage(data.message);
        if (data.code === "RATE_LIMITED" && data.retryAfter) {
          setCountdown(Math.min(data.retryAfter, 600));
        }
        setStatus("error");
      } catch {
        setErrorMessage(
          "Koneksi ke server bermasalah. Cek internet kamu, lalu kirim lagi."
        );
        setStatus("error");
      }
    },
    [canSubmit, content, captchaToken]
  );

  const resetForm = () => {
    setContent("");
    setStatus("idle");
    setErrorMessage(null);
    setSuccess(null);
  };

  // ---- Panel sukses menggantikan seluruh form ----
  if (status === "success" && success) {
    return (
      <div className="animate-pop rounded-2xl border-2 border-ink bg-paper-raised p-6 sm:p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-16 place-items-center rounded-2xl border-2 border-ink bg-signal">
            <PartyPopper className="size-8" aria-hidden />
          </span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Terkirim! Menfess kamu meluncur ke @fess_unair
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-ink-soft">
            Teks kamu sudah dijadikan kartu rapi dan diposting. Cek feed
            Instagram untuk melihatnya tayang.
          </p>
          {success.dryRun ? (
            <Alert
              variant="warning"
              title="Mode dry-run aktif"
              className="w-full text-left"
            >
              <p>
                Server sedang diatur{" "}
                <code className="font-mono">MENFESS_DRY_RUN=true</code>, jadi
                pipeline berhenti sebelum upload &amp; posting. Semua tahap
                lain (validasi, captcha, generate gambar) sudah lolos.
              </p>
            </Alert>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {success.permalink ? (
              <a
                href={success.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ink", size: "lg" }))}
              >
                Lihat post kamu
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : (
              <a
                href={IG_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ink", size: "lg" }))}
              >
                Buka @fess_unair
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
            <Button variant="outline" size="lg" onClick={resetForm}>
              <RotateCcw className="size-4" aria-hidden />
              Tulis lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Form utama: dua kolom di desktop, menumpuk di mobile ----
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {/* Honeypot anti-bot — tersembunyi dari manusia; bot iseng mengisinya */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
        />

        {errorMessage ? (
          <Alert variant="error" title="Menfess gagal terkirim">
            <p>{errorMessage}</p>
            {countdown > 0 ? (
              <p className="mt-1 font-mono text-[13px]">
                Boleh coba lagi dalam{" "}
                <span className="font-bold tabular-nums">{countdown}s</span>.
              </p>
            ) : null}
          </Alert>
        ) : null}

        <div className="rounded-2xl border-2 border-ink bg-paper-raised shadow-[6px_6px_0_0_rgba(22,19,16,0.12)]">
          <label htmlFor="menfess-content" className="sr-only">
            Isi menfess kamu
          </label>
          <textarea
            id="menfess-content"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Tulis di sini. Curhat, kabar, pengakuan, atau sekadar bilang semangat — namamu nggak akan ikut ke mana-mana."
            rows={9}
            disabled={submitting}
            className="min-h-[220px] w-full resize-y rounded-t-2xl border-0 bg-transparent px-5 py-4 text-[17px] leading-relaxed outline-none placeholder:text-ink-faint/80 focus-visible:ring-0 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-ink/15 px-4 py-3">
            <p className="font-mono text-[12px] uppercase tracking-wider text-ink-faint">
              Tanpa nama · Tanpa login
            </p>
            <CharCounter value={content} />
          </div>
        </div>

        <TurnstileWidget onToken={setCaptchaToken} disabled={submitting} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || countdown > 0}
            className="sm:flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Mengirim ke @fess_unair…
              </>
            ) : (
              <>
                <SendHorizonal className="size-4" aria-hidden />
                Kirim menfess
              </>
            )}
          </Button>
          <p className="text-[13px] leading-snug text-ink-faint sm:max-w-[230px]">
            Sekali kirim, langsung tayang tanpa moderasi. Baca ulang dulu
            sebelum tekan, ya.
          </p>
        </div>
      </form>

      {/* ==== Kolom pratinjau (sticky di desktop) ==== */}
      <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
        <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.2em] text-ink-faint">
          <Eye className="size-4" aria-hidden />
          Pratinjau kartu yang akan diposting
        </p>
        {trimmedLength > 0 ? (
          <PostPreview
            text={content}
            className="animate-pop rounded-2xl border-2 border-ink shadow-[6px_6px_0_0_rgba(22,19,16,0.12)]"
          />
        ) : (
          <div
            aria-hidden
            className="grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-ink/25 bg-paper-raised/60 p-8 text-center"
          >
            <p className="text-[15px] leading-relaxed text-ink-faint">
              Kartu pratinjau akan muncul di sini begitu kamu mulai nulis —
              persis kayak yang diposting ke IG.
            </p>
          </div>
        )}
        <p className="text-[13px] leading-relaxed text-ink-faint">
          Ukuran huruf menyesuaikan panjang teks, dari satu kata sampai 500
          karakter tetap kebaca di HP.
        </p>
      </aside>
    </div>
  );
}
