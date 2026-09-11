/**
 * Template kartu menfess 1080x1080 — SINGLE SOURCE OF TRUTH.
 * Dipakai dua kali:
 *  - generate-image.ts  → object ini diberikan langsung ke Satori (server)
 *  - PostPreview.tsx    → CSS container query (cqw) persis dimensi 1080x1080 (client)
 * Jadi preview di form & beranda 100% identik dengan hasil posting di Instagram.
 */
import { SITE_URL_SHORT } from "@/constants";

/* == Tema Warna Kartu == */

export const POST_THEMES = ["klasik", "kuning", "gelap", "tinta"] as const;
export type PostTheme = (typeof POST_THEMES)[number];

export function isPostTheme(value: unknown): value is PostTheme {
  return (
    typeof value === "string" &&
    (POST_THEMES as readonly string[]).includes(value)
  );
}

export interface PostThemeColors {
  /** Latar kanvas (kertas). */
  paper: string;
  /** Tinta utama: teks menfess, judul, garis tebal. */
  ink: string;
  /** Tinta lembut: tanggal, subtitle, watermark. */
  inkSoft: string;
  /** Garis tipis pemisah footer. */
  line: string;
  /** Warna stempel ANONIM (border + teks). */
  accent: string;
  /** Latar chip logo `*` di header. */
  chipBg: string;
  /** Warna tanda `*` di dalam chip. */
  chipText: string;
  /** Latar stempel ANONIM — null = transparan. */
  stampBg: string | null;
  /** Warna asterisk raksasa samar (rgba). */
  watermark: string;
}

export const POST_THEME_COLORS: Record<PostTheme, PostThemeColors> = {
  klasik: {
    paper: "#F8F3E9",
    ink: "#1B1710",
    inkSoft: "rgba(27, 23, 16, 0.64)",
    line: "rgba(27, 23, 16, 0.14)",
    accent: "#E8481C",
    chipBg: "#E8481C",
    chipText: "#F8F3E9",
    stampBg: null,
    watermark: "rgba(232, 72, 28, 0.07)",
  },
  kuning: {
    paper: "#F8F3E9",
    ink: "#1B1710",
    inkSoft: "rgba(27, 23, 16, 0.64)",
    line: "rgba(27, 23, 16, 0.14)",
    accent: "#1B1710",
    chipBg: "#F7DE4E",
    chipText: "#1B1710",
    stampBg: "#F7DE4E",
    watermark: "rgba(247, 222, 78, 0.3)",
  },
  gelap: {
    paper: "#1E1C19",
    ink: "#F9F6F0",
    inkSoft: "rgba(249, 246, 240, 0.72)",
    line: "rgba(249, 246, 240, 0.22)",
    accent: "#FFC800",
    chipBg: "#FFC800",
    chipText: "#100F0D",
    stampBg: null,
    watermark: "rgba(255, 200, 0, 0.09)",
  },
  tinta: {
    paper: "#F8F3E9",
    ink: "#1B1710",
    inkSoft: "rgba(27, 23, 16, 0.64)",
    line: "rgba(27, 23, 16, 0.14)",
    accent: "#1B1710",
    chipBg: "#1B1710",
    chipText: "#F8F3E9",
    stampBg: null,
    watermark: "rgba(27, 23, 16, 0.06)",
  },
};

export interface PostThemePalette {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  stamp: string;
  chipBg: string;
  chipText: string;
  line: string;
  corner: string;
}

