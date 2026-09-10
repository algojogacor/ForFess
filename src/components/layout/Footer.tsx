import Link from "next/link";
import { Instagram } from "lucide-react";
import { IG_HANDLE, IG_PROFILE_URL, SITE_HOST, SITE_URL } from "@/constants";

/**
 * Footer konsisten untuk semua halaman.
 * mt-auto di dalam body flex-col membuat footer menempel ke dasar viewport
 * saat konten pendek, dan terdorong natural saat konten panjang.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t-2 border-ink bg-inverse text-inverse-fg">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand + disclaimer */}
          <div>
            <p className="text-2xl font-bold tracking-tight">
              fess<span className="text-signal">*</span>unair
            </p>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-inverse-fg/70">
              Platform menfess anonim buat warga UNAIR. Tulis apa yang belum
              kamu bilang — sisanya biar tanda bintang yang bicara.
            </p>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-inverse-fg/50">
              Bukan akun resmi dan bukan bagian dari Universitas Airlangga.
              Semua isian menfess adalah tanggung jawab pengirimnya.
            </p>
          </div>

          {/* Navigasi */}
          <nav aria-label="Navigasi footer">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
              Navigasi
            </p>
            <ul className="mt-3 space-y-2 text-[15px]">
              {[
                { href: "/", label: "Halaman utama" },
                { href: "/kirim", label: "Kirim menfess" },
                { href: "/arsip", label: "Arsip tayangan" },
                { href: "/about", label: "Tentang" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-inverse-fg/80 underline-offset-4 transition-colors hover:text-signal hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal + sosial */}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
              Legal &amp; sosial
            </p>
            <ul className="mt-3 space-y-2 text-[15px]">
              <li>
                <Link
                  href="/privacy"
                  className="text-inverse-fg/80 underline-offset-4 transition-colors hover:text-signal hover:underline"
                >
                  Kebijakan privasi
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-inverse-fg/80 underline-offset-4 transition-colors hover:text-signal hover:underline"
                >
                  Ketentuan layanan
                </Link>
              </li>
              <li>
                <a
                  href={IG_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-inverse-fg/80 underline-offset-4 transition-colors hover:text-signal hover:underline"
                >
                  <Instagram className="size-4" aria-hidden />
                  {IG_HANDLE}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-10 flex flex-col gap-1 border-t border-inverse-fg/20 pt-5 font-mono text-[12px] text-inverse-fg/50 sm:flex-row sm:items-center sm:justify-between"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        >
          <span>
            © {year} Fess UNAIR — dibuat mahasiswa, buat mahasiswa.
          </span>
          <span>{SITE_HOST}</span>
        </div>
      </div>
    </footer>
  );
}
