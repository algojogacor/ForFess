/**
 * Semua interaksi dengan Cloudinary: upload gambar sementara + delete.
 * PENTING: delete selalu memakai public_id yang didapat saat upload,
 * bukan URL.
 */
import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_FOLDER } from "@/constants";
import { getCloudinaryConfig } from "@/lib/config";
import { renderSlide2Card } from "@/lib/generate-image";
import type { CloudinaryUploadResult } from "@/types/menfess";

// Konfigurasi SDK cukup sekali di level modul.
const cfg = getCloudinaryConfig();
cloudinary.config({
  cloud_name: cfg.cloudName,
  api_key: cfg.apiKey,
  api_secret: cfg.apiSecret,
  secure: true,
});

/**
 * Upload buffer PNG ke Cloudinary.
 * Mengembalikan publicId (untuk delete) dan url publik (untuk Instagram).
 */
export async function uploadImage(
  pngBuffer: Buffer
): Promise<CloudinaryUploadResult> {
  const dataUri = `data:image/png;base64,${pngBuffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: CLOUDINARY_FOLDER,
    resource_type: "image",
    // Gambar ini sifatnya sekali pakai — beri tag supaya gampang di-sweep
    // kalau ada yang kelewat tidak terdelete.
    tags: [CLOUDINARY_FOLDER, "temp"],
  });

  return {
    publicId: result.public_id,
    url: result.secure_url,
  };
}

/** Hapus gambar dari Cloudinary berdasarkan public_id. Tidak melempar error — cleanup harus diam. */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (err) {
    // Gagal delete tidak boleh bikin submission user dianggap gagal.
    console.error(
      `[cloudinary] gagal delete public_id=${publicId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

let cachedSlide2Url: string | null = null;

/**
 * Pastikan gambar statis slide 2 tersedia di Cloudinary dan kembalikan URL publiknya.
 * Jika belum ada, render dan upload dengan public_id tetap (tidak dihapus).
 */
export async function ensureStaticSlide2Url(): Promise<string> {
  if (cachedSlide2Url) return cachedSlide2Url;

  const defaultUrl = `https://res.cloudinary.com/${cfg.cloudName}/image/upload/${CLOUDINARY_FOLDER}/slide2_qr_static.png`;

  try {
    const res = await fetch(defaultUrl, { method: "HEAD" });
    if (res.ok) {
      cachedSlide2Url = defaultUrl;
      return defaultUrl;
    }
  } catch {
    // Abaikan error pengecekan, lanjutkan fallback render & upload
  }

  try {
    const buffer = await renderSlide2Card("klasik");
    const dataUri = `data:image/png;base64,${buffer.toString("base64")}`;
    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: CLOUDINARY_FOLDER,
      public_id: "slide2_qr_static",
      overwrite: true,
      resource_type: "image",
      tags: [CLOUDINARY_FOLDER, "static_asset"],
    });
    cachedSlide2Url = uploadRes.secure_url;
    return uploadRes.secure_url;
  } catch (err) {
    console.error("[cloudinary] gagal upload slide2_qr_static:", err);
    return defaultUrl;
  }
}