export const POST_THEME_PALETTES: Record<PostTheme, PostThemePalette> = {
  klasik: {
    bg: POST_THEME_COLORS.klasik.paper,
    ink: POST_THEME_COLORS.klasik.ink,
    accent: POST_THEME_COLORS.klasik.accent,
    muted: POST_THEME_COLORS.klasik.inkSoft,
    stamp: POST_THEME_COLORS.klasik.accent,
    chipBg: POST_THEME_COLORS.klasik.chipBg,
    chipText: POST_THEME_COLORS.klasik.chipText,
    line: POST_THEME_COLORS.klasik.line,
    corner: POST_THEME_COLORS.klasik.inkSoft,
  },
  kuning: {
    bg: POST_THEME_COLORS.kuning.paper,
    ink: POST_THEME_COLORS.kuning.ink,
    accent: POST_THEME_COLORS.kuning.accent,
    muted: POST_THEME_COLORS.kuning.inkSoft,
    stamp: POST_THEME_COLORS.kuning.accent,
    chipBg: POST_THEME_COLORS.kuning.chipBg,
    chipText: POST_THEME_COLORS.kuning.chipText,
    line: POST_THEME_COLORS.kuning.line,
    corner: POST_THEME_COLORS.kuning.inkSoft,
  },
  gelap: {
    bg: POST_THEME_COLORS.gelap.paper,
    ink: POST_THEME_COLORS.gelap.ink,
    accent: POST_THEME_COLORS.gelap.accent,
    muted: POST_THEME_COLORS.gelap.inkSoft,
    stamp: POST_THEME_COLORS.gelap.accent,
    chipBg: POST_THEME_COLORS.gelap.chipBg,
    chipText: POST_THEME_COLORS.gelap.chipText,
    line: POST_THEME_COLORS.gelap.line,
    corner: POST_THEME_COLORS.gelap.inkSoft,
  },
  tinta: {
    bg: POST_THEME_COLORS.tinta.paper,
    ink: POST_THEME_COLORS.tinta.ink,
    accent: POST_THEME_COLORS.tinta.accent,
    muted: POST_THEME_COLORS.tinta.inkSoft,
    stamp: POST_THEME_COLORS.tinta.accent,
    chipBg: POST_THEME_COLORS.tinta.chipBg,
    chipText: POST_THEME_COLORS.tinta.chipText,
    line: POST_THEME_COLORS.tinta.line,
    corner: POST_THEME_COLORS.tinta.inkSoft,
  },
};

/** Metadata tema untuk pemilih tema di form. */
export const POST_THEME_META: Record<
  PostTheme,
  { label: string; desc: string; bg: string; ink: string; accent: string }
> = {
  klasik: {
    label: "Klasik",
    desc: "Kertas krem & stempel tomat",
    bg: "#F8F3E9",
    ink: "#1B1710",
    accent: "#E8481C",
  },
  kuning: {
    label: "Kuning Signal",
    desc: "Kuning cerah khas UNAIR",
    bg: "#F8F3E9",
    ink: "#1B1710",
    accent: "#F7DE4E",
  },
  gelap: {
    label: "Gelap",
    desc: "Edisi malam kontras tinggi",
    bg: "#1E1C19",
    ink: "#F9F6F0",
    accent: "#FFC800",
  },
  tinta: {
    label: "Tinta",
    desc: "Monokrom koran cetak",
    bg: "#F8F3E9",
    ink: "#1B1710",
    accent: "#1B1710",
  },
};

export const TEMPLATE_PALETTE = POST_THEME_PALETTES.klasik;

/* == Generator Kode Tiket Unik == */

export const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTicketCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += TICKET_ALPHABET[Math.floor(Math.random() * TICKET_ALPHABET.length)];
  }
  return code;
}

export function previewTicketCode(text: string): string {
  if (text.trim().length === 0) return "····";
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i) ?? 0;
    hash = (hash * 31 + cp) | 0;
  }
  hash = Math.abs(hash);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += TICKET_ALPHABET[hash % TICKET_ALPHABET.length];
    hash = Math.floor(hash / TICKET_ALPHABET.length) + 1;
  }
  return code;
}

/* == Tipografi & Skala Kanvas == */

export const POST_CANVAS = 1080;
export const POST_PADDING = 72;

