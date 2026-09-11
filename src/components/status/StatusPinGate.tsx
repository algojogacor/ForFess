"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function StatusPinGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleVerify = async (pinToSubmit: string) => {
    if (pinToSubmit.length !== 4) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/status-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pinToSubmit }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok) {
          router.refresh();
        } else {
          setError(data.message || "PIN salah. Coba periksa kembali.");
          setPin("");
        }
      } catch {
        setError("Koneksi bermasalah. Silakan coba lagi.");
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(pin);
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-2xl border-2 border-ink bg-paper-raised p-6 shadow-[8px_8px_0_0_var(--hard-soft)] sm:p-8">
        {/* Header Ikon */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 grid size-13 place-items-center rounded-xl border-2 border-ink bg-signal shadow-[3px_3px_0_0_var(--hard-soft)]">
            <Lock className="size-6 text-ink-fixed" aria-hidden />
          </div>

          <div className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-signal/30 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
            Akses Terbatas
          </div>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Kunci Diagnostik
          </h1>

          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            Halaman status layanan dan kuota API diproteksi PIN. Masukkan 4 digit
            angka untuk membuka.
          </p>
        </div>

        {/* Form PIN */}
        <form onSubmit={onSubmit} className="mt-8 flex flex-col items-center">
          <div className="flex justify-center">
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={(value) => {
                setPin(value);
                if (error) setError(null);
                if (value.length === 4) {
                  handleVerify(value);
                }
              }}
              disabled={isPending}
              autoFocus
            >
              <InputOTPGroup className="gap-2.5 sm:gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="size-12 rounded-xl border-2 border-ink bg-paper font-mono text-xl font-bold text-ink shadow-[2px_2px_0_0_var(--hard-soft)] transition-all data-[active=true]:scale-105 data-[active=true]:border-signal-deep data-[active=true]:ring-2 data-[active=true]:ring-signal sm:size-14 sm:text-2xl"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Pesan Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border-2 border-tomato bg-tomato/10 px-3 py-2 text-[13px] font-medium text-tomato-deep animate-in fade-in zoom-in-95">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {/* Tombol Buka */}
          <button
            type="submit"
            disabled={pin.length !== 4 || isPending}
            className={cn(
              buttonVariants({ variant: "signal", size: "lg" }),
              "mt-6 w-full gap-2 text-base font-bold shadow-[4px_4px_0_0_var(--hard-strong)] disabled:opacity-50"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Memeriksa PIN...
              </>
            ) : (
              "Buka Halaman Status"
            )}
          </button>
        </form>

        {/* Link Kembali */}
        <div className="mt-6 border-t-2 border-dashed border-ink/15 pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-wider text-ink-soft hover:text-ink hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
