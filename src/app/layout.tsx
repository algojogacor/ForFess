import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SITE_URL } from "@/constants";

// Font identitas: Space Grotesk (display + body) & Space Mono (label/ticker).
// Dimuat lokal (bukan Google CDN) supaya offline-safe & deterministik.
const spaceGrotesk = localFont({
  src: [
    { path: "../assets/fonts/space-grotesk-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/space-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/space-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-grotesk",
  display: "swap",
});

const spaceMono = localFont({
  src: [
    { path: "../assets/fonts/space-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/space-mono-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-spacemono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fess UNAIR — menfess anonim buat warga UNAIR",
    template: "%s — Fess UNAIR",
  },
  description:
    "Tulis apa pun yang belum sempat kamu ucapkan. Tanpa nama, tanpa login — langsung tayang di @fess_unair.",
  keywords: ["menfess", "unair", "fess unair", "anonim", "mahasiswa"],
  openGraph: {
    title: "Fess UNAIR",
    description:
      "Menfess anonim buat warga UNAIR. Tulis, kirim, langsung tayang di @fess_unair.",
    url: SITE_URL,
    siteName: "Fess UNAIR",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary",
    title: "Fess UNAIR",
    description: "Menfess anonim buat warga UNAIR — tayang di @fess_unair.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F2E8" },
    { media: "(prefers-color-scheme: dark)", color: "#14110D" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col font-sans`}
      >
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
