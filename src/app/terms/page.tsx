import type { Metadata } from "next";
import Link from "next/link";
import { IG_HANDLE } from "@/constants";

export const metadata: Metadata = {
  title: "Ketentuan Layanan",
  description:
    "Aturan penggunaan Fess UNAIR: apa yang boleh dikirim, apa yang dilarang, dan bagaimana penanganan pelaporan.",
};

function Section({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t-2 border-ink/10 pt-8">
      <p className="font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-tomato">
        {num}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
        <span className="inline-block size-2.5 bg-signal-deep" aria-hidden />
        Legal
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Ketentuan Layanan
      </h1>
      <p className="mt-4 text-[15px] text-ink-faint">
        Terakhir diperbarui: 10 September 2026.
      </p>

      <div className="mt-10 space-y-8">
        <Section num="01" title="Tentang layanan">
          <p>
            Fess UNAIR adalah layanan gratis untuk mengirim pesan anonim yang
            dipublikasikan otomatis ke akun Instagram {IG_HANDLE}. Layanan
            disediakan &ldquo;sebagaimana adanya&rdquo; tanpa jaminan
            ketersediaan tanpa gangguan. Untuk menjaga sistem, ada batas
            jumlah kiriman per pengguna dan per hari.
          </p>
        </Section>

        <Section num="02" title="Yang dilarang dikirim">
          <p>Dengan memakai layanan ini, kamu setuju untuk tidak mengirim:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Data pribadi orang lain: nama lengkap, NIM, foto, alamat, nomor
              kontak, atau informasi yang bisa mengidentifikasi seseorang
              (doxxing).
            </li>
            <li>Ujaran kebencian, hinaan bernuansa SARA, atau pelecehan.</li>
            <li>Ancaman kekerasan, intimidasi, atau dorongan menyakiti.</li>
            <li>Konten ilegal menurut hukum yang berlaku di Indonesia.</li>
            <li>
              Iklan, promosi, spam, atau tautan yang mengarah ke halaman
              komersial/penipuan.
            </li>
            <li>
              Klaim akademik palsu atas nama institusi, dosen, atau
              organisasi.
            </li>
          </ul>
        </Section>

        <Section num="03" title="Moderasi dan pelaporan">
          <p>
            Kiriman tidak melewati moderasi pra-tayang — sistem memposting
            otomatis. Karena itu, penanganan dilakukan setelah tayang: laporkan
            post yang melanggar lewat fitur pelaporan Instagram dan/atau DM{" "}
            {IG_HANDLE} dengan menyertakan link post. Kiriman yang jelas
            melanggar akan dilaporkan ke Instagram untuk diturunkan.
          </p>
        </Section>

        <Section num="04" title="Tanggung jawab">
          <p>
            Seluruh isi menfess adalah tanggung jawab pengirimnya. Fess UNAIR
            tidak terlibat dan tidak menjadi pihak dalam sengketa antar
            pihak yang muncul dari isi kiriman. Penggunaan layanan ini bukan
            pengganti kanal resmi kampus untuk urusan administrasi atau
            akademik.
          </p>
        </Section>

        <Section num="05" title="Perubahan ketentuan">
          <p>
            Ketentuan ini bisa diperbarui sewaktu-waktu mengikuti
            perkembangan layanan. Versi terbaru selalu tersedia di halaman
            ini, dan melanjutkan penggunaan layanan berarti kamu menyetujui
            versi terakhirnya.
          </p>
        </Section>

        <p className="border-t-2 border-ink/10 pt-6 text-[15px] text-ink-faint">
          Baca juga{" "}
          <Link
            href="/privacy"
            className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-tomato"
          >
            Kebijakan Privasi
          </Link>{" "}
          untuk memahami bagaimana data menfess ditangani.
        </p>
      </div>
    </div>
  );
}
