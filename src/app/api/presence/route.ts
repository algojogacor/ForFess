import { NextRequest, NextResponse } from "next/server";
import { getOnlineCount, pingPresence } from "@/lib/presence";

export const runtime = "nodejs";

export interface PresenceResponse {
  ok: boolean;
  online: number;
}

export async function GET() {
  const online = await getOnlineCount();
  return NextResponse.json<PresenceResponse>(
    { ok: true, online },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

    const online = await pingPresence(sessionId);
    return NextResponse.json<PresenceResponse>(
      { ok: true, online },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    const online = await getOnlineCount();
    return NextResponse.json<PresenceResponse>(
      { ok: true, online },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
