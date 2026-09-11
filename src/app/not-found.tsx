import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/** Halaman 404 bergaya brand — mono kicker, numeral besar, jalan pulang. */
export default function NotFound() {
  return (
    <div className="bg-dotgrid">
      <div className="mx-auto flex max-w-2xl flex-col items-start px-4 py-24 sm:px-6 lg:py-32">
        <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
          <span className="inline-block size-2.5 bg-tomato" aria-hidden />
          Error 404
        </p>
        <p className="text-outline mt-6 text-8xl font-bold leading-none sm:text-9xl">
          404
        </p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Halaman ini nggak ketemu.
        </h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
          Mungkin salah ketik alamat, atau halamannya memang belum ada. Yang
          jelas, menfess kamu tetap aman di halaman pengiriman.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: "signal", size: "md" }))}>
            <ArrowLeft className="size-4" aria-hidden />
            Kembali ke halaman utama
          </Link>
          <Link href="/kirim" className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
            Tulis menfess
          </Link>
        </div>
      </div>
    </div>
  );
}
