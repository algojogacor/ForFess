/**
 * Rate limit in-memory sederhana (sliding window + cooldown per IP).
 *
 * Catatan skalabilitas: di Vercel serverless state ini per-instance.
 * Itu disengaja — lapisan anti-spam utama tetap Turnstile. Kalau nanti
 * butuh limit global, ganti implementasi fungsi ini ke Upstash/Redis
 * tanpa mengubah pemanggil.
 */
import { RATE_LIMIT } from "@/constants";

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Detik sampai boleh coba lagi (hanya ada saat !allowed). */
  retryAfter?: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.WINDOW_MS;

  // Rapikan entri lama & bersih-bersih berkala agar memory tidak bengkak.
  if (hits.size > 5_000) {
    for (const [key, list] of hits) {
      const fresh = list.filter((t) => t > windowStart);
      if (fresh.length === 0) hits.delete(key);
      else hits.set(key, fresh);
    }
  }

  const list = (hits.get(ip) ?? []).filter((t) => t > windowStart);

  // 1) Cooldown antar submit dari IP yang sama.
  const last = list[list.length - 1];
  if (last) {
    const elapsedSec = (now - last) / 1000;
    if (elapsedSec < RATE_LIMIT.COOLDOWN_SECONDS) {
      return {
        allowed: false,
        retryAfter: Math.ceil(RATE_LIMIT.COOLDOWN_SECONDS - elapsedSec),
      };
    }
  }

  // 2) Batas jumlah submit per window.
  if (list.length >= RATE_LIMIT.MAX_PER_WINDOW) {
    return {
      allowed: false,
      retryAfter: Math.ceil((list[0] + RATE_LIMIT.WINDOW_MS - now) / 1000),
    };
  }

  list.push(now);
  hits.set(ip, list);
  return { allowed: true };
}

/** Ambil IP klien dari header request (Vercel memakai x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
