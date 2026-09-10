"use client";

import { useState } from "react";
import { Check, ListOrdered, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildKoleksiText, type SavedFess } from "@/lib/koleksi";
import { SITE_HOST } from "@/constants";

/**
 * Tombol "Ekspor daftar" — bungkus seluruh koleksi jadi satu teks rapi
 * (nomor + kutipan + tautan kartu), lalu:
 *  - HP: buka share sheet bawaan (Web Share API), biar gampang dikirim ke chat;
 *  - Desktop: salin ke clipboard.
 * Semua jalur gagal punya pesan spesifik — nggak ada tombol yang diam.
 */
export function KoleksiExport({ list }: { list: SavedFess[] }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    if (busy || list.length === 0) return;
    setBusy(true);
    const text = buildKoleksiText(list, SITE_HOST);

    try {
      // Jalur 1: share sheet (mobile / browser yang dukung).
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: `Koleksi Fess UNAIR (${list.length} kartu)`,
            text,
          });
          setDone(true);
          setTimeout(() => setDone(false), 2000);
          return;
        } catch (err) {
          // User batal buka share sheet — bukan kegagalan, jangan lanjut salin.
          if (err instanceof DOMException && err.name === "AbortError") return;
          // Share gagal karena alasan lain → turun ke clipboard.
        }
      }

      // Jalur 2: clipboard.
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      if (typeof navigator.share === "function") {
        toast.info("Share sheet gagal dibuka", {
          description: "Daftarnya udah disalin ke clipboard — tinggal tempel di chat.",
        });
      } else {
        toast.success("Daftar koleksi tersalin", {
          description: `${list.length} kartu terwrap jadi satu teks rapi — tinggal tempel ke chat atau catatan.`,
        });
      }
    } catch {
      toast.error("Gagal mengekspor daftar", {
        description:
          "Browser memblokir akses clipboard atau share. Coba lagi, atau buka satu per satu kartunya, ya.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={busy}
      aria-label={
        done
          ? "Daftar koleksi tersalin"
          : `Ekspor ${list.length} kartu tersimpan jadi daftar teks`
      }
      className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wider transition-colors outline-none hover:bg-signal-soft focus-visible:shadow-[0_0_0_3px_var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
    >
      {busy ? (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Menyiapkan…
        </>
      ) : done ? (
        <>
          <Check className="size-3.5 text-tomato-deep" aria-hidden />
          Siap dibagikan
        </>
      ) : (
        <>
          <ListOrdered className="size-3.5" aria-hidden />
          Ekspor daftar
        </>
      )}
    </button>
  );
}