/**
 * Endpoint admin — bersihkan reaksi pembaca pada kartu lama.
 *
 * Kenapa perlu? Baris FessReaction menumpuk seiring waktu untuk kartu yang
 * sudah keluar dari horizon arsip (arsip cuma menampung ~50 post terakhir),
 * jadi hitungannya tidak pernah tampil lagi. Pembersihan berkala menjaga
 * database tetap ramping TANPA menyentuh reaksi kartu yang masih tampil.
 *
 * Autentikasi (dua gaya, sama-sama constant-time compare):
 * - POST + header `x-admin-secret`   → untuk menjalankan manual via curl.
 * - GET  + header `Authorization: Bearer <secret>` → untuk Vercel Cron,
 *   yang selalu mengirim format itu. Nilainya sama: MENFESS_ADMIN_SECRET
 *   (pasang juga sebagai CRON_SECRET di Vercel — cron mengirim CRON_SECRET).
 *
 * Env tidak dipasang → 401, bukan fail-open: endpoint pembersihan itu
 * destruktif, jadi aman lebih baik daripada nyaman.
 *
 * Pakai manual:
 *   curl -X POST https://<host>/api/admin/reaksi-cleanup \
 *     -H "x-admin-secret: $MENFESS_ADMIN_SECRET" \
 *     -H "content-type: application/json" \
 *     -d '{"olderThanDays": 90}'
 *
 * Cron (terdaftar di vercel.json, tiap Senin 03:00 UTC):
 *   GET /api/admin/reaksi-cleanup dengan `Authorization: Bearer $CRON_SECRET`
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bandingkan secret tanpa bocoran timing (panjang disamakan dulu). */
function secretMatches(provided: string | null | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Ambil secret dari Authorization: Bearer <token>. */
function bearerToken(req: NextRequest): string | undefined {
  const header = req.headers.get("authorization");
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || undefined;
}

/** Auth bersama POST/GET — mengembalikan response error atau null jika lolos. */
function checkAuth(
  req: NextRequest
): NextResponse<{ ok: false; error: string }> | null {
  const expected = process.env.MENFESS_ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Endpoint ini belum dikonfigurasi: MENFESS_ADMIN_SECRET tidak terpasang di server. Pembersihan otomatis ditolak demi keamanan.",
      },
      { status: 401 }
    );
  }
  const provided =
    req.method === "GET" ? bearerToken(req) : req.headers.get("x-admin-secret");
  if (!secretMatches(provided, expected)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          req.method === "GET"
            ? "Secret salah atau hilang. Kirim header Authorization: Bearer berisi MENFESS_ADMIN_SECRET (Vercel Cron mengirim CRON_SECRET — samakan nilainya)."
            : "Secret salah atau hilang. Kirim header x-admin-secret berisi nilai MENFESS_ADMIN_SECRET.",
      },
      { status: 401 }
    );
  }
  return null;
}

/** Inti pembersihan — dipakai POST (manual) dan GET (cron). */
async function runCleanup(olderThanDays: number) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  try {
    const result = await db.fessReaction.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return NextResponse.json({
      ok: true,
      deleted: result.count,
      olderThanDays,
      cutoffIso: cutoff.toISOString(),
      note:
        result.count === 0
          ? "Tidak ada reaksi yang lebih tua dari batas itu — database sudah bersih."
          : `Terhapus ${result.count} reaksi pada kartu lebih tua dari ${olderThanDays} hari.`,
    });
  } catch (err) {
    console.error(
      "[admin/reaksi-cleanup] DB gagal:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "Database tidak bisa dijangkau saat pembersihan. Tidak ada yang dihapus — coba lagi sebentar.",
      },
      { status: 503 }
    );
  }
}

/** Cron Vercel hanya bisa GET — auth via Bearer, parameter selalu default. */
export async function GET(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;
  return runCleanup(90);
}

export async function POST(req: NextRequest) {
  /* ---------- Auth ---------- */
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  /* ---------- Parameter (opsional) ---------- */
  let olderThanDays = 90;
  const raw = await req.text();
  if (raw.trim().length > 0) {
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Body bukan JSON valid. Kirim objek {"olderThanDays": <angka 1–3650>} atau body kosong untuk nilai bawaan 90 hari.',
        },
        { status: 400 }
      );
    }
    const parsed = (body as { olderThanDays?: unknown })?.olderThanDays;
    if (parsed !== undefined) {
      if (
        typeof parsed !== "number" ||
        !Number.isInteger(parsed) ||
        parsed < 1 ||
        parsed > 3650
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "olderThanDays harus bilangan bulat 1–3650 (hari). Reaksi lebih tua dari itu yang dihapus.",
          },
          { status: 400 }
        );
      }
      olderThanDays = parsed;
    }
  }

  return runCleanup(olderThanDays);
}
