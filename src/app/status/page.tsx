import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Instagram, SendHorizonal, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cookies } from "next/headers";
import { STATUS_COOKIE_NAME, verifyStatusAuthToken } from "@/lib/status-auth";
import { StatusPinGate } from "@/components/status/StatusPinGate";
import { StatusLockBtn } from "@/components/status/StatusLockBtn";
import { IG_HANDLE, IG_PROFILE_URL, IG_QUOTA_BUFFER } from "@/constants";
import { checkLimit, listRecentMedia, InstagramError } from "@/lib/instagram";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

/**
 * /status — buku catatan kondisi layanan dan kuota API.
 * Di-render ulang di server setiap kali dibuka (force-dynamic):
 * kuota Instagram, koneksi Graph API, feed terbaru, dan kesehatan database
 * diperiksa langsung secara real-time. Angka nyata tanpa data karangan.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status Layanan · Fess UNAIR",
  description:
    "Kondisi mesin, kuota posting otomatis Instagram Graph API, dan kesehatan service Fess UNAIR secara real-time.",
};

async function loadLedgerData() {
  const [quotaRes, mediaRes, dbRes] = await Promise.allSettled([
    checkLimit(),
    listRecentMedia(6),
    db.fessReaction.count(),
  ]);

  const quota = quotaRes.status === "fulfilled" ? quotaRes.value : null;
  const recentCount = mediaRes.status === "fulfilled" ? mediaRes.value.length : null;
  const dbReactionsCount = dbRes.status === "fulfilled" ? dbRes.value : null;

  if (quotaRes.status === "rejected") {
    console.warn(
      "[status] Cek kuota IG gagal:",
      quotaRes.reason instanceof InstagramError ? quotaRes.reason.message : quotaRes.reason
    );
  }

  if (mediaRes.status === "rejected") {
    console.warn(
      "[status] Baca feed IG gagal:",
      mediaRes.reason instanceof InstagramError ? mediaRes.reason.message : mediaRes.reason
    );
  }

  const dbError =
    dbRes.status === "rejected"
      ? String(dbRes.reason?.message || dbRes.reason)
      : null;

  if (dbError) {
    console.error("[status] Cek database gagal:", dbError);
  }

  return { quota, recentCount, dbReactionsCount, dbError };
}

function turnstileIsProduction(): boolean {
  try {
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (typeof key !== "string" || key.trim().length === 0) return false;
    return !key.startsWith("placeholder") && !key.startsWith("1x00000000000000000000AA");
  } catch {
    return false;
  }
}

function formatCheckedAt(at: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(at);
}

function ChipOk({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-signal px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-fixed shadow-[2px_2px_0_0_var(--hard-soft)]">
      <CheckCircle2 className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

function ChipWarning({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-tomato px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-paper shadow-[2px_2px_0_0_var(--hard-soft)]">
      <AlertTriangle className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

function ChipUnknown({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-dashed border-ink/40 bg-paper-raised px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-soft">
      <HelpCircle className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

function LedgerRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-t-2 border-dashed border-ink/15 px-5 py-4.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-10 sm:gap-y-1 sm:px-6">
      <dt className="font-mono text-[12px] font-bold uppercase tracking-widest text-ink">
        {label}
      </dt>
      <dd className="text-[13px] leading-relaxed text-ink-soft sm:col-start-1 sm:row-start-2">
        {desc}
      </dd>
      <dd className="flex flex-col items-start gap-1.5 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:items-end sm:self-center">
        {children}
      </dd>
    </div>
  );
}

export default async function StatusPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STATUS_COOKIE_NAME)?.value;
  if (!verifyStatusAuthToken(token)) {
    return <StatusPinGate />;
  }

  const { quota, recentCount, dbReactionsCount, dbError } = await loadLedgerData();
  const turnstileProd = turnstileIsProduction();
  const checkedAt = formatCheckedAt(new Date());

  const usedPct =
    quota === null
      ? 0
      : Math.min(100, Math.round((quota.used / Math.max(quota.total, 1)) * 100));

  const isQuotaAvailable = quota !== null && quota.remaining > IG_QUOTA_BUFFER;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Header Halaman */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border-2 border-ink bg-signal px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-ink-fixed shadow-[3px_3px_0_0_var(--hard-soft)]">
            <span>STATUS SISTEM</span>
            <span>·</span>
            <span>DIAGNOSTIK REAL-TIME</span>
          </div>
          <StatusLockBtn />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Kondisi mesin saat ini.
        </h1>

        <p className="text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">
          Halaman ini mengecek kondisi layanan setiap kali dibuka: kuota posting
          Instagram, koneksi Meta Graph API, pembacaan feed, dan basis data reaksi.
          Seluruh data diperiksa langsung dari server, bukan simulasi browser.
        </p>
      </div>

      {/* Buku Catatan Kondisi (Ledger Box) */}
      <div className="mt-8 rounded-2xl border-2 border-ink bg-paper-raised shadow-[8px_8px_0_0_var(--hard-soft)]">
        {/* Header Baris Buku Status */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b-2 border-ink bg-signal-soft/40 px-5 py-3 sm:px-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
            Fess UNAIR · Lembar Pemeriksaan
          </span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest tabular-nums text-ink-soft">
            Diperiksa: {checkedAt} WIB
          </span>
        </div>

        {/* Daftar Parameter Ledger */}
        <dl className="divide-y-0">
          <LedgerRow
            label="Kuota Posting Harian Instagram"
            desc={`Batas ${quota?.total ?? 100} post/24 jam (jendela rolling) dari Meta Graph API untuk seluruh pengirim`}
          >
            {quota === null ? (
              <ChipUnknown>Tidak bisa dicek</ChipUnknown>
            ) : (
              <>
                <p className="font-mono text-sm font-bold tabular-nums text-ink">
                  {quota.used}{" "}
                  <span className="font-normal text-ink-soft">
                    / {quota.total} terpakai
                  </span>
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={quota.used}
                  aria-valuemin={0}
                  aria-valuemax={quota.total}
                  aria-label={`Penggunaan kuota Instagram: ${quota.used} dari ${quota.total} slot`}
                  className="h-3 w-44 rounded-full border-2 border-ink bg-paper sm:w-52"
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      quota.remaining <= IG_QUOTA_BUFFER ? "bg-tomato" : "bg-signal"
                    )}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  {usedPct}% terpakai ·{" "}
                  {isQuotaAvailable
                    ? `Sisa ${quota.remaining} slot`
                    : `Sisa ${quota.remaining} — kuota habis`}
                </p>
              </>
            )}
          </LedgerRow>

          <LedgerRow
            label="Koneksi Meta Graph API"
            desc="Autentikasi Access Token & endpoint publish container"
          >
            {quota === null ? (
              <ChipWarning>Koneksi Terganggu</ChipWarning>
            ) : (
              <ChipOk>Terhubung Aktif</ChipOk>
            )}
          </LedgerRow>

          <LedgerRow
            label="Feed Pembacaan Arsip"
            desc="Kemampuan server membaca media publik terbaru dari Instagram"
          >
            {recentCount === null ? (
              <ChipUnknown>Tidak bisa dicek</ChipUnknown>
            ) : (
              <ChipOk>Terbaca · {recentCount} post</ChipOk>
            )}
          </LedgerRow>

          <LedgerRow
            label="Basis Data Reaksi (PostgreSQL / Neon)"
            desc="Penyimpanan reaksi emoji pembaca anonim (FessReaction)"
          >
            {dbReactionsCount === null ? (
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <ChipWarning>Gagal Akses DB</ChipWarning>
                {dbError && (
                  <span className="max-w-xs text-left font-mono text-[10px] text-tomato sm:text-right">
                    {dbError}
                  </span>
                )}
              </div>
            ) : (
              <ChipOk>Tersambung · {dbReactionsCount} interaksi</ChipOk>
            )}
          </LedgerRow>

          <LedgerRow
            label="Verifikasi Anti-Bot (Cloudflare Turnstile)"
            desc="Sistem proteksi dari serangan bot & spammer otomatis"
          >
            {turnstileProd ? (
              <ChipOk>Mode Produksi Aktif</ChipOk>
            ) : (
              <ChipUnknown>Mode Pengembangan (Dev)</ChipUnknown>
            )}
          </LedgerRow>
        </dl>
      </div>

      {/* Catatan Kaki Kebijakan Fail-Open */}
      <div className="mt-5 rounded-xl border-2 border-dashed border-ink/20 bg-paper-raised/60 p-4 text-[13px] leading-relaxed text-ink-soft">
        <strong className="font-semibold text-ink">Catatan Kesiapan:</strong> Status
        “tidak bisa dicek” bukan berarti pengiriman mati. Pipeline sistem bekerja dengan
        prinsip <em>fail-open</em> pada pengecekan kuota: jika endpoint kuota Meta
        sedang lambat, pengiriman tetap dicoba diproses agar pengirim tidak terhalang.
        Jika terjadi kendala teknis (seperti error 9004), mekanisme retry otomatis di server
        akan mengunggah ulang buffer gambar tanpa perlu tindakan manual dari Anda.
      </div>

      {/* Tombol Aksi & Navigasi Cepat */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-ink/15 pt-6">
        <Link
          href="/kirim"
          className={cn(buttonVariants({ variant: "ink", size: "lg" }), "gap-2")}
        >
          <SendHorizonal className="size-4" aria-hidden />
          Kirim Menfess Sekarang
        </Link>

        <a
          href={IG_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-mono text-[13px] font-bold uppercase tracking-wider text-ink underline decoration-signal decoration-[3px] underline-offset-4 transition-colors hover:text-tomato-deep"
        >
          <Instagram className="size-4" aria-hidden />
          {IG_HANDLE}
        </a>
      </div>
    </main>
  );
}
