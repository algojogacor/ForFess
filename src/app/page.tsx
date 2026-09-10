import Link from "next/link";
import { ArrowDown, SendHorizonal } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button-variants";
import { Reveal } from "@/components/ui/Reveal";
import { PostPreview } from "@/components/menfess/PostPreview";
import { QuotaStatus } from "@/components/menfess/QuotaStatus";
import { LiveStats } from "@/components/menfess/LiveStats";
import { cn } from "@/lib/utils";
import { IG_HANDLE, IG_PROFILE_URL } from "@/constants";

const TICKER_ITEMS = [
  "ANONIM 100%",
  "TANPA LOGIN",
  "MAKS 500 KARAKTER",
  `LANGSUNG KE ${IG_HANDLE}`,
  "CIVITAS UNAIR",
  "TANPA ANTRE MODERASI",
  "KATEGORI OPSIONAL",
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
const SAMPLE_B =
  "Deg-degan nunggu pengumuman wisuda. Doakan aku bisa pakai toga bulan depan, ya.";

const FAQS = [
  {
    q: "Kategori menfess itu apa? Wajib?",
    a: "Opsional. Sebelum mengirim kamu boleh memilih nuansa cerita — Curhat, Pengakuan, Lucu, Semangat, atau Nanya — dan kartunya dapat stempel kecil, misalnya “CURHAT”. Pembaca di arsip bisa menyaring per kategori. Nggak pilih apa-apa? Tidak masalah, menfessmu tayang tanpa label.",
  },
  {
    q: "Apakah ini beneran anonim?",
    a: `Beneran. Form kami nggak punya kolom nama, dan server nggak mencatat siapa yang mengirim — yang diteruskan ke Instagram cuma teksnya. Satu hal yang perlu kamu jaga sendiri: jangan menulis identitasmu di dalam isi menfess, karena teksnya tayang publik.`,
  },
  {
    q: "Berapa lama menfessku tayang setelah dikirim?",
    a: "Otomatis, biasanya beberapa detik setelah verifikasi selesai — sistemnya generate gambar lalu posting tanpa antre manusia. Kalau kuota harian Instagram (25 post per 24 jam) sedang penuh, kamu bakal lihat pesan yang jelas soal itu, bukan error misterius.",
  },
  {
    q: "Boleh kirim lebih dari satu menfess?",
    a: "Boleh. Ada jeda 20 detik antar kiriman dan maksimal 3 kiriman per 15 menit dari satu koneksi — cukup untuk cerita yang beda-beda, tapi nggak cukup untuk membanjiri feed.",
  },
  {
    q: "Apakah data atau teks saya disimpan di situs ini?",
    a: "Nggak. Server tidak menyimpan arsip teks kiriman — daftar arsip di situs ini diambil langsung dari postingan Instagram. Draf yang belum terkirim dan riwayat “Kiriman kamu” tersimpan hanya di browser kamu sendiri dan bisa kamu hapus kapan saja.",
  },
  {
    q: "Menfess saya gagal kirim, harus gimana?",
    a: "Baca pesan errornya — selalu disebutkan penyebabnya secara spesifik: teks terlalu pendek, captcha belum dicentang, koneksi bermasalah, atau kuota IG penuh. Perbaiki sesuai petunjuknya lalu kirim ulang. Kalau kuota yang penuh, tunggu saja — kuota terisi ulang bergulir per 24 jam.",
  },
  {
    q: "Ini akun resmi Universitas Airlangga?",
    a: `Bukan. Fess UNAIR adalah proyek independen buatan mahasiswa dan nggak berafiliasi apa pun dengan Universitas Airlangga. Semua isi menfess adalah tanggung jawab pengirimnya masing-masing.`,
  },
];

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
                  className="flex items-center font-mono text-[13px] font-bold uppercase tracking-[0.15em] text-ink-fixed"
                >
                  <span className="px-5">{item}</span>
                  <span className="text-[#c23f1b]">*</span>
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

            {/* Status kuota + statistik live — data nyata dari Instagram, bukan angka karangan */}
            <div className="mt-10 flex animate-rise flex-col items-start gap-4" style={{ animationDelay: "280ms" }}>
              <QuotaStatus />
              <LiveStats />
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
                category="semangat"
                ariaLabel="Contoh kartu menfess tentang kelulusan sidang skripsi"
                className="rotate-2 rounded-2xl border-2 border-ink shadow-[8px_8px_0_0_var(--hard-strong)] transition-all duration-300 hover:rotate-0 hover:shadow-[10px_10px_0_0_var(--hard-strong)]"
              />
              <PostPreview
                text={SAMPLE_B}
                category="curhat"
                ariaLabel="Contoh kartu menfess berisi uneg-uneg nunggu wisuda"
                className="absolute inset-x-0 top-10 z-[-1] mx-auto max-w-[92%] -rotate-3 rounded-2xl border-2 border-ink opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==== Cara kerja: tiga langkah dengan ritme offset ==== */}
      <section id="cara-kerja" className="scroll-mt-20 border-t-2 border-ink bg-paper">
        <Reveal className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
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
        </Reveal>
      </section>

      {/* ==== Aturan: section blok kontras (tinta di terang, lebih gelap di gelap) ==== */}
      <section className="border-y-2 border-ink bg-inverse text-inverse-fg">
        <Reveal className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1.6fr] lg:gap-16">
            <div>
              <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-signal">
                Aturan rumah
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Empat hal yang perlu kamu tahu sebelum kirim.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-inverse-fg/70">
                Nggak banyak aturan, tapi semuanya serius. Dibuat supaya
                platform ini tetap nyaman buat semua orang.
              </p>
            </div>
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {RULES.map((rule, i) => (
                <li
                  key={rule.title}
                  className="border-t border-inverse-fg/25 pt-5 transition-colors duration-200 hover:border-signal"
                >
                  <span className="font-mono text-[13px] font-bold text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-bold leading-snug">{rule.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-inverse-fg/70">
                    {rule.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ==== FAQ: pertanyaan yang memang sering ditanya ==== */}
      <section id="faq" className="scroll-mt-20 bg-paper">
        <Reveal className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1.8fr] lg:gap-16">
            <div>
              <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-tomato">
                Sering ditanya
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Yang paling sering ditanyain, dijawab di sini.
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                Kalau pertanyaanmu belum ada di daftar ini, cek halaman{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-4 hover:decoration-tomato"
                >
                  privasi
                </Link>{" "}
                — atau ya, langsung coba aja kirim menfessnya.
              </p>
            </div>
            <Accordion type="single" collapsible className="flex flex-col gap-3">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={faq.q}
                  value={`faq-${i}`}
                  className="overflow-hidden rounded-2xl border-2 border-ink bg-paper-raised px-0 shadow-[4px_4px_0_0_var(--hard-soft)] transition-shadow duration-200 data-[state=open]:shadow-[6px_6px_0_0_var(--hard-strong)]"
                >
                  <AccordionTrigger className="gap-4 rounded-none px-5 py-4 text-left text-[16px] font-bold leading-snug tracking-tight hover:no-underline sm:px-6">
                    <span className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-0.5 font-mono text-[12px] font-bold text-tomato"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {faq.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-0 sm:px-6">
                    <p className="max-w-2xl pl-0 text-[15px] leading-relaxed text-ink-soft sm:pl-8">
                      {faq.a}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </section>

      {/* Data terstruktur FAQPage — membantu Google menampilkan FAQ langsung di hasil pencarian */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />

      {/* ==== CTA band, dibingkai tape zine ==== */}
      <div aria-hidden className="h-2.5 border-y-2 border-ink bg-tape" />
      <section className="bg-signal">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div>
            <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-ink-fixed sm:text-4xl">
              Sudah ada yang pengen kamu keluarin hari ini?
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-fixed/75">
              Form-nya buka 24 jam, gratis, dan nggak nanya siapa kamu.{" "}
              <a
                href={IG_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-ink-fixed/40 underline-offset-4 hover:decoration-ink-fixed"
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
