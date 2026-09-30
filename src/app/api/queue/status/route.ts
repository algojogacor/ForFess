import { NextResponse } from "next/server";
import { getPublicQueue, getQueueStats } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stats, items] = await Promise.all([
      getQueueStats(),
      getPublicQueue(50),
    ]);

    const now = new Date();
    const nextRun = new Date(now.getTime());
    nextRun.setMinutes(0, 0, 0);
    nextRun.setHours(nextRun.getHours() + 1);

    return NextResponse.json(
      {
        ok: true,
        pendingCount: stats.pending,
        totalProcessed: stats.published,
        items,
        estimatedNextRun: nextRun.toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[QUEUE_STATUS_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Gagal mengambil status antrean",
        pendingCount: 0,
        totalProcessed: 0,
        items: [],
        estimatedNextRun: null,
      },
      { status: 500 }
    );
  }
}
