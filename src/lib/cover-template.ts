import type { ReactNode } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { findCategory, SITE_HOST } from "@/constants";

export type CoverStyle = "brutalist" | "glass";

export interface BuildCoverTemplateOptions {
  title: string;
  imageDataUri: string;
  style: CoverStyle;
  aspectRatio?: "4:5" | "1:1";
  ticketCode?: string;
  category?: string;
}

/**
 * Format tanggal Indonesia untuk header cover: "1 OKT 2026".
 */
function formatHeaderDate(date: Date = new Date()): string {
  try {
    return format(date, "d MMM yyyy", { locale: localeId }).toUpperCase();
  } catch {
    return "";
  }
}

/**
 * Template Satori untuk Cover Postingan Media (Foto/Video) Fess UNERR.
 * Menghasilkan JSX yang kompatibel dengan Satori untuk di-render ke SVG -> PNG.
 */
export function buildCoverTemplateNode(
  options: BuildCoverTemplateOptions
): any {
  const {
    title,
    imageDataUri,
    style,
    aspectRatio = "4:5",
    ticketCode,
    category,
  } = options;

  const width = 1080;
  const height = aspectRatio === "4:5" ? 1350 : 1080;
  const dateStr = formatHeaderDate();
  const catObj = findCategory(category ?? "");

  // ---- 1. GAYA NEO-BRUTALIST FRAME ----
  if (style === "brutalist") {
    return {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: "#F8F3E9",
          padding: "48px",
          boxSizing: "border-box",
          fontFamily: "Space Grotesk",
          position: "relative",
          justifyContent: "space-between",
        },
        children: [
          // Header atas: Brand pill + Tanggal & Tiket
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                paddingBottom: "24px",
                borderBottom: "4px solid #1B1710",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      backgroundColor: "#F25C05",
                      color: "#FFFFFF",
                      padding: "8px 20px",
                      borderRadius: "100px",
                      border: "3px solid #1B1710",
                      fontWeight: 800,
                      fontSize: "22px",
                      letterSpacing: "0.08em",
                    },
                    children: [
                      { type: "span", props: { children: "✳ FESS UNERR" } },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      fontFamily: "Space Mono",
                      fontWeight: 700,
                      fontSize: "20px",
                      color: "#1B1710",
                      letterSpacing: "0.1em",
                    },
                    children: [
                      { type: "span", props: { children: dateStr } },
                      ticketCode
                        ? {
                            type: "span",
                            props: {
                              style: {
                                backgroundColor: "#FFE500",
                                padding: "4px 12px",
                                borderRadius: "8px",
                                border: "2px solid #1B1710",
                              },
                              children: `NO. ${ticketCode}`,
                            },
                          }
                        : null,
                    ].filter(Boolean),
                  },
                },
              ],
            },
          },

          // Tengah: Kotak Foto dengan Border & Shadow Brutalist
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flex: 1,
                width: "100%",
                marginTop: "24px",
                marginBottom: "24px",
                borderRadius: "24px",
                border: "4px solid #1B1710",
                boxShadow: "10px 10px 0px 0px #1B1710",
                overflow: "hidden",
                position: "relative",
                backgroundColor: "#000000",
              },
              children: [
                {
                  type: "img",
                  props: {
                    src: imageDataUri,
                    style: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  },
                },
                catObj && catObj.id !== "bebas"
                  ? {
                      type: "div",
                      props: {
                        style: {
                          position: "absolute",
                          top: "20px",
                          left: "20px",
                          backgroundColor: "#F8F3E9",
                          border: "3px solid #1B1710",
                          borderRadius: "12px",
                          padding: "6px 16px",
                          fontWeight: 700,
                          fontSize: "18px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "4px 4px 0px 0px #1B1710",
                        },
                        children: `${catObj.emoji} ${catObj.label}`,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },

          // Bawah: Banner Judul Tebal
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                width: "100%",
                backgroundColor: "#1B1710",
                color: "#F8F3E9",
                padding: "24px 32px",
                borderRadius: "20px",
                border: "4px solid #1B1710",
                boxShadow: "6px 6px 0px 0px #F25C05",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontFamily: "Fraunces",
                      fontWeight: 800,
                      fontSize: title.length > 50 ? "36px" : "44px",
                      lineHeight: 1.2,
                      letterSpacing: "-0.02em",
                      textTransform: "uppercase",
                    },
                    children: title,
                  },
                },
              ],
            },
          },
        ],
      },
    };
  }

  // ---- 2. GAYA GLASS BLUR OVERLAY (FULL BLEED) ----
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: `${width}px`,
        height: `${height}px`,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#000000",
        fontFamily: "Space Grotesk",
        justifyContent: "space-between",
      },
      children: [
        // Foto Latar Full Bleed
        {
          type: "img",
          props: {
            src: imageDataUri,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            },
          },
        },

        // Header Atas (Semi-transparan Kaca)
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "40px",
              position: "relative",
              zIndex: 2,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    backgroundColor: "rgba(27, 23, 16, 0.85)",
                    border: "2px solid rgba(255,255,255,0.2)",
                    borderRadius: "100px",
                    padding: "10px 24px",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  },
                  children: [
                    { type: "span", props: { children: "✳ @fess_unerr" } },
                  ],
                },
              },
              ticketCode
                ? {
                    type: "div",
                    props: {
                      style: {
                        backgroundColor: "#FFE500",
                        color: "#1B1710",
                        border: "2px solid #1B1710",
                        borderRadius: "100px",
                        padding: "8px 20px",
                        fontFamily: "Space Mono",
                        fontWeight: 800,
                        fontSize: "18px",
                      },
                      children: `NO. ${ticketCode}`,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },

        // Bottom Glass Gradient Overlay + Teks Judul Besar
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              width: "100%",
              padding: "60px 48px 48px 48px",
              position: "relative",
              zIndex: 2,
              backgroundImage:
                "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0) 100%)",
            },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: "Fraunces",
                    fontWeight: 900,
                    fontSize: title.length > 50 ? "40px" : "48px",
                    lineHeight: 1.25,
                    color: "#FFFFFF",
                    textShadow: "0px 4px 12px rgba(0,0,0,0.8)",
                  },
                  children: title,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "20px",
                    paddingTop: "16px",
                    borderTop: "1px solid rgba(255,255,255,0.25)",
                    color: "rgba(255,255,255,0.75)",
                    fontFamily: "Space Mono",
                    fontSize: "16px",
                  },
                  children: [
                    { type: "span", props: { children: SITE_HOST } },
                    { type: "span", props: { children: dateStr } },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}
