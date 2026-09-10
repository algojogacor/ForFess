/**
 * API reaksi pembaca.
 *
 * GET  /api/reaksi?ids=<id1>,<id2>,…  → jumlah reaksi per kartu (bulk,
 *                                       dipakai arsip & halaman kartu).
 * POST /api/reaksi  { mediaId, kind } → simpan satu reaksi anonim.
 *
 * Privasi: TIDAK ada identitas yang disimpan — cuma mediaId + kind + waktu.
 * IP hanya dipakai sesaat untuk rate-limit in-memory, tidak pernah
 * ditulis ke database.
 *
 * Kegagalan database tidak pernah 500 mentah: GET fail-open dengan map
 * kosong, POST 503 dengan pesan spesifik agar UI bisa menampilkan
 * penjelasan yang jujur.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REACTION_MAX_IDS } from "@/constants";
import {
  getReactionCounts,
  getReactionCountsForOne,
  isValidMediaId,
  isValidReactionKind,
  saveReaction,
} from "@/lib/reaksi";
import { checkReactionRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export interface ReaksiGetResponse {
  ok: true;
  /** Peta mediaId → { <kind>: jumlah, total }. Kartu tanpa reaksi tidak ada di map. */
  counts: Record<string, { total: number } & Partial<Record<string, number>>>;
}

export interface ReaksiPostResponse {
  ok: true;
  /** Jumlah terbaru untuk kartu yang baru direaksi. */
  counts: { total: number } & Partial<Record<string, number>>;
  /** ID baris reaksi milik pembaca ini — tiket ganti reaksi di kemudian hari.
   *  Disimpan di localStorage perangkat, bukan cookie/account. */
  rowId: string;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ids") ?? "";

  // Satu ID (halaman kartu) atau daftar dipisah koma (arsip).
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json<ReaksiGetResponse>(
      { ok: true, counts: {} },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (ids.length > REACTION_MAX_IDS) {
    return NextResponse.json(
      {
        ok: false,
        error: `Terlalu banyak ID (maksimal ${REACTION_MAX_IDS} sekaligus).`,
      },
      { status: 400 }
    );
  }

  const invalid = ids.find((id) => !isValidMediaId(id));
  if (invalid) {
    return NextResponse.json(
      {
        ok: false,
        error: "Format ID media tidak valid.",
        detail: `ID "${invalid.slice(0, 40)}" tidak cocok dengan format ID media Instagram.`,
      },
      { status: 400 }
    );
  }

  const counts = await getReactionCounts(ids);

  return NextResponse.json<ReaksiGetResponse>(
    { ok: true, counts },
    {
      headers: {
        // Angka boleh agak basi sebentar — hemat request, tetap "hidup".
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      },
    }
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Body request bukan JSON yang valid.",
        detail: "Kirim JSON dengan bentuk { mediaId, kind }.",
      },
      { status: 400 }
    );
  }

  const { mediaId, kind, replaceRowId } = (body ?? {}) as {
    mediaId?: unknown;
    kind?: unknown;
    replaceRowId?: unknown;
  };

  if (typeof mediaId !== "string" || !isValidMediaId(mediaId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "ID media tidak valid.",
        detail: "ID media harus berupa angka ID postingan Instagram.",
      },
      { status: 400 }
    );
  }

  if (!isValidReactionKind(kind)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Jenis reaksi tidak dikenal.",
        detail: "Jenis yang tersedia: relate, lucu, sedih, semangat.",
      },
      { status: 400 }
    );
  }

  const ip = getClientIp(request.headers);
  const limit = checkReactionRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Terlalu banyak reaksi dalam waktu singkat.",
        detail: `Coba lagi dalam ${limit.retryAfter ?? 2} detik.`,
        retryAfter: limit.retryAfter ?? 2,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter ?? 2) },
      }
    );
  }

  // Tiket ganti reaksi: string cuid dari reaksi sebelumnya (opsional).
  const oldRowId =
    typeof replaceRowId === "string" && replaceRowId.length >= 20 && replaceRowId.length <= 40
      ? replaceRowId
      : undefined;

  const result = await saveReaction(mediaId, kind, oldRowId);
  if (!result) {
    return NextResponse.json(
      {
        ok: false,
        error: "Reaksi gagal disimpan.",
        detail:
          "Database reaksi sedang tidak bisa dijangkau. Coba beberapa saat lagi — kartunya tetap aman, ini cuma soal hitungan reaksi.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json<ReaksiPostResponse>(
    { ok: true, counts: result.counts, rowId: result.rowId },
    { headers: { "Cache-Control": "no-store" } }
  );
}
