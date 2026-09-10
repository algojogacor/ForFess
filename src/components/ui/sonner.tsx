"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

/**
 * Toaster global — gaya sticker-zine yang sama dengan seluruh situs:
 * kartu kertas, border tinta, hard shadow. Dipakai untuk feedback ringan
 * (salin tautan, bagikan, hapus riwayat) tanpa mengganggu alur utama.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-xl border-2 border-ink bg-paper-raised text-ink shadow-[5px_5px_0_0_var(--hard-strong)] font-sans",
          title: "text-[14px] font-semibold text-ink",
          description: "text-[13px] text-ink-soft",
          actionButton:
            "rounded-lg border-2 border-ink bg-signal px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-wide text-ink-fixed",
          cancelButton:
            "rounded-lg border-2 border-ink/20 bg-transparent px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-wide text-ink-faint",
          closeButton:
            "rounded-md border-2 border-ink bg-paper-raised text-ink",
        },
      }}
      style={
        {
          "--normal-bg": "var(--paper-raised)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--ink)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
