"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { useKoleksi } from "@/lib/koleksi";

/** Deteksi mount tanpa setState-in-effect (aman hydration & lint). */
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const NAV_LINKS = [
  { href: "/kirim", label: "Kirim" },
  { href: "/arsip", label: "Arsip" },
  { href: "/acak", label: "Acak" },
  { href: "/tersimpan", label: "Tersimpan" },
  { href: "/about", label: "Tentang" },
  { href: "/privacy", label: "Privasi" },
  { href: "/terms", label: "Ketentuan" },
] as const;

/** Logo Fess UNAIR — blok tinta dengan bintang kuning (motif anonimitas).
 *  Hover: bintang berputar 120° (simetri tiga batangnya) — terasa "mendarat"
 *  kembali ke bentuk yang sama, bukan sekadar miring. */
function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 place-items-center rounded-lg border-2 border-ink-fixed bg-ink-fixed dark:border-[#70685b]",
        className
      )}
    >
      <svg
        viewBox="0 0 64 64"
        className="size-5 transition-transform duration-500 ease-out group-hover:rotate-[120deg]"
        fill="none"
      >
        <path
          d="M32 10v44M12 21l40 22M52 21L12 43"
          stroke="#FFC800"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Tombol toggle tema terang/gelap — ikut mode system sebelum interaksi pertama. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? isDark
            ? "Aktifkan mode terang"
            : "Aktifkan mode gelap"
          : "Ganti tema"
      }
      title={mounted ? (isDark ? "Mode terang" : "Mode gelap") : "Ganti tema"}
      className={cn(
        "grid size-10 place-items-center rounded-lg border-2 border-ink bg-paper-raised transition-transform duration-150 hover:-rotate-6 active:rotate-6",
        className
      )}
    >
      <span className="relative block size-5">
        <Sun
          aria-hidden
          className={cn(
            "absolute inset-0 size-5 transition-all duration-300",
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
          )}
        />
        <Moon
          aria-hidden
          className={cn(
            "absolute inset-0 size-5 transition-all duration-300",
            isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
          )}
        />
      </span>
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /** Jumlah koleksi tersimpan — badge kecil di link Tersimpan (0 = disembunyikan). */
  const { count: koleksiCount } = useKoleksi();

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper/90 backdrop-blur-md">
      <nav
        aria-label="Navigasi utama"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="group flex items-center gap-2.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-lg"
          aria-label="Fess UNAIR — halaman utama"
        >
          <LogoMark />
          <span className="text-lg font-bold tracking-tight">
            fess<span className="text-tomato">*</span>unair
          </span>
        </Link>

        {/* Link desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 font-mono text-[13px] uppercase tracking-wider transition-colors hover:bg-ink/5",
                  active ? "text-ink font-bold" : "text-ink-soft"
                )}
              >
                <span className={cn(active && "bg-signal px-1 text-ink-fixed")}>
                  {link.label}
                </span>
                {link.href === "/tersimpan" && koleksiCount > 0 ? (
                  <span
                    className="ml-1 inline-block rounded-full border border-ink/20 bg-signal px-1.5 py-px font-mono text-[10px] font-bold leading-none text-ink-fixed"
                    title={`${koleksiCount} kartu tersimpan di perangkat ini`}
                  >
                    {koleksiCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {/* Toggle tema + CTA */}
          <div className="ml-2 flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/kirim"
              className={cn(buttonVariants({ variant: "signal", size: "sm" }))}
            >
              Kirim menfess
            </Link>
          </div>
        </div>

        {/* Tombol menu mobile + toggle tema */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            className="grid size-10 place-items-center rounded-lg border-2 border-ink bg-paper-raised md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Panel mobile — slide turun dengan animasi rise */}
      {open ? (
        <div
          id="mobile-menu"
          className="animate-rise border-t-2 border-ink bg-paper md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-3 font-mono text-sm uppercase tracking-wider",
                    active ? "bg-signal-soft font-bold text-ink" : "text-ink-soft"
                  )}
                >
                  {link.label}
                  {link.href === "/tersimpan" && koleksiCount > 0 ? (
                    <span
                      className="rounded-full border border-ink/20 bg-signal px-1.5 py-px font-mono text-[10px] font-bold leading-none text-ink-fixed"
                      aria-label={`${koleksiCount} kartu tersimpan`}
                    >
                      {koleksiCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            <Link
              href="/kirim"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "signal", size: "md" }), "mt-2 w-full")}
            >
              Kirim menfess
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
