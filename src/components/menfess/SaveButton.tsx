"use client";

import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { toggleFess, useKoleksi } from "@/lib/koleksi";
import type { ArchiveItem } from "@/types/menfess";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  /** Snapshot kartu yang disimpan ke koleksi (data publik, bukan data rahasia). */
  item: ArchiveItem;
  /** "overlay" = ikon di pojok gambar; "row" = tombol berlabel di baris aksi. */
  variant?: "overlay" | "row";
}

/**
 * Tombol simpan/hapus koleksi — satu sumber kebenaran lewat useKoleksi,
 * jadi semua tombol di halaman berbeda (arsip, acak, detail, koleksi)
 * selalu menunjukkan state yang sama. Koleksinya hidup di localStorage
 * perangkat: nggak ada server, nggak ada akun.
 */
export function SaveButton({ item, variant = "overlay" }: SaveButtonProps) {
  const { ids } = useKoleksi();
  const saved = ids.has(item.id);

  const handleToggle = () => {
    const result = toggleFess(item);
    if (result.saved) {
      toast.success("Disimpan ke koleksi", {
        description: "Buka halaman Tersimpan buat lihat lagi — datanya cuma ada di perangkat ini.",
      });
    } else {
      toast("Dihapus dari koleksi", {
        description: "Kartunya masih tayang di arsip, cuma nggak lagi kamu simpan.",
      });
    }
  };

  const label = saved ? "Hapus dari koleksi tersimpan" : "Simpan ke koleksi";

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={saved}
        aria-label={`${label}${item.id ? ` — kartu ${item.id}` : ""}`}
        title={saved ? "Hapus dari koleksi" : "Simpan ke koleksi"}
        className={cn(
          "grid size-9 place-items-center rounded-lg border-2 border-ink transition-all duration-150",
          "outline-none hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--hard-soft)]",
          "focus-visible:shadow-[0_0_0_3px_var(--focus-ring)] active:translate-y-0",
          saved
            ? "bg-signal text-ink-fixed shadow-[2px_2px_0_0_var(--hard-soft)]"
            // Pointer halus: sembunyi sampai kartu di-hover/di-focus.
            // Layar sentuh (no-hover): selalu terlihat.
            : "bg-paper-raised/95 text-ink opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 no-hover:opacity-100"
        )}
      >
        <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border-2 border-ink px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide transition-colors outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]",
        saved
          ? "bg-signal text-ink-fixed"
          : "bg-paper-raised text-ink hover:bg-signal-soft"
      )}
    >
      <Bookmark className={cn("size-3.5", saved && "fill-current")} aria-hidden />
      {saved ? "Tersimpan" : "Simpan"}
    </button>
  );
}
