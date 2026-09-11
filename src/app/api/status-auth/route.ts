import { NextResponse } from "next/server";
import {
  STATUS_COOKIE_NAME,
  getExpectedStatusPin,
  getStatusAuthToken,
} from "@/lib/status-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";

    const expectedPin = getExpectedStatusPin();

    if (pin === expectedPin) {
      const token = getStatusAuthToken();
      const response = NextResponse.json({ ok: true });
      response.cookies.set(STATUS_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 hari
      });
      return response;
    }

    return NextResponse.json(
      { ok: false, message: "PIN salah. Silakan coba lagi." },
      { status: 401 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Terjadi kesalahan",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(STATUS_COOKIE_NAME);
  return response;
}
