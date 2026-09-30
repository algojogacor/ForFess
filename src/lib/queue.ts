import { db } from "@/lib/db";
import type { MenfessQueue, QueueStatus } from "@prisma/client";

export type { MenfessQueue, QueueStatus };

export interface EnqueueInput {
  ticketCode: string;
  content: string;
  category?: string;
  theme?: string;
  coverTitle?: string;
  coverStyle?: string;
  aspectRatio?: string;
  coverImage?: { url: string; publicId: string };
  mediaItems?: Array<{ url: string; publicId: string; type: "image" | "video" }>;
  status?: QueueStatus;
}

export interface EnqueueResult {
  id: string;
  ticketCode: string;
  queuePosition: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  published: number;
  failed: number;
  waitingApproval: number;
  total: number;
}

export interface PublicQueueItem {
  ticketCode: string;
  category: string;
  theme: string;
  createdAt: Date;
  position: number;
}

/**
 * Memasukkan menfess baru ke dalam antrean (status PENDING atau WAITING_APPROVAL).
 * Menghitung posisi antrean saat ini (1-based index).
 */
export async function enqueueMenfess(input: EnqueueInput): Promise<EnqueueResult> {
  const item = await db.menfessQueue.create({
    data: {
      ticketCode: input.ticketCode,
      content: input.content,
      category: input.category ?? "random",
      theme: input.theme ?? "klasik",
      coverTitle: input.coverTitle,
      coverStyle: input.coverStyle ?? "brutalist",
      aspectRatio: input.aspectRatio ?? "4:5",
      coverImage: input.coverImage ? JSON.stringify(input.coverImage) : null,
      mediaItems: input.mediaItems ? JSON.stringify(input.mediaItems) : null,
      status: input.status ?? "PENDING",
      scheduledFor: new Date(),
    },
  });

  const queuePosition = await db.menfessQueue.count({
    where: {
      status: "PENDING",
      createdAt: {
        lte: item.createdAt,
      },
    },
  });

  return {
    id: item.id,
    ticketCode: item.ticketCode,
    queuePosition,
  };
}

/**
 * Mengambil sekumpulan item antrean PENDING terlama yang siap diproses (scheduledFor <= now()).
 */
export async function getPendingQueueBatch(limit: number = 3): Promise<MenfessQueue[]> {
  return db.menfessQueue.findMany({
    where: {
      status: "PENDING",
      scheduledFor: {
        lte: new Date(),
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: limit,
  });
}

/**
 * Memperbarui status item menjadi PROCESSING.
 */
export async function markQueueProcessing(id: string): Promise<MenfessQueue> {
  return db.menfessQueue.update({
    where: { id },
    data: {
      status: "PROCESSING",
    },
  });
}

/**
 * Memperbarui status item menjadi PUBLISHED beserta metadata publikasi.
 */
export async function markQueuePublished(
  id: string,
  data: { permalink?: string; mediaId?: string } = {}
): Promise<MenfessQueue> {
  return db.menfessQueue.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      permalink: data.permalink,
      mediaId: data.mediaId,
      publishedAt: new Date(),
    },
  });
}

/**
 * Menandai kegagalan pemrosesan antrean.
 * Jika percobaan belum mencapai maxAttempts, dijadwalkan ulang setelah 15 menit.
 * Jika sudah mencapai maxAttempts, diubah menjadi FAILED.
 */
export async function markQueueFailed(
  id: string,
  errorMessage: string,
  maxAttempts: number = 3
): Promise<{ retried: boolean; attempts: number }> {
  const item = await db.menfessQueue.findUnique({
    where: { id },
    select: { attempts: true },
  });

  const nextAttempts = (item?.attempts ?? 0) + 1;
  const isExceeded = nextAttempts >= maxAttempts;

  if (isExceeded) {
    await db.menfessQueue.update({
      where: { id },
      data: {
        attempts: nextAttempts,
        status: "FAILED",
        lastError: errorMessage,
      },
    });
    return { retried: false, attempts: nextAttempts };
  } else {
    await db.menfessQueue.update({
      where: { id },
      data: {
        attempts: nextAttempts,
        status: "PENDING",
        lastError: errorMessage,
        scheduledFor: new Date(Date.now() + 15 * 60 * 1000), // 15 menit jeda backoff
      },
    });
    return { retried: true, attempts: nextAttempts };
  }
}

/**
 * Menghitung ringkasan statistik antrean (pending, processing, published, failed, total).
 */
export async function getQueueStats(): Promise<QueueStats> {
  const [pending, processing, published, failed, waitingApproval, total] = await Promise.all([
    db.menfessQueue.count({ where: { status: "PENDING" } }),
    db.menfessQueue.count({ where: { status: "PROCESSING" } }),
    db.menfessQueue.count({ where: { status: "PUBLISHED" } }),
    db.menfessQueue.count({ where: { status: "FAILED" } }),
    db.menfessQueue.count({ where: { status: "WAITING_APPROVAL" } }),
    db.menfessQueue.count(),
  ]);

  return {
    pending,
    processing,
    published,
    failed,
    waitingApproval,
    total,
  };
}

/**
 * Mengambil daftar item antrean publik (isi konten dirahasiakan / tidak di-select).
 * Mengembalikan array dengan posisi antrean 1-based index.
 */
export async function getPublicQueue(limit: number = 50): Promise<PublicQueueItem[]> {
  const items = await db.menfessQueue.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: {
      createdAt: "asc",
    },
    take: limit,
    select: {
      ticketCode: true,
      category: true,
      theme: true,
      createdAt: true,
    },
  });

  return items.map((item, index) => ({
    ticketCode: item.ticketCode,
    category: item.category,
    theme: item.theme,
    createdAt: item.createdAt,
    position: index + 1,
  }));
}

/**
 * Menjadwalkan ulang secara manual item yang gagal/terhenti (untuk kebutuhan admin di /status).
 */
export async function retryQueueItem(id: string): Promise<MenfessQueue> {
  return db.menfessQueue.update({
    where: { id },
    data: {
      status: "PENDING",
      scheduledFor: new Date(),
      attempts: 0,
    },
  });
}

/**
 * Menghapus entri antrean dari database (untuk kebutuhan admin).
 */
export async function deleteQueueItem(id: string): Promise<MenfessQueue> {
  return db.menfessQueue.delete({
    where: { id },
  });
}

/**
 * Menyetujui item antrean yang ditahan moderasi (mengubah status ke PENDING).
 */
export async function approveQueueItem(id: string): Promise<MenfessQueue> {
  return db.menfessQueue.update({
    where: { id },
    data: {
      status: "PENDING",
      scheduledFor: new Date(),
    },
  });
}

/**
 * Menolak item antrean yang melanggar ketentuan (menghapus dari antrean).
 */
export async function rejectQueueItem(id: string): Promise<MenfessQueue> {
  return db.menfessQueue.delete({
    where: { id },
  });
}

/**
 * Mencari item antrean berdasarkan kode tiket.
 */
export async function getQueueItemByTicket(ticketCode: string): Promise<MenfessQueue | null> {
  return db.menfessQueue.findUnique({
    where: { ticketCode },
  });
}

/**
 * Mencari item antrean berdasarkan ID unik.
 */
export async function getQueueItemById(id: string): Promise<MenfessQueue | null> {
  return db.menfessQueue.findUnique({
    where: { id },
  });
}
