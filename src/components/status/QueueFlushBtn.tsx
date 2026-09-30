"use client";

import { useState } from "react";
import { Zap, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

interface FlushResult {
  ok: boolean;
  message?: string;
  processed?: number;
  success?: number;
  failed?: number;
}

/**
 * Tombol admin untuk memicu pemrosesan antrean menfess secara manual.
 * Memanggil POST /api/cron/process-queue menggunakan sesi admin
 * yang sudah tersimpan di cookie (terkirim otomatis oleh browser).
 */
export function QueueFlushBtn() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FlushResult | null>(null);

  const handleFlush = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/process-queue", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as FlushResult | null;
      if (!data) {
        toast.error("Server tidak merespons dengan benar.");
        return;
      }
      setResult(data);
      if (data.ok) {
        if ((data.processed ?? 0) === 0) {
          toast.info(data.message ?? "Tidak ada antrean yang diproses.");
        } else {
          toast.success(
            `Antrean diproses: ${data.success ?? 0} sukses, ${data.failed ?? 0} gagal.`
          );
        }
      } else {
        toast.error(data.message ?? "Gagal memproses antrean.");
      }
    } catch {
      toast.error("Koneksi ke server bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={() => void handleFlush()}
        disabled={loading}
        className={cn(
          buttonVariants({ variant: "ink", size: "sm" }),
          "gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        )}
        aria-label="Proses antrean menfess sekarang"
      >
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Memproses...
          </>
        ) : (
          <>
            <Zap className="size-3.5" aria-hidden />
            ⚡ Proses Antrean Sekarang
          </>
        )}
      </button>

      {result && (
        <p
          className={cn(
            "font-mono text-[11px] font-bold uppercase tracking-wider",
            result.ok ? "text-ink-soft" : "text-tomato-deep"
          )}
        >
          {result.ok ? (
            <>
              <CheckCircle2 className="mr-1 inline size-3" aria-hidden />
              {result.message ?? "Selesai"}
            </>
          ) : (
            <>
              <AlertTriangle className="mr-1 inline size-3" aria-hidden />
              {result.message ?? "Gagal"}
            </>
          )}
        </p>
      )}
    </div>
  );
}
