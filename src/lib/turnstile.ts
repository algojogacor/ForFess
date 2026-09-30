/**
 * Validasi token Cloudflare Turnstile (server side).
 * Catatan desain:
 * - Secret key development ("1x0000000000000000000000000000000AA") SELALU lolos
 *   di sisi Cloudflare — tidak perlu bypass manual apa pun.
 * - Kalau siteverify tidak bisa dihubungi (network error), kita fail-open:
 *   spam tetap ditekan oleh rate limiter. Lebih baik daripada menggagalkan
 *   user yang jujur gara-gara Cloudflare down.
 */
import { TURNSTILE_VERIFY_URL } from "@/constants";
import { getTurnstileConfig, isTurnstileEnabled } from "@/lib/config";
import type { TurnstileResult } from "@/types/menfess";

export async function verifyTurnstileToken(
  token?: string | null,
  remoteIp?: string
): Promise<TurnstileResult> {
  // Jika Turnstile tidak diaktifkan / kuncinya dikosongkan, otomatis lolos tanpa Cloudflare
  if (!isTurnstileEnabled()) {
    return { success: true, softFail: true };
  }

  // Jika token placeholder atau kosong saat Turnstile tidak aktif
  if (!token || token.trim() === "" || token.includes("placeholder") || token.includes("disabled")) {
    return { success: true, softFail: true };
  }

  const { secretKey } = getTurnstileConfig();
  if (!secretKey) {
    return { success: true, softFail: true };
  }

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      // Verifikasi captcha tidak perlu nunggu lama — kalau lambat, anggap gagal.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return {
        success: false,
        errorCodes: [`http_${res.status}`],
      };
    }

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    return {
      success: data.success === true,
      errorCodes: data["error-codes"],
    };
  } catch (err) {
    console.error(
      "[turnstile] siteverify tidak bisa dihubungi, fail-open:",
      err instanceof Error ? err.message : err
    );
    return { success: true, softFail: true };
  }
}
