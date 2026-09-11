import type { Metadata } from "next";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { IG_HANDLE, IG_PROFILE_URL } from "@/constants";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "Kenapa Fess UNAIR ada, bagaimana sistemnya bekerja, dan posisi platform ini terhadap Universitas Airlangga.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
        <span className="inline-block size-2.5 bg-signal-deep" aria-hidden />
        Tentang platform
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Kenapa Fess UNAIR ada.
      </h1>

      <div className="mt-10 space-y-8 text-[17px] leading-relaxed text-ink-soft">
        <p>
          Kuliah itu penuh hal yang pengen dibahas tapi nggak selalu enak
          disampaikan pakai nama sendiri. Ada curhat soal skripsi, ada rasa
          terima kasih yang malu-malu, ada kabar yang lebih nyaman dibagikan
          tanpa identitas. Fess UNAIR dibuat khusus untuk kebutuhan itu.
        </p>
        <p>
          Prinsipnya sederhana:{" "}
          <strong className="font-bold text-ink">
            kamu nulis, sistem yang bekerja.
          </strong>{" "}
          Teks kamu divalidasi sebentar untuk menahan spam, lalu dijadikan
          kartu yang rapi dan mudah dibaca di HP, kemudian diposting otomatis
          ke {IG_HANDLE}. Tidak ada manusia yang membaca dan memilih kiriman
          sebelum tayang.
        </p>

        <Alert variant="info" title="Bukan akun resmi kampus">
          <p>
            Fess UNAIR adalah platform independen buatan mahasiswa.{" "}
            <strong className="font-bold">
              Tidak berafiliasi dan tidak diwakili Universitas Airlangga.
            </strong>{" "}
            Seluruh isi menfess merupakan pandangan dan tanggung jawab
            pengirim masing-masing.
          </p>
        </Alert>

        <section aria-labelledby="cara-bekerja">
          <h2
            id="cara-bekerja"
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Bagaimana sistemnya bekerja
          </h2>
          <p className="mt-3">
            Semua proses berjalan otomatis lewat beberapa layanan: verifikasi
            keamanan dari Cloudflare untuk menahan bot, pembuatan kartu gambar
            langsung di server, penyimpanan sesaat di Cloudinary, dan posting
            resmi melalui Instagram Graph API ke akun {IG_HANDLE}. Gambar
            sementara dihapus otomatis begitu posting selesai.
          </p>
        </section>

        <section aria-labelledby="kontak">
          <h2
            id="kontak"
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Kontak &amp; laporan
          </h2>
          <p className="mt-3">
            Ada kiriman yang melanggar ketentuan, atau menfess kamu ingin
            diturunkan? Kirim DM ke {IG_HANDLE} dengan menyertakan link
            post-nya. Laporan dibahas semampu kami lewat fitur pelaporan
            Instagram.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={IG_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "ink", size: "md" }))}
            >
              <Instagram className="size-4" aria-hidden />
              DM {IG_HANDLE}
            </a>
            <Link
              href="/kirim"
              className={cn(buttonVariants({ variant: "outline", size: "md" }))}
            >
              Coba kirim menfess
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
