"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Hourglass,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button-variants";
import { ScrollProgress } from "@/components/menfess/ScrollProgress";
import { ScrollTopButton } from "@/components/menfess/ScrollTopButton";
import { findCategory, IG_HANDLE, IG_PROFILE_URL } from "@/constants";
import { cn } from "@/lib/utils";

interface QueueItem {
  ticketCode: string;
  category: string;
  theme: string;
  createdAt: string;
  position: number;
}

interface QueueStatusResponse {
  ok: boolean;
  pendingCount: number;
  totalProcessed: number;
  items: QueueItem[];
  estimatedNextRun: string | null;
  error?: string;
}

function formatDate(timestamp: string | undefined): string {
  if (!timestamp) return "";
  try {
    return format(new Date(timestamp), "d MMM yyyy · HH:mm", { locale: localeId });
  } catch {
    return "";
  }
}

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

function formatNextRun(isoString: string | null | undefined): string {
  if (!isoString) return "Pergantian jam berikutnya";
  try {
    const d = new Date(isoString);
    return `~${format(d, "HH:00", { locale: localeId })} WIB`;
  } catch {
    return "Pergantian jam berikutnya";
  }
}

function minutesRemaining(isoString: string | null | undefined): string {
  if (!isoString) return "Setiap pergantian jam";
  try {
    const diffMs = new Date(isoString).getTime() - Date.now();
    const diffMins = Math.max(1, Math.round(diffMs / (60 * 1000)));
    return `± ${diffMins} menit lagi`;
  } catch {
    return "Setiap pergantian jam";
  }
}

