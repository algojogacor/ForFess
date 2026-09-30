/**
 * Akses environment variable terpusat + validasi saat startup.
 * Jika ada env wajib yang hilang, lempar error yang jelas menyebutkan
 * nama variabelnya — jangan biarkan aplikasi jalan setengah-setengah.
 */

class MissingEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `Environment variable wajib tidak ditemukan: ${missing.join(", ")}. ` +
        `Lengkapi di .env.local (lokal) atau dashboard Vercel (produksi).`
    );
    this.name = "MissingEnvError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    // Saat fase build Next.js (prerender page data), berikan placeholder aman
    // agar kompilasi build berhasil tanpa membocorkan atau membutuhkan rahasia runtime.
    if (
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.npm_lifecycle_event === "build"
    ) {
      return `placeholder_${name.toLowerCase()}`;
    }
    // Throw saat runtime aktif agar developer/admin tahu variabel belum diisi.
    throw new MissingEnvError([name]);
  }
  return value.trim();
}

/** true jika mode dry-run aktif (tidak upload Cloudinary / posting IG). */
export const isDryRun = (): boolean =>
  process.env.MENFESS_DRY_RUN === "true";

/** Konfigurasi Instagram Graph API. */
export const getInstagramConfig = () => ({
  userId: requireEnv("IG_USER_ID"),
  accessToken: requireEnv("IG_ACCESS_TOKEN"),
});

/** Konfigurasi Cloudinary. */
export const getCloudinaryConfig = () => ({
  cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
  apiKey: requireEnv("CLOUDINARY_API_KEY"),
  apiSecret: requireEnv("CLOUDINARY_API_SECRET"),
});

/**
 * Konfigurasi Turnstile (server side).
 * Kunci bersifat opsional: jika dikosongkan, verifikasi Turnstile dinonaktifkan (bypass).
 */
export const getTurnstileConfig = () => ({
  secretKey: (process.env.TURNSTILE_SECRET_KEY ?? "").replace(/[^\x20-\x7E]/g, "").trim(),
});

/**
 * Site key Turnstile untuk client.
 * Nilai "placeholder_development" berarti widget TIDAK dirender di client —
 * di produksi, jika ingin mengaktifkan Turnstile, isi dengan site key asli (0x...).
 */
export const getTurnstileSiteKey = (): string => {
  const raw = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const cleaned = raw.replace(/[^\x20-\x7E]/g, "").trim();
  return cleaned || "placeholder_development";
};

/**
 * true jika widget Turnstile harus dirender di client.
 * Widget hanya aktif jika site key diisi dan bukan dummy/placeholder.
 */
export const isTurnstileWidgetEnabled = (): boolean => {
  const key = getTurnstileSiteKey();
  return (
    key.length >= 10 &&
    /^(0x|[0-3]x)/i.test(key) &&
    !key.includes("placeholder")
  );
};

/**
 * true jika validasi Turnstile aktif di server.
 * Aktif HANYA jika keduanya (TURNSTILE_SECRET_KEY dan NEXT_PUBLIC_TURNSTILE_SITE_KEY)
 * telah diisi dengan kunci Cloudflare yang valid (bukan kosong, dummy, atau placeholder).
 * Jika salah satu atau keduanya dikosongkan, pipeline menfess berjalan tanpa captcha (otomatis lolos).
 */
export const isTurnstileEnabled = (): boolean => {
  const { secretKey } = getTurnstileConfig();
  if (
    !secretKey ||
    secretKey.length < 10 ||
    !/^(0x|[0-3]x)/i.test(secretKey) ||
    secretKey.startsWith("placeholder")
  ) {
    return false;
  }
  return isTurnstileWidgetEnabled();
};


