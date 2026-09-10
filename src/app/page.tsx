import Link from "next/link";
import { ArrowDown, SendHorizonal } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { PostPreview } from "@/components/menfess/PostPreview";
import { QuotaStatus } from "@/components/menfess/QuotaStatus";
import { cn } from "@/lib/utils";
import { IG_HANDLE, IG_PROFILE_URL } from "@/constants";

const TICKER_ITEMS = [
  "ANONIM 100%",
  "TANPA LOGIN",
  "MAKS 500 KARAKTER",
  `LANGSUNG KE ${IG_HANDLE}`,
  "CIVITAS UNAIR",
  "TANPA ANTRE MODERASI",
];

const STEPS = [
  {
    num: "01",
    title: "Tulis apa pun yang belum terucap",
    body: "Curhat, kabar bahagia, pengakuan, atau sekadar bilang semangat. Nggak perlu akun, nggak perlu nama — cukup isi teksnya.",
  },
  {
    num: "02",
    title: "Buktikan kamu bukan bot",
    body: "Satu verifikasi singkat. Ini buat nutup keran spam biar kiriman serius tetap ngefek.",
  },
  {
    num: "03",
    title: "Langsung tayang di Instagram",
    body: `Teks kamu dijadikan kartu rapi lalu diposting otomatis ke ${IG_HANDLE}. Nggak ada antrian review, nggak ada editor manusia.`,
  },
];

const RULES = [
  {
    title: "Anonim beneran",
    body: "Form kami nggak nanya nama, NIM, atau email. Nggak ada jalur yang bisa membedakan kamu dari pengirim lain.",
  },
  {
    title: "Langsung tayang, tanpa moderasi",
    body: "Sistem ini otomatis dari awal sampai akhir. Karena nggak ada penyaring, tolong timbang sendiri apa yang mau kamu kirim.",
  },
  {
    title: "500 karakter, dipakai bijak",
    body: "Cukup buat cerita yang utuh, nggak cukup buat novel. Pilih bagian yang paling penting buat kamu.",
  },
  {
    title: "Kuota Instagram itu nyata",
    body: "Instagram membatasi posting otomatis per 24 jam. Kalau kuotanya penuh, kamu akan lihat pesannya — bukan error misterius.",
  },
];

/** Contoh teks untuk kartu demo — ditandai jelas sebagai contoh, bukan kiriman asli. */
const SAMPLE_A =
  "Lolos sidang skripsi hari ini. Makasih buat semua doa dan kopi yang nemenin dari awal.";
const SAMPLE_B = "Semangat, adik-adik yang besok UAS. Kalian bakal baik-baik aja.";

