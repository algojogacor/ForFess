import { SITE_URL } from "@/constants";
import { buildMenfessCaption } from "@/lib/caption";
import {
  uploadImage,
  deleteMedia,
  ensureStaticSlide2Url,
} from "@/lib/cloudinary";
import { renderMenfessCard, renderCoverCard } from "@/lib/generate-image";
import {
  createCarouselItem,
  createCarouselVideoItem,
  createCarouselContainer,
  waitForContainer,
  publishMedia,
  getPermalink,
  InstagramError,
} from "@/lib/instagram";
import type { PostTheme } from "@/lib/post-template";

export interface PublishCarouselPayload {
  ticketCode: string;
  category: string;
  theme: PostTheme;
  content: string;
  coverTitle?: string | null;
  coverStyle?: "brutalist" | "glass" | null;
  aspectRatio?: "4:5" | "1:1" | null;
  coverImage?: { url: string; publicId: string } | null;
  mediaItems?: Array<{ url: string; publicId: string; type: "image" | "video" }> | null;
  dryRun?: boolean;
}

export interface PublishCarouselResult {
  mediaId: string;
  permalink?: string;
}

/**
 * Mesin utama publikasi Carousel Instagram Fess UNERR.
 * Mendukung postingan teks murni maupun postingan dengan media (foto/video).
 * Menjamin pembersihan otomatis file sementara di Cloudinary (0 MB storage footprint).
 */
export async function publishMenfessCarousel(
  payload: PublishCarouselPayload
): Promise<PublishCarouselResult> {
  const {
    ticketCode,
    category,
    theme,
    content,
    coverTitle,
    coverStyle,
    aspectRatio,
    coverImage,
    mediaItems,
    dryRun = false,
  } = payload;

  if (dryRun) {
    return {
      mediaId: "dry_run",
      permalink: "https://instagram.com/dry-run",
    };
  }

  const generatedCardCleanups: Array<{ publicId: string; type: "image" | "video" }> = [];
  const childIds: string[] = [];

  try {
    const hasMedia = Array.isArray(mediaItems) && mediaItems.length > 0;

    if (hasMedia) {
      // ---- 1. SLIDE 1: COVER CARD ----
      const coverImgUrl = coverImage?.url || mediaItems[0].url;
      const coverPng = await renderCoverCard({
        title: coverTitle || "FESS UNERR",
        imageDataUri: coverImgUrl,
        style: coverStyle || "brutalist",
        aspectRatio: aspectRatio || "4:5",
        ticketCode,
        category,
      });

      const coverUpload = await uploadImage(coverPng);
      generatedCardCleanups.push({ publicId: coverUpload.publicId, type: "image" });

      const coverChildId = await createCarouselItem(coverUpload.url);
      childIds.push(coverChildId);

      // ---- 2. SLIDE 2..N: MEDIA ASLI (FOTO / VIDEO) ----
      for (const item of mediaItems) {
        if (item.type === "video") {
          const videoChildId = await createCarouselVideoItem(item.url);
          childIds.push(videoChildId);
        } else {
          const imgChildId = await createCarouselItem(item.url);
          childIds.push(imgChildId);
        }
      }

      // ---- 3. SLIDE N+1: KARTU TEKS CERITA LENGKAP (OPSIONAL) ----
      if (content && content.trim().length >= 2) {
        const storyPng = await renderMenfessCard(content, {
          categoryId: category,
          ticketCode,
          theme,
        });
        const storyUpload = await uploadImage(storyPng);
        generatedCardCleanups.push({ publicId: storyUpload.publicId, type: "image" });

        const storyChildId = await createCarouselItem(storyUpload.url);
        childIds.push(storyChildId);
      }
    } else {
      // ---- MODE TEKS MURNI (SLIDE 1 KARTU TEKS) ----
      const png = await renderMenfessCard(content, {
        categoryId: category,
        ticketCode,
        theme,
      });
      const upload = await uploadImage(png);
      generatedCardCleanups.push({ publicId: upload.publicId, type: "image" });

      const textChildId = await createCarouselItem(upload.url);
      childIds.push(textChildId);
    }

    // ---- SLIDE TERAKHIR: QR CODE / CTA PENUTUP ----
    const qrUrl = await ensureStaticSlide2Url();
    const qrChildId = await createCarouselItem(qrUrl);
    childIds.push(qrChildId);

    // ---- TUNGGU SEMUA CHILD CONTAINER SELESAI (PARALEL) ----
    await Promise.all(childIds.map((id) => waitForContainer(id)));

    // ---- BUAT PARENT CAROUSEL CONTAINER DENGAN CAPTION ----
    const caption = buildMenfessCaption(content, {
      category,
      ticketCode,
      siteUrl: SITE_URL,
      coverTitle: coverTitle ?? undefined,
    });

    const carouselCreationId = await createCarouselContainer(childIds, caption);
    await waitForContainer(carouselCreationId);

    // ---- TERBITKAN POSTINGAN KE FEED ----
    const mediaId = await publishMedia(carouselCreationId);
    const permalink = await getPermalink(mediaId);

    // ---- PEMBERSIHAN FILE ASLI USER DARI CLOUDINARY ----
    // HANYA dipanggil setelah postingan 100% SUKSES terbit di Instagram!
    // Jika belum terbit (masuk antrean / gagal coba ulang), file tetap utuh di Cloudinary.
    if (hasMedia && mediaItems) {
      Promise.allSettled(
        mediaItems.map((item) => deleteMedia(item.publicId, item.type))
      ).catch(() => {});
    }

    return { mediaId, permalink };
  } catch (err) {
    const ig = err instanceof InstagramError ? err : null;
    console.error(
      `[publish-carousel] Gagal publikasi tiket NO.${ticketCode}:`,
      ig?.message ?? err
    );
    throw err;
  } finally {
    // Kartu yang di-generate server (Cover PNG & Text PNG) selalu dibersihkan
    // karena bisa di-render ulang kapan saja jika butuh coba lagi.
    Promise.allSettled(
      generatedCardCleanups.map((c) => deleteMedia(c.publicId, c.type))
    ).catch(() => {});
  }
}