export interface TextTier {
  fontSize: number;
  lineHeight: number;
  weight: 400 | 500 | 600 | 700;
}

export function getPostTextTier(length: number): TextTier {
  if (length <= 36) return { fontSize: 88, lineHeight: 1.16, weight: 600 };
  if (length <= 80) return { fontSize: 66, lineHeight: 1.2, weight: 600 };
  if (length <= 150) return { fontSize: 54, lineHeight: 1.26, weight: 500 };
  if (length <= 260) return { fontSize: 44, lineHeight: 1.3, weight: 500 };
  if (length <= 380) return { fontSize: 38, lineHeight: 1.36, weight: 400 };
  return { fontSize: 33, lineHeight: 1.42, weight: 400 };
}

export function getTemplateFontSize(length: number): number {
  return getPostTextTier(length).fontSize;
}

export function canvasToCqw(value: number): string {
  return `${((value / POST_CANVAS) * 100).toFixed(4)}cqw`;
}

const ID_MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGU", "SEP", "OKT", "NOV", "DES"
];

export function formatPostDate(d: Date = new Date()): string {
  const day = d.getDate();
  const month = ID_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export interface TemplateFonts {
  serif?: string;
  grotesk?: string;
  mono: string;
}

export const SATORI_FONTS_REF: TemplateFonts = {
  serif: "Fraunces",
  grotesk: "Space Grotesk",
  mono: "Space Mono",
};

export const CSS_FONTS_REF: TemplateFonts = {
  serif: "var(--font-fraunces), Georgia, serif",
  grotesk: "var(--font-grotesk)",
  mono: "var(--font-spacemono)",
};

export interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, unknown>;
    children?: string | SatoriNode | (SatoriNode | string)[];
  };
}

export interface BuildTemplateOptions {
  categoryId?: string;
  ticketCode?: string;
  theme?: PostTheme;
}

/**
 * Bangun struktur kartu menfess 1080x1080 untuk Satori.
 * Single source of truth untuk render gambar Instagram.
 */
