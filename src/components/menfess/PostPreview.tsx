"use client";

import {
  POST_THEME_COLORS,
  canvasToCqw,
  formatPostDate,
  getPostTextTier,
  previewTicketCode,
  type PostTheme,
} from "@/lib/post-template";
import { SITE_URL_SHORT } from "@/constants";
import { cn } from "@/lib/utils";

/** Tanggal pratinjau — dihitung sekali per pemuatan modul. */
const PREVIEW_DATE = formatPostDate();

export function PostPreview({
  text,
  category,
  theme = "klasik",
  ticketCode: ticketOverride,
  className,
  ariaLabel,
}: {
  text: string;
  category?: string;
  theme?: PostTheme;
  ticketCode?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const c = POST_THEME_COLORS[theme] ?? POST_THEME_COLORS.klasik;
  const tier = getPostTextTier(Math.max(text.length, 1));
  const ticketCode = ticketOverride ?? previewTicketCode(text);
  const displayText = text.trim().length > 0 ? text.trim() : "Pratinjau postmu di sini…";
  const date = PREVIEW_DATE;

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden border-2 border-[#1b1710] dark:border-[#70685b] shadow-[8px_8px_0_0_#1b1710] dark:shadow-[8px_8px_0_0_rgba(255,200,0,0.35)]",
        "[container-type:inline-size]",
        className
      )}
      role="img"
      aria-label={ariaLabel ?? `Pratinjau tampilan post Instagram 1080×1080, varian ${theme}`}
    >
      <div
        className="flex h-full w-full flex-col select-none"
        style={{ padding: canvasToCqw(72), backgroundColor: c.paper }}
      >
        {/* Stempel asterisk raksasa samar — tekstur cetak */}
        <span
          aria-hidden
          className="pointer-events-none absolute select-none"
          style={{
            top: canvasToCqw(30),
            right: canvasToCqw(-70),
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontWeight: 600,
            fontSize: canvasToCqw(520),
            lineHeight: 1,
            color: c.watermark,
          }}
        >
          *
        </span>

        {/* Header */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center" style={{ gap: canvasToCqw(18) }}>
            <span
              aria-hidden
              className="flex items-center justify-center rounded-[0.93cqw]"
              style={{ width: canvasToCqw(46), height: canvasToCqw(46), backgroundColor: c.chipBg }}
            >
              <span
                className="font-mono font-bold leading-none"
                style={{ fontSize: canvasToCqw(34), paddingBottom: canvasToCqw(6), color: c.chipText }}
              >
                *
              </span>
            </span>
            <span
              className="font-mono font-bold"
              style={{
                fontSize: canvasToCqw(30),
                letterSpacing: canvasToCqw(7),
                color: c.ink,
              }}
            >
              FESS UNAIR
            </span>
          </div>
          <span
            className="font-mono"
            style={{ fontSize: canvasToCqw(26), letterSpacing: canvasToCqw(2), color: c.inkSoft }}
          >
            {date} · NO. {ticketCode}
          </span>
        </div>

        <div
          className="w-full"
          style={{ height: canvasToCqw(3), marginTop: canvasToCqw(30), backgroundColor: c.ink }}
        />

        {/* Body — teks menfess */}
        <div className="flex w-full flex-1 flex-col justify-center overflow-hidden">
          <p
            className="w-full whitespace-pre-wrap"
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontWeight: tier.weight,
              fontSize: canvasToCqw(tier.fontSize),
              lineHeight: tier.lineHeight,
              letterSpacing: "-0.04cqw",
              maxWidth: "86.67%",
              color: c.ink,
            }}
          >
            {displayText}
          </p>
        </div>

        <div
          className="w-full"
          style={{
            height: canvasToCqw(2),
            backgroundColor: c.line,
            marginBottom: canvasToCqw(26),
          }}
        />

        {/* Footer */}
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col">
            <span
              className="font-mono font-bold"
              style={{ fontSize: canvasToCqw(27), letterSpacing: canvasToCqw(1), color: c.ink }}
            >
              @fess_unair
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: canvasToCqw(24),
                letterSpacing: canvasToCqw(1),
                marginTop: canvasToCqw(6),
                color: c.inkSoft,
              }}
            >
              {SITE_URL_SHORT}
            </span>
          </div>
          {/* Stempel ANONIM — di web bisa miring, cermin cap karet */}
          <span
            className="rotate-[-7deg] rounded-[0.93cqw] border-[0.37cqw] border-dashed font-mono font-bold"
            style={{
              padding: `${canvasToCqw(10)} ${canvasToCqw(22)}`,
              fontSize: canvasToCqw(27),
              letterSpacing: canvasToCqw(6),
              borderColor: c.accent,
              color: c.accent,
              backgroundColor: c.stampBg ?? "transparent",
            }}
          >
            ANONIM
          </span>
        </div>
      </div>
    </div>
  );
}
