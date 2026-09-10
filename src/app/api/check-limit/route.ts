/**
 * Cek kuota content_publishing_limit Instagram — bisa dipakai standalone
 * (misal buat halaman status atau monitoring). GET saja, tanpa auth.
 *
 * Filosofi fail-open: kalau Graph API gagal dihubungi, tetap balas
 * `ok: true` dengan quota: null — artinya "tidak diketahui", bukan "penuh".
 */
import { NextResponse } from "next/server";
import { checkLimit, InstagramError } from "@/lib/instagram";
import type { CheckLimitResponse } from "@/types/menfess";

export const runtime = "nodejs";

export async function GET() {
  try {
    const quota = await checkLimit();
    return NextResponse.json<CheckLimitResponse>({ ok: true, quota });
  } catch (err) {
    if (err instanceof InstagramError) {
      console.warn(
        "[check-limit] Instagram error:",
        err.message,
        "code:",
        err.fbCode
      );
    } else {
      console.warn(
        "[check-limit] gagal cek kuota:",
        err instanceof Error ? err.message : err
      );
    }
    // Tetap 200 + quota null: status "tidak diketahui", bukan error untuk user.
    return NextResponse.json<CheckLimitResponse>({
      ok: true,
      quota: null,
    });
  }
}