export function buildTemplateNode(
  text: string,
  fonts: TemplateFonts = SATORI_FONTS_REF,
  optionsOrCategoryId?: BuildTemplateOptions | string,
  legacyTicketCode?: string,
  legacyTheme?: PostTheme
): SatoriNode {
  let categoryId: string | undefined;
  let ticketCode: string | undefined;
  let themeKey: PostTheme = "klasik";

  if (typeof optionsOrCategoryId === "object" && optionsOrCategoryId !== null) {
    categoryId = optionsOrCategoryId.categoryId;
    ticketCode = optionsOrCategoryId.ticketCode;
    if (optionsOrCategoryId.theme && isPostTheme(optionsOrCategoryId.theme)) {
      themeKey = optionsOrCategoryId.theme;
    }
  } else if (typeof optionsOrCategoryId === "string") {
    categoryId = optionsOrCategoryId;
    ticketCode = legacyTicketCode;
    if (legacyTheme && isPostTheme(legacyTheme)) {
      themeKey = legacyTheme;
    }
  }

  const c = POST_THEME_COLORS[themeKey] ?? POST_THEME_COLORS.klasik;
  const tier = getPostTextTier(text.length);
  const effectiveTicket = ticketCode ?? previewTicketCode(text);
  const date = formatPostDate();
  const serifFont = fonts.serif ?? "Fraunces";
  const monoFont = fonts.mono ?? "Space Mono";

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1080px",
        backgroundColor: c.paper,
        color: c.ink,
        display: "flex",
        flexDirection: "column",
        padding: "72px",
        position: "relative",
      },
      children: [
        // Watermark * di pojok kanan atas
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: "30px",
              right: "-70px",
              fontFamily: serifFont,
              fontWeight: 600,
              fontSize: "520px",
              lineHeight: 1,
              color: c.watermark,
            },
            children: "*",
          },
        },
        // Header: Chip * + FESS UNAIR di kiri, Date + NO. [TICKET] di kanan
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "46px",
                          height: "46px",
                          backgroundColor: c.chipBg,
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: "18px",
                        },
                        children: {
                          type: "div",
                          props: {
                            style: {
                              fontFamily: monoFont,
                              fontWeight: 700,
                              fontSize: "34px",
                              color: c.chipText,
                              paddingBottom: "6px",
                            },
                            children: "*",
                          },
                        },
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: monoFont,
                          fontWeight: 700,
                          fontSize: "30px",
                          letterSpacing: "7px",
                          color: c.ink,
                        },
                        children: "FESS UNAIR",
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: monoFont,
                    fontWeight: 400,
                    fontSize: "26px",
                    letterSpacing: "2px",
                    color: c.inkSoft,
                  },
                  children: `${date} · NO. ${effectiveTicket}`,
                },
              },
            ],
          },
        },
        // Garis pemisah header
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              height: "3px",
              backgroundColor: c.ink,
              marginTop: "30px",
            },
          },
        },
        // Body: teks menfess
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              overflow: "hidden",
            },
            children: {
              type: "div",
              props: {
                style: {
                  fontFamily: serifFont,
                  fontWeight: tier.weight,
                  fontSize: `${tier.fontSize}px`,
                  lineHeight: tier.lineHeight,
                  color: c.ink,
                  letterSpacing: "-0.4px",
                  width: "100%",
                  maxWidth: "936px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                },
                children: text,
              },
            },
          },
        },
        // Garis pemisah footer
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              height: "2px",
              backgroundColor: c.line,
              marginBottom: "26px",
            },
          },
        },
        // Footer: handle + web url di kiri, stempel ANONIM di kanan
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: monoFont,
                          fontWeight: 700,
                          fontSize: "27px",
                          letterSpacing: "1px",
                          color: c.ink,
                        },
                        children: "@fess_unair",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: monoFont,
                          fontWeight: 400,
                          fontSize: "24px",
                          letterSpacing: "1px",
                          color: c.inkSoft,
                          marginTop: "6px",
                        },
                        children: SITE_URL_SHORT,
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    border: `4px dashed ${c.accent}`,
                    backgroundColor: c.stampBg ?? "transparent",
                    borderRadius: "10px",
                    padding: "10px 22px",
                  },
                  children: {
                    type: "div",
                    props: {
                      style: {
                        fontFamily: monoFont,
                        fontWeight: 700,
                        fontSize: "27px",
                        letterSpacing: "6px",
                        color: c.accent,
                      },
                      children: "ANONIM",
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export interface BuildSlide2Options {
  qrDataUri: string;
  theme?: PostTheme;
}

/**
 * Bangun struktur kartu slide ke-2 (statis QR + CTA) 1080x1080 untuk Satori.
 * Menghasilkan kartu carousel dengan nuansa visual identik:
 * latar kertas krem, tipografi Fraunces serif, monospace Space Mono,
 * aksen hijau tua (#1B4332), dan QR code fess-unair.vercel.app.
 */
export function buildSlide2TemplateNode(
  options: BuildSlide2Options,
  fonts: TemplateFonts = SATORI_FONTS_REF
): SatoriNode {
  const themeKey = options.theme && isPostTheme(options.theme) ? options.theme : "klasik";
  const c = POST_THEME_COLORS[themeKey] ?? POST_THEME_COLORS.klasik;
  const serifFont = fonts.serif ?? "Fraunces";
  const monoFont = fonts.mono ?? "Space Mono";
  const greenAccent = "#1B4332"; // Aksen hijau tua Fess UNAIR

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1080px",
        backgroundColor: c.paper,
        color: c.ink,
        display: "flex",
        flexDirection: "column",
        padding: "72px",
        position: "relative",
      },
      children: [
        // Watermark * di pojok kanan atas
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: "30px",
              right: "-70px",
              fontFamily: serifFont,
              fontWeight: 600,
              fontSize: "520px",
              lineHeight: 1,
              color: "rgba(27, 67, 50, 0.05)",
            },
            children: "*",
          },
        },
        // Header: Chip * + FESS UNAIR di kiri, KIRIM SEKARANG di kanan
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "46px",
                          height: "46px",
                          backgroundColor: greenAccent,
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: "18px",
                        },
                        children: {
                          type: "div",
                          props: {
                            style: {
                              fontFamily: monoFont,
                              fontWeight: 700,
                              fontSize: "34px",
                              color: c.paper,
                              paddingBottom: "6px",
                            },
                            children: "*",
                          },
                        },
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: monoFont,
                          fontWeight: 700,
                          fontSize: "30px",
                          letterSpacing: "7px",
                          color: c.ink,
                        },
                        children: "FESS UNAIR",
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    border: `2px solid ${greenAccent}`,
                    borderRadius: "8px",
                    backgroundColor: "rgba(27, 67, 50, 0.08)",
                    padding: "6px 14px",
                    fontFamily: monoFont,
                    fontWeight: 700,
                    fontSize: "20px",
                    letterSpacing: "2px",
                    color: greenAccent,
                  },
                  children: "KIRIM SEKARANG",
                },
              },
            ],
          },
        },
        // Garis pemisah header
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              height: "3px",
              backgroundColor: c.ink,
              marginTop: "30px",
            },
          },
        },
        // Body: QR Code di tengah + CTA + Subtext URL
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            },
            children: [
              // Frame QR Code (Card Neo-brutalist)
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    border: `3px solid ${c.ink}`,
                    borderRadius: "20px",
                    padding: "24px",
                    boxShadow: `8px 8px 0px ${greenAccent}`,
                  },
                  children: [
                    {
                      type: "img",
                      props: {
                        src: options.qrDataUri,
                        width: 360,
                        height: 360,
                        style: {
                          width: "360px",
                          height: "360px",
                          display: "flex",
                        },
                      },
                    },
                  ],
                },
              },
              // Teks CTA di bawah QR (Fraunces Serif)
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: serifFont,
                    fontWeight: 700,
                    fontSize: "44px",
                    color: c.ink,
                    textAlign: "center",
                    marginTop: "36px",
                    letterSpacing: "-0.5px",
                    lineHeight: 1.25,
                  },
                  children: "Kirim menfess kamu sekarang.",
                },
              },
              // Subtext URL di bawah CTA (Space Mono)
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: monoFont,
                    fontWeight: 400,
                    fontSize: "24px",
                    color: c.inkSoft,
                    letterSpacing: "1.5px",
                    textAlign: "center",
                    marginTop: "12px",
                  },
                  children: "fess-unair.vercel.app",
                },
              },
            ],
          },
        },
        // Garis pemisah footer
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              height: "2px",
              backgroundColor: c.line,
              marginBottom: "26px",
            },
          },
        },
        // Footer: handle + web url di kiri, stempel ANONIM di kanan
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: monoFont,
                          fontWeight: 700,
                          fontSize: "27px",
                          letterSpacing: "1px",
                          color: c.ink,
                        },
                        children: "@fess_unair",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: monoFont,
                          fontWeight: 400,
                          fontSize: "24px",
                          letterSpacing: "1px",
                          color: c.inkSoft,
                          marginTop: "6px",
                        },
                        children: SITE_URL_SHORT,
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    border: `4px dashed ${greenAccent}`,
                    backgroundColor: "transparent",
                    borderRadius: "10px",
                    padding: "10px 22px",
                  },
                  children: {
                    type: "div",
                    props: {
                      style: {
                        fontFamily: monoFont,
                        fontWeight: 700,
                        fontSize: "27px",
                        letterSpacing: "6px",
                        color: greenAccent,
                      },
                      children: "ANONIM",
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };
}
