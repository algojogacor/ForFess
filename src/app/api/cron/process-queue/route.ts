import { NextResponse, type NextRequest } from "next/server";
import { IG_QUOTA_BUFFER, SITE_URL } from "@/constants";
import { isDryRun } from "@/lib/config";
import { renderMenfessCard } from "@/lib/generate-image";
import { uploadImage, deleteImage, ensureStaticSlide2Url } from "@/lib/cloudinary";
import {
  checkLimit,
  createCarouselItem,
  createCarouselContainer,
  waitForContainer,
  publishMedia,
  getPermalink,
} from "@/lib/instagram";
import { isPostTheme } from "@/lib/post-template";
import { buildMenfessCaption } from "@/lib/caption";
import {
  getPendingQueueBatch,
  markQueueProcessing,
  markQueuePublished,
  markQueueFailed,
} from "@/lib/queue";
import {
  STATUS_COOKIE_NAME,
  getExpectedStatusPin,
  verifyStatusAuthToken,
} from "@/lib/status-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Validasi otorisasi request:
 * 1) Header `authorization === Bearer ${process.env.CRON_SECRET}` (jika CRON_SECRET terpasang)
 * 2) Cookie `STATUS_COOKIE_NAME` terverifikasi via `verifyStatusAuthToken(token)`
 * 3) Header `x-admin-pin === getExpectedStatusPin()`
 * 4) Di non-produksi (`NODE_ENV !== "production"`), jika CRON_SECRET tidak diset, izinkan untuk mempermudah testing lokal
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`) {
    return true;
  }

  let cookieToken: string | undefined;
  if (request.cookies && typeof request.cookies.get === "function") {
    cookieToken = request.cookies.get(STATUS_COOKIE_NAME)?.value;
  }
  if (!cookieToken) {
    const rawCookie = request.headers.get("cookie");
    if (rawCookie) {
      const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${STATUS_COOKIE_NAME}=([^;]*)`));
      if (match) {
        cookieToken = decodeURIComponent(match[1]);
      }
    }
  }
  if (cookieToken && verifyStatusAuthToken(cookieToken)) {
    return true;
  }

  const pinHeader = request.headers.get("x-admin-pin");
  if (pinHeader && pinHeader === getExpectedStatusPin()) {
    return true;
  }

  if (process.env.NODE_ENV !== "production" && !cronSecret) {
    return true;
  }

  return false;
}

/**
 * Worker handler internal untuk memproses antrean menfess (FIFO)
 */
async function handleProcessQueue(request: NextRequest) {
  // 0. Autentikasi
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Quota Check
    let availableQuota = 3;
    try {
      const quota = await checkLimit();
      if (quota.remaining <= IG_QUOTA_BUFFER) {
        return NextResponse.json({
          ok: true,
          message: `Kuota Instagram belum tersedia (sisa: ${quota.remaining}, buffer: ${IG_QUOTA_BUFFER})`,
          processed: 0,
        });
      }
      availableQuota = Math.max(0, quota.remaining - IG_QUOTA_BUFFER);
    } catch (err) {
      console.warn(
        "[process-queue] Gagal cek kuota Instagram, lanjut:",
        err instanceof Error ? err.message : err
      );
    }

    // 2. Batch Retrieval
    const batchLimit = Math.min(availableQuota, 3);
    if (batchLimit <= 0) {
      return NextResponse.json({
        ok: true,
        message: `Kuota Instagram belum tersedia (sisa: 0, buffer: ${IG_QUOTA_BUFFER})`,
        processed: 0,
      });
    }

    const items = await getPendingQueueBatch(batchLimit);
    if (items.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Tidak ada antrean menfess yang siap diproses saat ini.",
        processed: 0,
      });
    }

    // 3. Processing Loop (FIFO)
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let publicId: string | null = null;
      try {
        await markQueueProcessing(item.id);

        const theme = isPostTheme(item.theme) ? item.theme : "klasik";
        const png = await renderMenfessCard(item.content, {
          categoryId: item.category,
          ticketCode: item.ticketCode,
          theme,
        });

        if (isDryRun()) {
          await markQueuePublished(item.id, {
            permalink: "https://instagram.com/dry-run",
            mediaId: "dry_run",
          });
          successCount++;
        } else {
          const uploadRes = await uploadImage(png);
          publicId = uploadRes.publicId;
          const imageUrl = uploadRes.url;

          const slide2Url = await ensureStaticSlide2Url();

          const [slide1ChildId, slide2ChildId] = await Promise.all([
            createCarouselItem(imageUrl),
            createCarouselItem(slide2Url),
          ]);

          await Promise.all([
            waitForContainer(slide1ChildId),
            waitForContainer(slide2ChildId),
          ]);

          const caption = buildMenfessCaption(item.content, {
            category: item.category,
            ticketCode: item.ticketCode,
            siteUrl: SITE_URL,
          });

          const carouselContainerId = await createCarouselContainer(
            [slide1ChildId, slide2ChildId],
            caption
          );

          await waitForContainer(carouselContainerId);

          const mediaId = await publishMedia(carouselContainerId);
          const permalink = await getPermalink(mediaId);

          await deleteImage(publicId).catch(() => {});
          publicId = null;

          await markQueuePublished(item.id, { permalink, mediaId });
          successCount++;
        }
      } catch (err) {
        if (publicId) {
          await deleteImage(publicId).catch(() => {});
        }
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[process-queue] Gagal memproses antrean ${item.id} (NO.${item.ticketCode}):`,
          errMsg
        );
        await markQueueFailed(item.id, errMsg);
        failedCount++;
      }

      if (i < items.length - 1) {
        const paceMs = process.env.QUEUE_PACE_MS
          ? Number(process.env.QUEUE_PACE_MS)
          : 6000;
        await new Promise((r) => setTimeout(r, paceMs));
      }
    }

    // 4. Return summary
    return NextResponse.json({
      ok: true,
      message: `Selesai memproses ${items.length} antrean: ${successCount} sukses, ${failedCount} gagal.`,
      processed: items.length,
      success: successCount,
      failed: failedCount,
    });
  } catch (err) {
    console.error("[process-queue] Fatal error saat memproses antrean:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Terjadi kesalahan pada worker antrean",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleProcessQueue(request);
}

export async function POST(request: NextRequest) {
  return handleProcessQueue(request);
}
