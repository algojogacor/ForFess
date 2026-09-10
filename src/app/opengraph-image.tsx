/**
 * OG image dinamis (1200×630) — dipakai saat link situs dibagikan di
 * chat/story. Desainnya satu keluarga dengan kartu menfess: kertas krem,
 * tinta hampir hitam, kuning signal, motif bintang.
 *
 * Font diambil dari font WOFF base64 yang sama dengan generator kartu
 * Satori (fonts.generated.ts) — tanpa dependency filesystem.
 */
import { ImageResponse } from "next/og";
import {
  spaceGroteskBoldBase64,
  spaceGroteskRegularBase64,
  spaceMonoRegularBase64,
} from "@/lib/fonts.generated";

export const alt = "Fess UNAIR — menfess anonim buat warga UNAIR, langsung tayang di @fess_unair";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

function decodeFont(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export default async function OpengraphImage() {
  const groteskBold = decodeFont(spaceGroteskBoldBase64);
  const groteskRegular = decodeFont(spaceGroteskRegularBase64);
  const monoRegular = decodeFont(spaceMonoRegularBase64);

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
        {/* Bingkai tinta */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            border: "3px solid #161310",
            borderRadius: 28,
            overflow: "hidden",
          }}
        >
          {/* ==== Kolom kiri: identitas ==== */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1.5,
              padding: "52px 48px",
              justifyContent: "space-between",
            }}
          >
            {/* Label atas */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: "#E4572E",
                  borderRadius: 4,
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: "#4A4437",
                  fontFamily: "Space Mono",
                }}
              >
                Menfess anonim · civitas UNAIR
              </div>
            </div>

            {/* Heading */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 76,
                lineHeight: 1.05,
                fontWeight: 700,
                color: "#161310",
                fontFamily: "Space Grotesk",
                letterSpacing: -2,
              }}
            >
              <div style={{ display: "flex" }}>Ngomong aja.</div>
              <div style={{ display: "flex" }}>Nggak usah</div>
              <div style={{ display: "flex" }}>
                <span
                  style={{
                    display: "flex",
                    backgroundColor: "#FFC800",
                    padding: "0 18px",
                    borderRadius: 12,
                    border: "3px solid #161310",
                  }}
                >
                  kenal-kenalan.
                </span>
              </div>
            </div>

            {/* Handle */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: "3px solid #161310",
                  borderRadius: 14,
                  backgroundColor: "#161310",
                  padding: "12px 24px",
                  color: "#FFC800",
                  fontSize: 30,
                  fontWeight: 700,
                  fontFamily: "Space Grotesk",
                }}
              >
                <span style={{ display: "flex", color: "#FFC800" }}>*</span>
                @fess_unair
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#776D5B",
                  fontFamily: "Space Mono",
                }}
              >
                tanpa nama · tanpa login
              </div>
            </div>
          </div>

          {/* ==== Kolom kanan: kartu contoh ==== */}
          <div
            style={{
              display: "flex",
              flex: 1,
              backgroundColor: "#FFC800",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: "3px solid #161310",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 18,
                right: 30,
                display: "flex",
                fontSize: 120,
                color: "#161310",
                opacity: 0.18,
                fontFamily: "Space Grotesk",
                fontWeight: 700,
              }}
            >
              *
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 380,
                height: 380,
                backgroundColor: "#FFFDF6",
                border: "3px solid #161310",
                borderRadius: 24,
                boxShadow: "10px 10px 0 rgba(22,19,16,0.85)",
                transform: "rotate(2deg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  padding: 32,
                  fontSize: 30,
                  lineHeight: 1.35,
                  fontWeight: 400,
                  color: "#161310",
                  fontFamily: "Space Grotesk",
                }}
              >
                Lolos sidang skripsi hari ini. Makasih buat semua doa dan kopi
                yang nemenin dari awal.
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "3px dashed rgba(22,19,16,0.25)",
                  padding: "18px 28px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 20,
                    color: "#776D5B",
                    fontFamily: "Space Mono",
                  }}
                >
                  @fess_unair
                </div>
                <div
                  style={{
                    display: "flex",
                    width: 28,
                    height: 28,
                    backgroundColor: "#FFC800",
                    border: "2.5px solid #161310",
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#161310",
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "Space Grotesk",
                  }}
                >
                  *
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: groteskBold, weight: 700, style: "normal" },
        { name: "Space Grotesk", data: groteskRegular, weight: 400, style: "normal" },
        { name: "Space Mono", data: monoRegular, weight: 400, style: "normal" },
      ],
    }
  );
}