export default function AntreanPage() {
  const [data, setData] = useState<QueueStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/queue/status", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Gagal mengambil status antrean");
      }
      const json = (await res.json()) as QueueStatusResponse;
      setData(json);
      if (isManual) {
        toast.success("Status antrean berhasil diperbarui");
      }
    } catch {
      if (isManual) {
        toast.error("Gagal menyegarkan antrean. Coba beberapa saat lagi.");
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Auto-refresh setiap 30 detik agar papan selalu terbarui
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  const items = data?.items ?? [];
  const pendingCount = data?.pendingCount ?? 0;
  const totalProcessed = data?.totalProcessed ?? 0;
  const estimatedNextRun = data?.estimatedNextRun;

  return (
    <div className="bg-dotgrid min-h-[calc(100vh-4rem)]">
      <title>Papan Antrean · Fess UNERR</title>
      <meta
        name="description"
        content="Papan antrean publik menfess Fess UNERR — pantau urutan giliran tayang menfess ke Instagram saat kuota harian penuh."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        {/* Header Halaman */}
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
              <span className="inline-block size-2.5 bg-signal-deep" aria-hidden />
              Papan antrean publik
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Menunggu giliran tayang.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              Saat kuota posting harian Instagram penuh atau sistem menerapkan jeda aman,
              menfess yang kamu kirim akan ditampung di sini. Sistem akan memproses dan
              menayangkannya secara bertahap setiap awal jam.
            </p>
          </div>

          {/* Tombol Aksi */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className={cn(buttonVariants({ variant: "outline", size: "md" }), "cursor-pointer")}
              aria-label="Segarkan status antrean"
            >
              <RefreshCw
                className={cn("size-4", refreshing && "animate-spin")}
                aria-hidden
              />
              <span>{refreshing ? "Memuat..." : "Segarkan"}</span>
            </button>
            <Link
              href="/kirim"
              className={cn(buttonVariants({ variant: "signal", size: "md" }))}
            >
              Kirim menfess
            </Link>
          </div>
        </header>

        {/* Kartu Ringkasan Status (3 Kartu) */}
        <section aria-label="Ringkasan Status Antrean" className="mb-10">
          <div className="grid gap-5 sm:grid-cols-3">
            {/* Kartu 1: Jumlah Antrean Aktif */}
            <div className="rounded-2xl border-2 border-ink bg-paper-raised p-5 shadow-[4px_4px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[4px_4px_0_0_#000]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Antrean Aktif
                </span>
                <span className="grid size-8 place-items-center rounded-lg border border-ink/20 bg-signal/30 text-ink">
                  <Layers className="size-4" aria-hidden />
                </span>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-9 w-20 animate-pulse rounded bg-ink/10" />
                ) : (
                  <p className="font-mono text-3xl font-extrabold tabular-nums text-ink">
                    {pendingCount}
                  </p>
                )}
                <p className="mt-1 text-sm text-ink-soft">
                  Menfess menunggu giliran rilis
                </p>
              </div>
              <div className="mt-4 border-t border-dashed border-ink/15 pt-3">
                <p className="font-mono text-[11px] text-ink-faint">
                  Total sukses tayang:{" "}
                  <span className="font-bold text-ink">{totalProcessed}</span> menfess
                </p>
              </div>
            </div>

            {/* Kartu 2: Estimasi Rilis Berikutnya */}
            <div className="rounded-2xl border-2 border-ink bg-paper-raised p-5 shadow-[4px_4px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[4px_4px_0_0_#000]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Rilis Berikutnya
                </span>
                <span className="grid size-8 place-items-center rounded-lg border border-ink/20 bg-signal/30 text-ink">
                  <Timer className="size-4" aria-hidden />
                </span>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-9 w-32 animate-pulse rounded bg-ink/10" />
                ) : (
                  <p className="font-mono text-2xl font-extrabold tabular-nums text-ink sm:text-3xl">
                    {formatNextRun(estimatedNextRun)}
                  </p>
                )}
                <p className="mt-1 text-sm text-ink-soft">
                  Setiap pergantian jam (Vercel Cron)
                </p>
              </div>
              <div className="mt-4 border-t border-dashed border-ink/15 pt-3">
                <p className="font-mono text-[11px] text-ink-faint">
                  Estimasi rilis:{" "}
                  <span className="font-bold text-ink">
                    {minutesRemaining(estimatedNextRun)}
                  </span>
                </p>
              </div>
            </div>

            {/* Kartu 3: Pacing & Kuota Aman */}
            <div className="rounded-2xl border-2 border-ink bg-paper-raised p-5 shadow-[4px_4px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[4px_4px_0_0_#000]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Pacing &amp; Kuota Aman
                </span>
                <span className="grid size-8 place-items-center rounded-lg border border-ink/20 bg-signal/30 text-ink">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
              </div>
              <div className="mt-3">
                <p className="font-mono text-2xl font-extrabold tabular-nums text-ink sm:text-3xl">
                  Maks 3 / Putaran
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  Pelepasan berkala demi stabilitas akun
                </p>
              </div>
              <div className="mt-4 border-t border-dashed border-ink/15 pt-3">
                <p className="font-mono text-[11px] text-ink-faint">
                  Mencegah spam &amp; batas API Instagram
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bagian Daftar Antrean */}
        <section aria-labelledby="queue-list-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="queue-list-heading"
              className="font-mono text-sm font-bold uppercase tracking-widest text-ink-soft"
            >
              Urutan Antrean Publik ({items.length})
            </h2>
            <span className="font-mono text-xs text-ink-faint">
              Otomatis diperbarui
            </span>
          </div>

          {/* Skeleton Loading State */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl border-2 border-ink bg-paper-raised p-5 shadow-[4px_4px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[4px_4px_0_0_#000]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-12 animate-pulse rounded bg-ink/10" />
                      <div className="h-6 w-24 animate-pulse rounded bg-ink/10" />
                      <div className="h-6 w-16 animate-pulse rounded bg-ink/10" />
                    </div>
                    <div className="h-5 w-28 animate-pulse rounded bg-ink/10" />
                  </div>
                  <div className="mt-4 h-16 animate-pulse rounded-xl bg-ink/5" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl border-2 border-ink bg-paper-raised p-8 text-center shadow-[4px_4px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[4px_4px_0_0_#000] sm:p-12">
              <div className="mx-auto flex size-14 items-center justify-center rounded-xl border-2 border-ink bg-signal shadow-[2px_2px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[2px_2px_0_0_#000]">
                <Sparkles className="size-7 text-ink-fixed" aria-hidden />
              </div>
              <h3 className="mt-5 font-serif text-2xl font-bold text-ink sm:text-3xl">
                Antrean sedang kosong!
              </h3>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-soft">
                Semua menfess langsung tayang tanpa menunggu. Kuota posting Instagram
                masih tersedia dan siap menerbitkan pesanmu sekarang juga.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/kirim"
                  className={cn(buttonVariants({ variant: "signal", size: "md" }))}
                >
                  Kirim menfess sekarang
                </Link>
              </div>
            </div>
          )}

          {/* Queue Items List */}
          {!loading && items.length > 0 && (
            <div className="space-y-4">
              {items.map((item) => {
                const categoryDef = findCategory(item.category);
                const categoryLabel = categoryDef
                  ? `${categoryDef.emoji} ${categoryDef.label}`
                  : item.category;

                return (
                  <article
                    key={item.ticketCode}
                    className="relative overflow-hidden rounded-2xl border-2 border-ink bg-paper-raised p-4 shadow-[4px_4px_0_0_#1B1710] transition-transform duration-150 hover:-translate-y-0.5 dark:border-[#70685b] dark:shadow-[4px_4px_0_0_#000] sm:p-5"
                  >
                    {/* Baris Meta Tiket */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Urutan Posisi */}
                        <span className="inline-flex items-center justify-center rounded-lg border-2 border-ink bg-signal px-2.5 py-0.5 font-mono text-xs font-bold text-ink-fixed shadow-[2px_2px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[2px_2px_0_0_#000]">
                          #{item.position}
                        </span>

                        {/* Badge Tiket */}
                        <span className="rounded border border-ink/20 bg-signal/20 px-2 py-0.5 font-mono text-xs font-bold text-ink">
                          NO. {item.ticketCode}
                        </span>

                        {/* Badge Kategori */}
                        <span className="inline-flex items-center gap-1 rounded-full border border-tomato-deep/40 bg-tomato/10 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-tomato-deep">
                          {categoryLabel}
                        </span>

                        {/* Badge Tema */}
                        <span className="inline-flex items-center rounded-full border border-ink/20 bg-paper px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                          Tema: {item.theme}
                        </span>
                      </div>

                      {/* Status & Waktu */}
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink dark:border-[#70685b]">
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-signal" />
                          </span>
                          <span>⏳ Dalam Antrean</span>
                        </span>

                        <span
                          className="font-mono text-xs text-ink-faint"
                          title={formatDate(item.createdAt)}
                        >
                          {relativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Konten yang Disamarkan (Privacy & Mystery) */}
                    <div className="mt-3.5 rounded-xl border border-dashed border-ink/25 bg-paper/60 p-3.5 sm:p-4">
                      <p className="select-none font-mono text-sm tracking-widest text-ink-faint sm:text-base">
                        ••••••••••••••••••••••••••••••••••••••••
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
                        <Lock className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
                        <span>
                          Teks disamarkan demi menjaga privasi &amp; kejutan pembaca
                          saat tayang di Instagram.
                        </span>
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Info Tambahan di Bawah */}
        <aside className="mt-12 rounded-2xl border-2 border-dashed border-ink/30 bg-paper-raised/60 p-6 text-sm leading-relaxed text-ink-soft">
          <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-ink">
            Catatan Privasi &amp; Penjadwalan
          </h4>
          <p className="mt-2">
            Nomor tiket di papan ini sesuai dengan kode tiket yang kamu terima setelah
            berhasil mengirimkan menfess. Simpan kode tiket tersebut untuk memantau pergerakan
            posisi antreanmu hingga dipublikasikan ke{" "}
            <a
              href={IG_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-tomato"
            >
              {IG_HANDLE}
            </a>
            .
          </p>
        </aside>
      </div>

      <ScrollProgress />
      <ScrollTopButton />
    </div>
  );
}
