"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  SendHorizonal,
  RotateCcw,
  ExternalLink,
  PartyPopper,
  Eye,
  History,
  Trash2,
  Share2,
  Link2,
  Check,
} from "lucide-react";
import { MAX_CHARS, MIN_CHARS, IG_PROFILE_URL, DEFAULT_CATEGORY } from "@/constants";
import { Button } from "@/components/ui/Button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Alert } from "@/components/ui/Alert";
import { CharCounter } from "@/components/menfess/CharCounter";
import { TurnstileWidget } from "@/components/menfess/TurnstileWidget";
import { PostPreview } from "@/components/menfess/PostPreview";
import { CategoryPicker } from "@/components/menfess/CategoryPicker";
import { saveSubmission } from "@/lib/submission-history";
import type { SubmitResponse } from "@/types/menfess";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface SuccessInfo {
  permalink?: string;
  dryRun?: boolean;
}

/** Bentuk draf yang disimpan di localStorage (v2 — dengan kategori). */
interface DraftPayload {
  content: string;
  category: string;
}

/** Key localStorage untuk draf menfess — tersimpan di perangkat, bukan server. */
const DRAFT_KEY = "fess-unair:menfess-draft:v2";
/** Draf versi lama (teks polos) — dibaca sekali untuk migrasi, lalu ditinggal. */
const DRAFT_KEY_V1 = "fess-unair:menfess-draft:v1";

/**
 * Form kirim menfess: textarea + captcha Turnstile + pratinjau kartu live.
 * Semua feedback (sukses/error/rate-limit) ditampilkan spesifik dan
 * manusiawi — bukan "Something went wrong".
 *
 * Ekstra: draf tersimpan otomatis di localStorage (pulih saat kembali),
 * shortcut Ctrl/⌘+Enter, serta bagikan/salin tautan setelah terkirim.
 */
