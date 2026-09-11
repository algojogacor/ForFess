/**
 * Halaman /acak — "kocok kartu".
 * Satu tombol, satu kartu sembarang dari arsip @fess_unair.
 * Bagi yang nggak mau nyari-nyari: tekan kocok, baca, ulangi.
 *
 * Halaman ini sengaja noindex (isinya berubah tiap request); kartu
 * individual tetap terindeks lewat /fess/[id].
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Dices } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { RandomFess } from "./RandomFess";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kartu acak — kocok arsip menfess",
  description:
    "Nggak mau nyari-nyari? Kocok arsip dan baca satu menfess sembarang dari warga UNAIR.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/acak" },
};

export default function AcakPage() {
  return (
    <div className="bg-dotgrid">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Header halaman */}
        <header className="animate-rise text-center">
          <p className="inline-flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.2em] text-tomato">
            <Dices className="size-4" aria-hidden />
            Kartu acak
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Kocok. <span className="marker-highlight">Baca.</span> Kaget.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Satu menfess sembarang dari arsip {""}
            <span className="font-semibold text-ink">@fess_unair</span> — curhatan
            orang yang mungkin lagi nunggu antrean FK, atau baru keluar lab.
            Nggak cocok? Kocok lagi.
          </p>
        </header>

        {/* Deck + tombol kocok (client) */}
        <div className="mt-10">
          <RandomFess />
        </div>

        {/* Link lanjutan */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <Link
            href="/arsip"
            className={cn(buttonVariants({ variant: "outline", size: "md" }))}
          >
            Mau pilih sendiri? Buka arsip
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            Kartu diacak dari 50 postingan terbaru
          </p>
        </div>
      </div>
    </div>
  );
}
