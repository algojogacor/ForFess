/**
 * Rate limit berbasis database (Neon PostgreSQL) — persisten lintas serverless instances.
 *
 * Prinsip privasi: IP tidak pernah disimpan mentah. Sebelum masuk DB,
 * IP di-hash SHA-256 sehingga tidak bisa di-reverse. Identitas pengirim
 * tetap anonim sepenuhnya.
 *
 * Window: 5 menit. Pengirim yang mencoba lebih cepat mendapat pesan
 * manusiawi, bukan pesan error keras.
 *
 * Reaksi emoji tetap in-memory (frekuensi tinggi, tidak butuh persistensi).
 */
import crypto from "crypto";
import { db } from "@/lib/db";
import { RATE_LIMIT, REACTION_RATE_LIMIT } from "@/constants";

// ---- Reaksi tetap in-memory (frekuensi tinggi, tidak perlu persisten) ----
const reactionHits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Detik sampai boleh coba lagi (hanya ada saat !allowed). */
  retryAfter?: number;
}

/** Hash IP ke SHA-256 hex — tidak bisa di-reverse. */
function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`fess-rl:${ip}`).digest("hex");
}

/**
 * Cek rate limit submit berbasis DB.
 * Window 5 menit — satu kiriman per window per pengirim.
 * Fail-open: kalau DB tidak bisa diakses, izinkan request (jangan blokir user).
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const ipHash = hashIp(ip);
  const windowMs = RATE_LIMIT.WINDOW_MS;
  const windowStart = new Date(Date.now() - windowMs);

  try {
    // Cek apakah ada kiriman dalam window aktif
    const existing = await db.submitRateLimit.findUnique({
      where: { ipHash },
    });

    if (existing && existing.submittedAt > windowStart) {
      const retryAfter = Math.ceil(
        (existing.submittedAt.getTime() + windowMs - Date.now()) / 1000
      );
      return { allowed: false, retryAfter: Math.max(1, retryAfter) };
    }

    // Upsert: catat waktu kirim terbaru
    await db.submitRateLimit.upsert({
      where: { ipHash },
      update: { submittedAt: new Date() },
      create: { ipHash, submittedAt: new Date() },
    });

    // Bersihkan baris yang sudah melewati dua kali window (fire-and-forget)
    db.submitRateLimit
      .deleteMany({
        where: { submittedAt: { lt: new Date(Date.now() - windowMs * 2) } },
      })
      .catch(() => {/* abaikan — cleanup adalah bonus */});

    return { allowed: true };
  } catch (err) {
    // Fail-open: kalau DB bermasalah, jangan blokir pengirim
    console.warn(
      "[rate-limit] DB check gagal, izinkan request:",
      err instanceof Error ? err.message : err
    );
    return { allowed: true };
  }
}

// ---- Reaksi: tetap in-memory ----
function createInMemoryLimiter(config: {
  WINDOW_MS: number;
  COOLDOWN_SECONDS: number;
  MAX_PER_WINDOW: number;
}) {
  return (map: Map<string, number[]>, key: string): RateLimitResult => {
    const now = Date.now();
    const windowStart = now - config.WINDOW_MS;

    if (map.size > 5_000) {
      for (const [k, list] of map) {
        const fresh = list.filter((t) => t > windowStart);
        if (fresh.length === 0) map.delete(k);
        else map.set(k, fresh);
      }
    }

    const list = (map.get(key) ?? []).filter((t) => t > windowStart);
    const last = list[list.length - 1];
    if (last) {
      const elapsedSec = (now - last) / 1000;
      if (elapsedSec < config.COOLDOWN_SECONDS) {
        return {
          allowed: false,
          retryAfter: Math.ceil(config.COOLDOWN_SECONDS - elapsedSec),
        };
      }
    }
    if (list.length >= config.MAX_PER_WINDOW) {
      return {
        allowed: false,
        retryAfter: Math.ceil((list[0] + config.WINDOW_MS - now) / 1000),
      };
    }
    list.push(now);
    map.set(key, list);
    return { allowed: true };
  };
}

const reactionLimiter = createInMemoryLimiter(REACTION_RATE_LIMIT);

/** Rate limit untuk klik reaksi — tetap in-memory (frekuensi tinggi). */
export function checkReactionRateLimit(ip: string): RateLimitResult {
  return reactionLimiter(reactionHits, ip);
}

/**
 * Ambil IP klien dengan mitigasi anti-IP spoofing:
 * 1. Prioritaskan header edge Vercel yang tepercaya (`x-vercel-forwarded-for`).
 * 2. Cek `x-real-ip` (reverse proxy tepercaya).
 * 3. Cek `cf-connecting-ip` (Cloudflare).
 * 4. Fallback ke `x-forwarded-for`: ambil elemen terakhir (proxy terdekat yang tepercaya),
 *    bukan indeks pertama yang rentan dipalsukan oleh klien/penyerang.
 * 5. Jika tidak ditemukan atau kosong, kembalikan "unknown".
 */
export function getClientIp(headers: Headers): string {
  const vercelFwd = headers.get("x-vercel-forwarded-for");
  if (vercelFwd) {
    const ip = vercelFwd.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const ips = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }

  return "unknown";
}
