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

/** Hapus gambar atau video dari Cloudinary berdasarkan public_id. */
export async function deleteMedia(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (err) {
    console.error(
      `[cloudinary] gagal delete public_id=${publicId} (${resourceType}):`,
      err instanceof Error ? err.message : err
    );
  }
}

/** Hapus gambar dari Cloudinary berdasarkan public_id. Tidak melempar error — cleanup harus diam. */
export async function deleteImage(publicId: string): Promise<void> {
  return deleteMedia(publicId, "image");
}

/**
 * Buat signature aman untuk direct upload dari browser klien ke Cloudinary.
 * Bypasses limit Vercel 4.5MB tanpa mengekspos apiSecret.
 */
export function generateUploadSignature(
  resourceType: "image" | "video" = "image"
) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = `${CLOUDINARY_FOLDER}/user_media`;
  const tags = `${CLOUDINARY_FOLDER},temp`;

  const paramsToSign: Record<string, string | number> = {
    folder,
    tags,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    cfg.apiSecret
  );

  return {
    signature,
    timestamp,
    folder,
    tags,
    apiKey: cfg.apiKey,
    cloudName: cfg.cloudName,
    resourceType,
  };
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

