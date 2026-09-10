import type { Metadata } from "next";
import Link from "next/link";
import { IG_HANDLE } from "@/constants";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Data apa yang diproses Fess UNAIR, apa yang tidak kami minta, dan bagaimana gambar menfess ditangani.",
};

/** Section legal dengan penomoran mono biar konsisten dengan halaman ketentuan. */
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

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink-soft">
        <span className="inline-block size-2.5 bg-signal-deep" aria-hidden />
        Legal
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Kebijakan Privasi
      </h1>
      <p className="mt-4 text-[15px] text-ink-faint">
        Terakhir diperbarui: 10 September 2026.
      </p>

      <div className="mt-10 space-y-8">
        <Section num="01" title="Data yang kami proses">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-bold text-ink">Isi menfess</strong> —
              teks yang kamu kirim akan diposting secara publik di akun{" "}
              {IG_HANDLE}. Siapa pun yang bisa melihat akun tersebut dapat
              membacanya.
            </li>
            <li>
              <strong className="font-bold text-ink">Token verifikasi</strong>{" "}
              — hasil captcha diperiksa ke Cloudflare lalu dibuang. Tidak
              disimpan dan tidak mengandung identitas kamu.
            </li>
            <li>
              <strong className="font-bold text-ink">Alamat IP</strong> —
              dipakai sesaat untuk pembatasan laju (rate limit) anti-spam di
              memori server, dan tidak ditulis ke basis data.
            </li>
            <li>
              <strong className="font-bold text-ink">Kategori menfess</strong> —
              kalau kamu memilih kategori (Curhat, Lucu, dst.), label itu
              ditulis di kartu dan caption postingan — artinya ikut publik.
              Nggak memilih? Nggak ada label yang dicatat.
            </li>
            <li>
              <strong className="font-bold text-ink">Reaksi pembaca</strong> —
              kalau kamu menekan tombol reaksi di halaman kartu, yang
              disimpan cuma ID kartunya, jenis reaksinya, dan waktunya.
              Tidak ada nama, akun, atau penanda siapa pun yang ikut
              tersimpan. Pilihan reaksi kamu sendiri diingat di perangkat
              kamu (localStorage), bukan di server. Landing page menampilkan
              jumlah total reaksi dalam bentuk agregat — tanpa rincian
              perangkat mana pun.
            </li>
            <li>
              <strong className="font-bold text-ink">Koleksi tersimpan</strong>{" "}
              — tombol bookmark di kartu arsip menyimpan salinan data publik
              kartu (isi menfess, kategori, tanggal, jumlah suka) di
              localStorage perangkat kamu saja, supaya kartu favorit tetap
              bisa dibuka dari halaman Tersimpan. Tidak ada yang dikirim ke
              server kami — server bahkan tidak tahu kamu menyimpan apa —
              dan kamu bisa menghapusnya kapan saja lewat tombol hapus di
              halaman itu.
            </li>
            <li>
              <strong className="font-bold text-ink">Gambar menfess</strong> —
              dibuat otomatis di server lalu diunggah sesaat ke Cloudinary
              agar bisa dibaca Instagram, dan langsung dihapus setelah posting
              selesai.
            </li>
          </ul>
        </Section>

        <Section num="02" title="Data yang tidak kami minta">
          <p>
            Tidak ada pendaftaran akun, tidak ada kolom nama, email, NIM,
            nomor telepon, atau akun media sosial. Kami tidak memasang cookie
            pelacak iklan dan tidak menjual data ke siapa pun. Karena itu,
            kami juga tidak bisa mengaitkan sebuah menfess dengan siapa pun —
            termasuk dengan kamu.
          </p>
        </Section>

        <Section num="03" title="Layanan pihak ketiga">
          <p>
            Prosesnya melibatkan beberapa penyedia: Cloudflare (verifikasi
            anti-bot), Cloudinary (penyimpanan gambar sementara), dan Meta /
            Instagram (tempat menfess dipublikasikan). Aktivitas mereka
            masing-masing mengikuti kebijakan privasi mereka sendiri.
          </p>
        </Section>

        <Section num="04" title="Berapa lama data disimpan">
          <p>
            Isi menfess tetap tampil sebagai postingan di Instagram sesuai
            siklus hidup post tersebut. Gambar sementara di Cloudinary dihapus
            tepat setelah posting berhasil (atau gagal). Alamat IP untuk rate
            limit hanya hidup di memori server dalam jangka pendek. Reaksi
            pembaca tersimpan selama arsip situs aktif dan bisa dihapus
            massal kapan pun tanpa memengaruhi siapa pun secara individual —
            isinya memang tidak terhubung ke orang tertentu.
          </p>
        </Section>

        <Section num="05" title="Hak kamu">
          <p>
            Karena kami tidak menyimpan data identitas, tidak ada profil
            pengguna yang bisa dihapus atau diekspor per orang. Kalau sebuah
            menfess melanggar ketentuan, kamu bisa melaporkannya lewat DM{" "}
            {IG_HANDLE} dengan menyertakan link post.
          </p>
        </Section>

        <p className="border-t-2 border-ink/10 pt-6 text-[15px] text-ink-faint">
          Pertanyaan soal privasi bisa dikirim lewat DM{" "}
          {IG_HANDLE}. Lihat juga{" "}
          <Link
            href="/terms"
            className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-tomato"
          >
            Ketentuan Layanan
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
