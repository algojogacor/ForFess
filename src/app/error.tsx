"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/**
 * Error boundary global — menampilkan pesan manusiawi + tombol coba lagi.
 * Error asli tetap ter-log ke console oleh Next.js.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] runtime error:", error);
  }, [error]);

  return (
    <div className="bg-dotgrid">
      <div className="mx-auto flex max-w-2xl flex-col items-start px-4 py-24 sm:px-6 lg:py-32">
        <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
          <span className="inline-block size-2.5 bg-tomato" aria-hidden />
          Ada yang error
        </p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Sistemnya sempat tersandung.
        </h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
          Tenang, bukan salah kamu. Coba muat ulang bagian ini — kalau masalah
          berlanjut, tunggu sebentar lalu buka halaman utama lagi.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[12px] text-ink-faint">
            Kode error: {error.digest} — sertakan kalau lapor lewat DM.
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-4 self-stretch sm:self-auto">
          <Alert variant="warning" title="Data kamu aman">
            <p>
              Menfess yang gagal terkirim tidak hilang ke mana-mana — teksnya
              masih ada di form kalau kamu kembali tanpa menutup tab.
            </p>
          </Alert>
          <Button variant="signal" size="md" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden />
            Coba lagi
          </Button>
        </div>
      </div>
    </div>
  );
}
