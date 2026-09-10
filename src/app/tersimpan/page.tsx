import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { KoleksiGrid } from "./KoleksiGrid";
import { ScrollProgress } from "@/components/menfess/ScrollProgress";
import { ScrollTopButton } from "@/components/menfess/ScrollTopButton";

/**
 * Koleksi "Tersimpan" — bookmark menfess favorit pengunjung.
 * Seluruh datanya hidup di localStorage perangkat (snapshot kartu publik),
 * jadi halaman ini noindex: isinya personal dan berbeda tiap orang.
 */
export const metadata: Metadata = {
  title: "Tersimpan",
  description:
    "Koleksi menfess favorit yang kamu simpan — tersimpan di perangkat ini saja, tanpa akun, tanpa server.",
  robots: { index: false, follow: true },
};

export default function TersimpanPage() {
  return (
    <div className="bg-dotgrid">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10 max-w-2xl">
          <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-block size-2.5 bg-signal-deep" aria-hidden />
            Koleksi kamu
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Yang kamu simpan.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Bookmark pribadi dari arsip menfess — mungkin ada yang buat kamu
            senyum, nauzubillah, atau pengen dibales
            &ldquo;same&rdquo;. Semuanya cuma tersimpan di perangkat ini;
            nggak ada server yang tahu kamu nyimpen apa.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-ink/30 bg-paper-raised/60 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
            <Bookmark className="size-3.5" aria-hidden />
            cara simpan: hover kartu di arsip → tekan bookmark
          </p>
        </header>

        <KoleksiGrid />
      </div>
      <ScrollProgress />
      <ScrollTopButton />
    </div>
  );
}
