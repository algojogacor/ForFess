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

/** Konfigurasi Turnstile (server side). */
export const getTurnstileConfig = () => ({
  secretKey: requireEnv("TURNSTILE_SECRET_KEY"),
});

/**
 * Site key Turnstile untuk client.
 * Nilai "placeholder_development" berarti widget TIDAK dirender di lokal —
 * form mengirim token placeholder yang tetap lolos karena secret key
 * development ("always pass"). Di produksi, isi dengan site key asli (0x...).
 */
export const getTurnstileSiteKey = (): string => {
  const raw = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const cleaned = raw.replace(/[^\x20-\x7E]/g, "").trim();
  return cleaned || "placeholder_development";
};

/** true jika widget Turnstile harus dirender di client. */
export const isTurnstileWidgetEnabled = (): boolean => {
  const key = getTurnstileSiteKey();
  return /^(0x|[0-3]x)/i.test(key) && !key.includes("placeholder");
};
