import type { Metadata } from "next";
import { MenfessForm } from "@/components/menfess/MenfessForm";

export const metadata: Metadata = {
  title: "Kirim menfess",
  description:
    "Form pengiriman menfess anonim Fess UNAIR — tulis, verifikasi singkat, langsung tayang di @fess_unair.",
};

export default function KirimPage() {
  return (
    <div className="bg-dotgrid">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10 max-w-2xl">
          <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-block size-2.5 bg-signal-deep" aria-hidden />
            Form pengiriman
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Tulis menfess kamu.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Nggak ada kolom nama, nggak ada login. Satu teks maksimal 500
            karakter, satu verifikasi keamanan, selesai.
          </p>
        </header>

        <MenfessForm />
      </div>
    </div>
  );
}
