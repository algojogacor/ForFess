import { db } from "@/lib/db";

/**
 * Durasi toleransi untuk dianggap masih online: 2 menit.
 * Sesi yang mengirim heartbeat dalam rentang ini dihitung sebagai aktif.
 */
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Batas kedaluwarsa sesi untuk dibersihkan: 5 menit.
 */
const EXPIRE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Cache in-memory hitungan user online (15 detik)
 * agar traffic tinggi tidak membebani database Neon.
 */
let cachedCount: {
  value: number;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 15 * 1000;

/**
 * Mengambil jumlah sesi yang aktif dalam 2 menit terakhir.
 * Memiliki cache in-memory 15 detik dan fail-open jika database sibuk.
 */
export async function getOnlineCount(): Promise<number> {
  const now = Date.now();

  // Kembalikan dari cache jika masih fresh
  if (cachedCount && now - cachedCount.timestamp < CACHE_TTL_MS) {
    return cachedCount.value;
  }

  try {
    const threshold = new Date(now - ONLINE_WINDOW_MS);
    const count = await db.activeSession.count({
      where: {
        lastSeen: {
          gte: threshold,
        },
      },
    });

    cachedCount = {
      value: Math.max(1, count), // Minimal 1 jika pengunjung saat ini sedang melihat
      timestamp: now,
    };

    return cachedCount.value;
  } catch (err) {
    console.warn(
      "[presence] gagal hitung user online, fail-open:",
      err instanceof Error ? err.message : err
    );
    // Jika gagal baca database, gunakan nilai cache terakhir atau fallback 1
    return cachedCount?.value ?? 1;
  }
}

/**
 * Memperbarui timestamp heartbeat sesi pengunjung.
 * Bersifat 100% anonim (hanya UUID string acak dari client sessionStorage).
 */
export async function pingPresence(sessionId: string): Promise<number> {
  // Validasi format string sessionId (10 - 64 karakter)
  if (
    typeof sessionId !== "string" ||
    sessionId.length < 10 ||
    sessionId.length > 64
  ) {
    return getOnlineCount();
  }

  const now = new Date();

  try {
    // Upsert sesi: update waktu jika ada, atau buat baru
    await db.activeSession.upsert({
      where: { id: sessionId },
      update: { lastSeen: now },
      create: { id: sessionId, lastSeen: now },
    });

    // Pembersihan pasif (passive cleanup) dengan probabilitas 20%
    // agar tabel tidak pernah membengkak dan tidak membebani query setiap request
    if (Math.random() < 0.2) {
      const expiredThreshold = new Date(Date.now() - EXPIRE_WINDOW_MS);
      db.activeSession
        .deleteMany({
          where: {
            lastSeen: {
              lt: expiredThreshold,
            },
          },
        })
        .catch((cleanErr) => {
          console.warn("[presence] passive cleanup gagal (non-blocking):", cleanErr);
        });
    }
  } catch (err) {
    console.warn(
      "[presence] gagal simpan heartbeat sesi, abaikan:",
      err instanceof Error ? err.message : err
    );
  }

  return getOnlineCount();
}
