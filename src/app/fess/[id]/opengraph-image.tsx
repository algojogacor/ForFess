/**
 * OG image per kartu — /fess/[id]/opengraph-image
 * Dipakai saat link satu menfess dibagikan di chat/story: kartunya
 * dirender sebagai gambar 1200×630 dengan teks menfess asli.
 *
 * Data diambil lewat getMediaCached (cache sama dengan halaman).
 * Kalau post tidak ada / API gagal → fallback OG brand generik,
 * jangan pernah 500 (crawlers tetap butuh gambar).
 */
import { ImageResponse } from "next/og";
import {
  spaceGroteskBoldBase64,
  spaceGroteskRegularBase64,
  spaceMonoRegularBase64,
} from "@/lib/fonts.generated";
import { getMediaCached } from "@/lib/media-lookup";
import { excerptFromCaption } from "@/lib/caption";
import { IG_HANDLE } from "@/constants";

export const runtime = "nodejs";
export const alt = "Kartu menfess anonim — Fess UNAIR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function decodeFont(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Ukuran font teks menfess di OG berdasarkan panjang — mirip tier kartu IG. */
function fontTier(len: number): number {
  if (len <= 40) return 64;
  if (len <= 100) return 54;
  if (len <= 200) return 44;
  if (len <= 350) return 36;
  return 30;
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let text = "";
  try {
    const media = await getMediaCached(id);
    text = excerptFromCaption(media.caption, 400);
  } catch {
    /* fallback ke OG brand di bawah */
  }

  const groteskBold = decodeFont(spaceGroteskBoldBase64);
  const groteskRegular = decodeFont(spaceGroteskRegularBase64);
  const monoRegular = decodeFont(spaceMonoRegularBase64);

  // ==== Fallback: OG brand (post tidak ditemukan / API gagal) ====
  if (!text) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundColor: "#FFC800",
            border: "6px solid #161310",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 220,
              color: "#161310",
              fontFamily: "Space Grotesk",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            *
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              color: "#161310",
              fontFamily: "Space Grotesk",
            }}
          >
            Fess UNAIR
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#161310",
              fontFamily: "Space Mono",
            }}
          >
            kartu nggak ditemukan · {IG_HANDLE}
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: "Space Grotesk", data: groteskBold, weight: 700, style: "normal" },
          { name: "Space Mono", data: monoRegular, weight: 400, style: "normal" },
        ],
      }
    );
  }

  // ==== OG kartu menfess: kertas krem + teks asli ====
  const fontSize = fontTier(text.length);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#F7F2E8",
          padding: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            border: "4px solid #161310",
            borderRadius: 28,
            overflow: "hidden",
            flexDirection: "column",
          }}
        >
          {/* Header strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "26px 44px",
              borderBottom: "3px dashed rgba(22,19,16,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  width: 46,
                  height: 46,
                  backgroundColor: "#161310",
                  color: "#FFC800",
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "Space Grotesk",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                *
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#161310",
                  fontFamily: "Space Grotesk",
                }}
              >
                Fess UNAIR
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: "#776D5B",
                fontFamily: "Space Mono",
              }}
            >
              post anonim
            </div>
          </div>

          {/* Isi menfess */}
          <div
            style={{
              display: "flex",
              flex: 1,
              padding: "48px 52px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize,
                lineHeight: 1.4,
                color: "#161310",
                fontFamily: "Space Grotesk",
                fontWeight: 500,
              }}
            >
              {text}
            </div>
          </div>

          {/* Footer strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px 44px",
              borderTop: "3px solid #161310",
              backgroundColor: "#FFC800",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                color: "#161310",
                fontFamily: "Space Grotesk",
              }}
            >
              {IG_HANDLE}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: "#161310",
                fontFamily: "Space Mono",
              }}
            >
              tulis menfessmu juga · tanpa nama
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: groteskBold, weight: 700, style: "normal" },
        { name: "Space Grotesk", data: groteskRegular, weight: 500, style: "normal" },
        { name: "Space Mono", data: monoRegular, weight: 400, style: "normal" },
      ],
    }
  );
}
