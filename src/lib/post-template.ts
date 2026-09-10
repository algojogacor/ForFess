/**
 * Template kartu menfess 1080x1080 — SINGLE SOURCE OF TRUTH.
 * Dipakai dua kali:
 *  - generate-image.ts  → object ini diberikan langsung ke Satori (server)
 *  - PostPreview.tsx    → object ini di-render sebagai elemen React (client)
 * Jadi preview di /kirim 100% identik dengan hasil post di Instagram.
 *
 * Format object mengikuti struktur node Satori: { type, props: { style, children } }.
 * Satori hanya support subset CSS — flexbox, borderColor, transform rotate, dst.
 */
import { IG_HANDLE, SITE_HOST } from "@/constants";

// Palet template — konsisten dengan identitas situs (globals.css).
export const TEMPLATE_PALETTE = {
  bg: "#F7F2E8", // kertas krem
  ink: "#161310", // tinta
  yellow: "#FFC800", // kuning signal
  muted: "#776D5B", // abu hangat
} as const;

export interface TemplateFonts {
  /** Nama font utama (Satori) atau CSS var (client). */
  grotesk: string;
  /** Nama font mono (Satori) atau CSS var (client). */
  mono: string;
}

/** Font untuk Satori (nama terdaftar di generate-image.ts). */
export const SATORI_FONTS_REF: TemplateFonts = {
  grotesk: "Space Grotesk",
  mono: "Space Mono",
};

/** Font untuk preview HTML (CSS variable dari next/font/local). */
export const CSS_FONTS_REF: TemplateFonts = {
  grotesk: "var(--font-grotesk)",
  mono: "var(--font-spacemono)",
};

interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, unknown>;
    children?: string | SatoriNode[];
  };
}

/** Tanda "+" kecil di sudut kartu — aksen zine. */
function cornerMark(x: string, y: string): SatoriNode {
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: "18px",
        height: "18px",
        display: "flex",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: "100%",
              height: "4px",
              backgroundColor: TEMPLATE_PALETTE.muted,
              marginTop: "7px",
            },
          },
        },
      ],
    },
  };
}

/** Bangun struktur kartu menfess. `text` sudah melalui validasi panjang. */
export function buildTemplateNode(text: string, fonts: TemplateFonts): SatoriNode {
  // Teks pendek tampil tebal (headline), teks panjang medium agar nyaman dibaca.
  const fontWeight = text.length <= 90 ? 700 : 500;
  const fontSize = getTemplateFontSize(text.length);

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1080px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: TEMPLATE_PALETTE.bg,
        padding: "78px",
        position: "relative",
        fontFamily: fonts.grotesk,
      },
      children: [
        // --- header: chip logo + label ---
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    backgroundColor: TEMPLATE_PALETTE.ink,
                    padding: "16px 28px",
                    borderRadius: "16px",
                    transform: "rotate(-2deg)",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          color: TEMPLATE_PALETTE.yellow,
                          fontSize: "34px",
                          fontWeight: 700,
                          letterSpacing: "1px",
                        },
                        children: "FESS*UNAIR",
                      },
                    },
                  ],
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: fonts.mono,
                    fontSize: "24px",
                    color: TEMPLATE_PALETTE.muted,
                    letterSpacing: "4px",
                  },
                  children: "POST ANONIM",
                },
              },
            ],
          },
        },

        // --- isi menfess ---
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              marginTop: "24px",
              marginBottom: "24px",
            },
            children: [
              // aksen kuning di atas teks
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    width: "72px",
                    height: "14px",
                    backgroundColor: TEMPLATE_PALETTE.yellow,
                    marginBottom: "40px",
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.38,
                    fontWeight,
                    color: TEMPLATE_PALETTE.ink,
                    letterSpacing: "-0.5px",
                  },
                  children: text,
                },
              },
            ],
          },
        },

        // --- footer: garis tinta + watermark ---
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    height: "5px",
                    backgroundColor: TEMPLATE_PALETTE.ink,
                    marginBottom: "30px",
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          fontSize: "31px",
                          fontWeight: 700,
                          color: TEMPLATE_PALETTE.ink,
                        },
                        children: IG_HANDLE,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          fontFamily: fonts.mono,
                          fontSize: "24px",
                          color: TEMPLATE_PALETTE.muted,
                        },
                        children: SITE_HOST,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // aksen sudut
        cornerMark("28px", "28px"),
        cornerMark("1034px", "28px"),
        cornerMark("28px", "1034px"),
        cornerMark("1034px", "1034px"),
      ],
    },
  };
}

/** Ukuran font konten (px) berdasarkan panjang teks — sama dengan IMAGE_FONT_TIERS. */
export function getTemplateFontSize(length: number): number {
  const tiers: Array<[number, number]> = [
    [30, 84],
    [90, 68],
    [180, 54],
    [300, 44],
    [400, 38],
    [Number.MAX_SAFE_INTEGER, 33],
  ];
  for (const [maxLen, size] of tiers) {
    if (length <= maxLen) return size;
  }
  return 33;
}
