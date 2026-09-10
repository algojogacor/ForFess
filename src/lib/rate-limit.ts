/**
 * Rate limit in-memory sederhana (sliding window + cooldown per IP).
 *
 * Catatan skalabilitas: di Vercel serverless state ini per-instance.
 * Itu disengaja — lapisan anti-spam utama tetap Turnstile. Kalau nanti
 * butuh limit global, ganti implementasi fungsi ini ke Upstash/Redis
 * tanpa mengubah pemanggil.
 */
import { RATE_LIMIT, REACTION_RATE_LIMIT } from "@/constants";

const hits = new Map<string, number[]>();
const reactionHits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Detik sampai boleh coba lagi (hanya ada saat !allowed). */
  retryAfter?: number;
}

/** Factory: sliding-window limiter dengan cooldown per kunci + peta tersendiri. */
function createLimiter(config: {
  WINDOW_MS: number;
  COOLDOWN_SECONDS: number;
  MAX_PER_WINDOW: number;
}) {
  return (map: Map<string, number[]>, key: string): RateLimitResult => {
    const now = Date.now();
    const windowStart = now - config.WINDOW_MS;

    // Rapikan entri lama & bersih-bersih berkala agar memory tidak bengkak.
    if (map.size > 5_000) {
      for (const [k, list] of map) {
        const fresh = list.filter((t) => t > windowStart);
        if (fresh.length === 0) map.delete(k);
        else map.set(k, fresh);
      }
    }

    const list = (map.get(key) ?? []).filter((t) => t > windowStart);

    // 1) Cooldown antar aksi dari kunci yang sama.
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

    // 2) Batas jumlah aksi per window.
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

const submitLimiter = createLimiter(RATE_LIMIT);
const reactionLimiter = createLimiter(REACTION_RATE_LIMIT);

export function checkRateLimit(ip: string): RateLimitResult {
  return submitLimiter(hits, ip);
}

/** Rate limit untuk klik reaksi — peta & angka terpisah dari submit. */
export function checkReactionRateLimit(ip: string): RateLimitResult {
  return reactionLimiter(reactionHits, ip);
}

/** Ambil IP klien dari header request (Vercel memakai x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