export function MenfessForm() {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [restorableDraft, setRestorableDraft] = useState<DraftPayload | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");
  const honeypotRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  /** Guard: jangan simpan draf sebelum draft lama selesai dibaca. */
  const draftLoadedRef = useRef(false);

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

  // Baca draf lama sekali saat mount — jangan auto-isi; tawarkan lewat banner.
  // (dibaca via timeout agar setState tidak sinkron di dalam effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // v2: JSON { content, category }.
        const savedV2 = window.localStorage.getItem(DRAFT_KEY);
        if (savedV2) {
          const parsed = JSON.parse(savedV2) as Partial<DraftPayload>;
          if (parsed.content && parsed.content.trim().length >= MIN_CHARS) {
            setRestorableDraft({
              content: parsed.content,
              category: typeof parsed.category === "string" ? parsed.category : DEFAULT_CATEGORY,
            });
          }
        } else {
          // v1: teks polos — draf lama sebelum ada kategori.
          const savedV1 = window.localStorage.getItem(DRAFT_KEY_V1);
          if (savedV1 && savedV1.trim().length >= MIN_CHARS) {
            setRestorableDraft({ content: savedV1, category: DEFAULT_CATEGORY });
          }
        }
      } catch {
        /* localStorage bisa saja diblokir — draf adalah bonus, bukan syarat */
      }
      draftLoadedRef.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Simpan draf otomatis (debounce 400ms) saat user mengetik / ganti kategori.
  useEffect(() => {
    if (!draftLoadedRef.current) return;
    const timer = setTimeout(() => {
      try {
        if (content.trim().length > 0) {
          const payload: DraftPayload = { content, category };
          window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } else {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        /* abaikan — penyimpanan penuh/diblokir tidak boleh mengganggu menulis */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [content, category]);

  const restoreDraft = () => {
    if (restorableDraft) {
      setContent(restorableDraft.content.slice(0, MAX_CHARS));
      setCategory(restorableDraft.category);
    }
    setRestorableDraft(null);
  };

  const discardDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(DRAFT_KEY_V1);
    } catch {
      /* abaikan */
    }
    setRestorableDraft(null);
  };

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
            category,
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
          // Sukses → draf tidak diperlukan lagi.
          try {
            window.localStorage.removeItem(DRAFT_KEY);
            window.localStorage.removeItem(DRAFT_KEY_V1);
          } catch {
            /* abaikan */
          }
          // Catat ke riwayat lokal "Kiriman kamu" (hanya di perangkat ini).
          saveSubmission({
            text: content,
            category,
            permalink: data.permalink,
            dryRun: Boolean(data.dryRun),
          });
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
    [canSubmit, content, category, captchaToken]
  );

  // Shortcut Ctrl/⌘ + Enter untuk kirim dari textarea.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit && countdown === 0) {
        formRef.current?.requestSubmit();
      }
    }
  };

  const resetForm = () => {
    setContent("");
    setCategory(DEFAULT_CATEGORY);
    setStatus("idle");
    setErrorMessage(null);
    setSuccess(null);
    setShareState("idle");
  };

  const handleCopyLink = async () => {
    const url = success?.permalink ?? IG_PROFILE_URL;
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      // Clipboard API bisa diblokir browser/izin — beri tahu, jangan diam.
      toast.error("Gagal menyalin tautan", {
        description: "Browser memblokir akses clipboard. Salin manual alamatnya dari address bar, ya.",
      });
    }
  };

  const handleShare = async () => {
    const url = success?.permalink ?? IG_PROFILE_URL;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Fess UNAIR",
          text: "Menfessku udah tayang di @fess_unair ✳️",
          url,
        });
        setShareState("shared");
      } catch {
        /* user batal share — bukan error */
      }
    } else {
      // Fallback: salin tautan + beri tahu user lewat toast kenapa bentuknya beda.
      await handleCopyLink();
      toast.info("Browser kamu nggak dukung dialog share", {
        description: "Tautannya udah disalin ke clipboard — tinggal tempel di chat atau story.",
      });
    }
  };

  // ---- Panel sukses menggantikan seluruh form ----
  if (status === "success" && success) {
    return (
      <div className="animate-pop rounded-2xl border-2 border-ink bg-paper-raised p-6 sm:p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-16 place-items-center rounded-2xl border-2 border-ink bg-signal">
            <PartyPopper className="size-8 text-ink-fixed" aria-hidden />
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

          {/* Aksi lanjutan: bagikan / salin tautan */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-signal-soft"
            >
              {shareState === "shared" ? (
                <>
                  <Check className="size-4 text-tomato-deep" aria-hidden />
                  Tautan terbagikan
                </>
              ) : (
                <>
                  <Share2 className="size-4" aria-hidden />
                  Bagikan kabar ini
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-signal-soft"
            >
              {shareState === "copied" ? (
                <>
                  <Check className="size-4 text-tomato-deep" aria-hidden />
                  Tautan tersalin
                </>
              ) : (
                <>
                  <Link2 className="size-4" aria-hidden />
                  Salin tautan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Form utama: dua kolom di desktop, menumpuk di mobile ----
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
        noValidate
      >
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

        {/* Banner pulihkan draf — hanya saat form masih kosong */}
        {restorableDraft && status === "idle" && trimmedLength === 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-signal-deep bg-signal-soft/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <History className="mt-0.5 size-4 shrink-0 text-signal-deep" aria-hidden />
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Ada draf yang belum terkirim dari kunjungan sebelumnya.
                Tersimpan di perangkat kamu — nggak pernah dikirim ke server.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="rounded-lg border-2 border-ink bg-paper-raised px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wide transition-colors hover:bg-signal"
              >
                Pulihkan
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wide text-ink-faint transition-colors hover:text-tomato-deep"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Hapus
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border-2 border-ink bg-paper-raised shadow-[6px_6px_0_0_var(--hard-soft)]">
          <label htmlFor="menfess-content" className="sr-only">
            Isi menfess kamu
          </label>
          <textarea
            id="menfess-content"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder="Tulis di sini. Curhat, kabar, pengakuan, atau sekadar bilang semangat — namamu nggak akan ikut ke mana-mana."
            rows={9}
            disabled={submitting}
            className="min-h-[220px] w-full resize-y rounded-t-2xl border-0 bg-transparent px-5 py-4 text-[17px] leading-relaxed outline-none placeholder:text-ink-faint/80 focus-visible:ring-0 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-ink/15 px-4 py-3">
            <p className="font-mono text-[12px] uppercase tracking-wider text-ink-faint">
              Tanpa nama · Tanpa login · Draf auto-tersimpan
            </p>
            <CharCounter value={content} />
          </div>
        </div>

        <CategoryPicker
          value={category}
          onChange={setCategory}
          disabled={submitting}
        />

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
            sebelum tekan, ya.{" "}
            <span className="whitespace-nowrap">
              Bisa juga tekan <kbd className="kbd-chip">Ctrl</kbd>{" "}
              <span aria-hidden>+</span>{" "}
              <kbd className="kbd-chip">Enter</kbd>
            </span>
            .
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
            category={category}
            className="animate-pop rounded-2xl border-2 border-ink shadow-[6px_6px_0_0_var(--hard-soft)]"
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

        {/* Tips nulis — mengisi ruang kosong di kolom pratinjau & bermanfaat beneran */}
        <aside
          aria-label="Tips menulis menfess"
          className="mt-3 rounded-2xl border-2 border-dashed border-ink/30 bg-signal-soft/40 p-5"
        >
          <p className="flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink-soft">
            <span aria-hidden className="text-tomato-deep">*</span>
            Biar kartunya enak dibaca
          </p>
          <ol className="mt-3 flex flex-col gap-3">
            {[
              {
                t: "Tulis kayak ngobrol",
                d: "Teks yang mengalir selalu lebih relate daripada yang dibikin-bikin formal.",
              },
              {
                t: "Satu cerita per menfess",
                d: "Kartunya fokus, pembacanya nggak kehilangan alur di tengah jalan.",
              },
              {
                t: "Jangan sebut nama orang",
                d: "Anonim ini untuk semua pihak — termasuk orang yang kamu ceritakan.",
              },
            ].map((tip, i) => (
              <li key={tip.t} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-paper-raised font-mono text-[11px] font-bold"
                >
                  {i + 1}
                </span>
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  <span className="font-bold text-ink">{tip.t}.</span> {tip.d}
                </p>
              </li>
            ))}
          </ol>
        </aside>
      </aside>
    </div>
  );
}
