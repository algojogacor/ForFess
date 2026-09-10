/**
 * Kartu acak — pilih SATU post sembarang dari daftar post terakhir
 * @fess_unair. Dipakai halaman /acak ("kocok kartu").
 *
 * Catatan desain:
 * - Acaknya dari pool cache bersama (lib/media-pool), jadi nggak nambah
 *   beban ke Graph API setiap kali user menekan tombol kocok.
 * - Endpoint ini TIDAK boleh di-cache (CDN/browser) — hasilnya harus
 *   beda tiap request, itu intinya.
 * - Fail-open: kalau data IG tidak tersedia, tetap 200 dengan item:null
 *   + alasan spesifik; UI yang bikin pesan ramah + tombol coba lagi.
 */
import { NextResponse } from "next/server";
import { pickRandomMedia } from "@/lib/media-pool";
import type { ArchiveItem } from "@/types/menfess";

export const runtime = "nodejs";

export interface AcakResponse {
  ok: true;
  /** null = belum bisa dikocok saat ini (IG tidak bisa dihubungi / belum ada post). */
  item: ArchiveItem | null;
  /** Alasan kenapa item kosong — buat pesan yang spesifik, bukan error misterius. */
  reason?: "unavailable" | "empty";
}

export async function GET(request: Request) {
  // ID yang BARU SAJA ditampilkan — supaya tombol "kocok lagi" nggak
  // mengeluarkan kartu yang sama dua kali berturut-turut.
  const excludeId = new URL(request.url).searchParams.get("exclude") ?? undefined;

  const item = await pickRandomMedia(excludeId);

  return NextResponse.json<AcakResponse>(
    {
      ok: true,
      item,
      reason: item ? undefined : "empty",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
