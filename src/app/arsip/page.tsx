import type { Metadata } from "next";
import { Instagram } from "lucide-react";
import { ArchiveGrid } from "@/components/menfess/ArchiveGrid";
import { ScrollTopButton } from "@/components/menfess/ScrollTopButton";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { IG_HANDLE, IG_PROFILE_URL } from "@/constants";

export const metadata: Metadata = {
  title: "Arsip",
  description:
    "Kumpulan menfess terbaru yang sudah tayang di @fess_unair — diambil langsung dari Instagram.",
};

export default function ArsipPage() {
  return (
    <div className="bg-dotgrid">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
              <span className="inline-block size-2.5 bg-signal-deep" aria-hidden />
              Arsip tayangan
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Yang sudah tayang.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              Kumpulan kartu menfess terbaru, diambil langsung dari feed{" "}
              {IG_HANDLE}. Kalau kamu baru saja kirim, tunggu beberapa detik
              lalu muat ulang.
            </p>
          </div>
          <a
            href={IG_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "md" }))}
          >
            <Instagram className="size-4" aria-hidden />
            Buka {IG_HANDLE}
          </a>
        </header>

        <ArchiveGrid />
      </div>
      <ScrollTopButton />
    </div>
  );
}
