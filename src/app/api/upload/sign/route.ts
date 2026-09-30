import { NextResponse } from "next/server";
import { generateUploadSignature } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      resourceType?: "image" | "video";
    };

    const resourceType = body.resourceType === "video" ? "video" : "image";
    const signData = generateUploadSignature(resourceType);

    return NextResponse.json({
      ok: true,
      ...signData,
    });
  } catch (err) {
    console.error("[upload/sign] Gagal membuat signature:", err);
    return NextResponse.json(
      { ok: false, error: "Gagal membuat otentikasi upload." },
      { status: 500 }
    );
  }
}