export default function LandingPage() {
  return (
    <div>
      {/* ==== Ticker berjalan: info produk dalam satu strip ==== */}
      <div
        aria-hidden
        className="group overflow-hidden border-b-2 border-ink bg-signal py-2.5"
      >
        <div className="flex w-max animate-marquee gap-0 group-hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {TICKER_ITEMS.map((item) => (
                <span
                  key={`${copy}-${item}`}
                  className="flex items-center font-mono text-[13px] font-bold uppercase tracking-[0.15em] text-ink"
                >
                  <span className="px-5">{item}</span>
                  <span className="text-tomato">*</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ==== Hero: asimetris, teks besar + tumpukan kartu contoh ==== */}
      <section className="bg-dotgrid">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-20">
          <div className="lg:col-span-7">
            <p
              className="flex animate-rise items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft"
              style={{ animationDelay: "0ms" }}
            >
              <span className="inline-block size-2.5 bg-signal-deep" aria-hidden />
              Menfess anonim · civitas Universitas Airlangga
            </p>
            <h1
              className="mt-5 animate-rise text-[44px] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "70ms" }}
            >
              Ngomong aja.
              <br />
              Nggak usah{" "}
              <span className="marker-highlight whitespace-nowrap">
                kenal-kenalan.
              </span>
            </h1>
            <p
              className="mt-6 max-w-xl animate-rise text-lg leading-relaxed text-ink-soft"
              style={{ animationDelay: "140ms" }}
            >
              Fess UNAIR nampung curhat, kabar, pengakuan, sampai uneg-uneg
              kamu — tanpa nama, tanpa akun, tanpa antre moderasi. Tulis,
              kirim, langsung tayang di {IG_HANDLE}.
            </p>
            <div
              className="mt-8 flex animate-rise flex-wrap items-center gap-4"
              style={{ animationDelay: "210ms" }}
            >
              <Link href="/kirim" className={cn(buttonVariants({ variant: "signal", size: "lg" }))}>
                <SendHorizonal className="size-4" aria-hidden />
                Tulis menfess kamu
              </Link>
              <a href="#cara-kerja" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Cara kerjanya
                <ArrowDown className="size-4" aria-hidden />
              </a>
            </div>

            {/* Status kuota live — data nyata dari Instagram, bukan angka karangan */}
            <div className="mt-10 animate-rise" style={{ animationDelay: "280ms" }}>
              <QuotaStatus />
            </div>
          </div>

          {/* Tumpukan kartu contoh */}
          <div
            className="relative animate-rise lg:col-span-5 lg:pt-6"
            style={{ animationDelay: "220ms" }}
          >
            <div className="relative mx-auto max-w-sm">
              <span className="absolute -top-3 left-4 z-10 rotate-[-5deg] rounded-md border-2 border-ink bg-tomato px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-paper">
                Contoh kartu
              </span>
              <PostPreview
                text={SAMPLE_A}
                ariaLabel="Contoh kartu menfess tentang kelulusan sidang skripsi"
                className="rotate-2 rounded-2xl border-2 border-ink shadow-[8px_8px_0_0_rgba(22,19,16,0.9)] transition-all duration-300 hover:rotate-0 hover:shadow-[10px_10px_0_0_rgba(22,19,16,0.9)]"
              />
              <PostPreview
                text={SAMPLE_B}
                ariaLabel="Contoh kartu menfess berisi pesan semangat"
                className="absolute inset-x-0 top-10 z-[-1] mx-auto max-w-[92%] -rotate-3 rounded-2xl border-2 border-ink opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==== Cara kerja: tiga langkah dengan ritme offset ==== */}
      <section id="cara-kerja" className="scroll-mt-20 border-t-2 border-ink bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-tomato">
                Cara kerja
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
                Tiga langkah. Nggak ada yang rumit.
              </h2>
            </div>
            <p className="max-w-xs text-[15px] leading-relaxed text-ink-soft">
              Sistemnya sengaja dibuat sesederhana mungkin — biar yang muncul
              di feed ya menfessnya, bukan prosesnya.
            </p>
          </div>

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.num}
                className={cn(
                  "group rounded-2xl border-2 border-ink bg-paper-raised p-6 transition-transform duration-200 hover:-translate-y-1.5",
                  // offset bertingkat biar nggak terlalu rapi
                  i === 1 && "md:mt-8",
                  i === 2 && "md:mt-16"
                )}
              >
                <span className="text-outline block text-6xl font-bold leading-none">
                  {step.num}
                </span>
                <h3 className="mt-5 text-xl font-bold leading-snug">{step.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ==== Aturan: section tinta kontras ==== */}
      <section className="border-y-2 border-ink bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1.6fr] lg:gap-16">
            <div>
              <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-signal">
                Aturan rumah
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Empat hal yang perlu kamu tahu sebelum kirim.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-paper/70">
                Nggak banyak aturan, tapi semuanya serius. Dibuat supaya
                platform ini tetap nyaman buat semua orang.
              </p>
            </div>
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {RULES.map((rule, i) => (
                <li
                  key={rule.title}
                  className="border-t border-paper/25 pt-5 transition-colors duration-200 hover:border-signal"
                >
                  <span className="font-mono text-[13px] font-bold text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-bold leading-snug">{rule.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-paper/70">
                    {rule.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ==== CTA band, dibingkai tape zine ==== */}
      <div aria-hidden className="h-2.5 border-y-2 border-ink bg-tape" />
      <section className="bg-signal">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div>
            <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Sudah ada yang pengen kamu keluarin hari ini?
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/75">
              Form-nya buka 24 jam, gratis, dan nggak nanya siapa kamu.{" "}
              <a
                href={IG_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
              >
                {IG_HANDLE}
              </a>{" "}
              udah nunggu.
            </p>
          </div>
          <Link href="/kirim" className={cn(buttonVariants({ variant: "ink", size: "lg" }), "shrink-0")}>
            <SendHorizonal className="size-4" aria-hidden />
            Buka form pengiriman
          </Link>
        </div>
      </section>
      <div aria-hidden className="h-2.5 border-y-2 border-ink bg-tape" />
    </div>
  );
}
