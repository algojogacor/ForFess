/**
 * Helper server untuk fitur "reaksi pembaca" — data disimpan di SQLite
 * (Prisma, model FessReaction), TANPA identitas apa pun: cuma mediaId +
 * kind + waktu. Anti-spam lewat rate-limit in-memory per IP (lihat
 * rate-limit.ts) — IP tidak pernah ditulis ke database.
 *
 * Semua fungsi di sini fail-soft: kalau database bermasalah, pemanggil
 * menerima nilai kosong / null dan UI tetap jalan (reaksi itu bonus,
 * bukan jalur kritis).
 */
import { db } from "@/lib/db";
import { REACTION_ID_PATTERN, REACTION_KINDS, type ReactionKind } from "@/constants";

/** Bentuk per-kartu yang dikembalikan API: jumlah per kind + total. */
export type ReactionCounts = Partial<Record<ReactionKind, number>> & {
  total: number;
};
export type ReactionMap = Record<string, ReactionCounts>;

/** Validasi satu ID media IG (angka 5–25 digit). */
export function isValidMediaId(id: string): boolean {
  return REACTION_ID_PATTERN.test(id);
}

/** Validasi jenis reaksi. */
export function isValidReactionKind(kind: unknown): kind is ReactionKind {
  return typeof kind === "string" && REACTION_KINDS.includes(kind);
}

/**
 * Ambil jumlah reaksi untuk banyak kartu sekaligus (satu query GROUP BY).
 * Gagal database → {} (UI menampilkan "tidak ada data", bukan error keras).
 */
export async function getReactionCounts(mediaIds: string[]): Promise<ReactionMap> {
  const valid = mediaIds.filter(isValidMediaId);
  if (valid.length === 0) return {};

  try {
    const grouped = await db.fessReaction.groupBy({
      by: ["mediaId", "kind"],
      where: { mediaId: { in: valid } },
      _count: { _all: true },
    });

    const map: ReactionMap = {};
    for (const row of grouped) {
      const entry = map[row.mediaId] ?? { total: 0 };
      entry[row.kind as ReactionKind] = row._count._all;
      entry.total += row._count._all;
      map[row.mediaId] = entry;
    }
    return map;
  } catch (err) {
    console.error(
      "[reaksi] gagal hitung reaksi:",
      err instanceof Error ? err.message : err
    );
    return {};
  }
}

/**
 * Ambil jumlah reaksi untuk SATU kartu.
 * null = database gagal dijangkau (beda dengan kosong = memang belum ada).
 */
export async function getReactionCountsForOne(
  mediaId: string
): Promise<ReactionCounts | null> {
  if (!isValidMediaId(mediaId)) return {};
  try {
    const grouped = await db.fessReaction.groupBy({
      by: ["kind"],
      where: { mediaId },
      _count: { _all: true },
    });
    const counts: ReactionCounts = { total: 0 };
    for (const row of grouped) {
      counts[row.kind as ReactionKind] = row._count._all;
      counts.total += row._count._all;
    }
    return counts;
  } catch (err) {
    console.error(
      "[reaksi] gagal hitung reaksi (satu kartu):",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Total SEMUA reaksi pembaca di situs (aggregate, tanpa detail per kartu).
 * Dipakai strip statistik di landing. null = database gagal — pemanggil
 * memutuskan sendiri (biasanya: sembunyikan angkanya, bukan karangan).
 */
export async function getTotalReactionCount(): Promise<number | null> {
  try {
    return await db.fessReaction.count();
  } catch (err) {
    console.error(
      "[reaksi] gagal hitung total reaksi:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Simpan satu reaksi baru. Kalau `replaceRowId` diberikan (user ganti
 * reaksi), baris lama miliknya dihapus dulu — dicocokkan JUGA dengan
 * mediaId supaya tidak mungkin menghapus reaksi kartu lain.
 *
 * Mengembalikan { counts, rowId } untuk kartu itu, atau null kalau gagal.
 */
export async function saveReaction(
  mediaId: string,
  kind: ReactionKind,
  replaceRowId?: string
): Promise<{ counts: ReactionCounts; rowId: string } | null> {
  try {
    const created = await db.$transaction(async (tx) => {
      if (replaceRowId) {
        // Hanya hapus kalau id cocok DAN barisnya memang milik kartu ini.
        await tx.fessReaction.deleteMany({
          where: { id: replaceRowId, mediaId },
        });
      }
      return tx.fessReaction.create({ data: { mediaId, kind } });
    });

    const counts = await getReactionCountsForOne(mediaId);
    return {
      counts: counts ?? { [kind]: 1, total: 1 },
      rowId: created.id,
    };
  } catch (err) {
    console.error(
      "[reaksi] gagal simpan reaksi:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
