"use client";

import {
  POST_THEMES,
  POST_THEME_META,
  type PostTheme,
} from "@/lib/post-template";
import { cn } from "@/lib/utils";

/**
 * Pemilih tema kartu menfess — pilihan varian warna Satori / Preview.
 * Menggunakan semantik radio group asli (input radio sr-only + label)
 * agar ramah keyboard (Tab + Spasi/Enter) dan screen reader (WCAG AA).
 */
export function ThemePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: PostTheme;
  onChange: (theme: PostTheme) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="rounded-2xl border-2 border-ink bg-paper-raised p-4 sm:p-5"
    >
      <legend className="px-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink-soft">
        Warna Kartu{" "}
        <span className="font-normal normal-case tracking-normal text-ink-faint">
          · varian gambar
        </span>
      </legend>

      <div className="mt-1 flex flex-wrap gap-2.5" role="presentation">
        {POST_THEMES.map((themeKey) => {
          const meta = POST_THEME_META[themeKey];
          const checked = value === themeKey;

          return (
            <label
              key={themeKey}
              title={meta.desc}
              className={cn(
                "group relative inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-150",
                "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--hard-soft)]",
                "focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2",
                checked
                  ? "bg-paper-contrast text-paper-contrast-ink shadow-[3px_3px_0_0_var(--hard-soft)]"
                  : "bg-paper text-ink",
                disabled && "pointer-events-none opacity-60"
              )}
            >
              {/* Radio asli sr-only */}
              <input
                type="radio"
                name="menfess-theme"
                value={themeKey}
                checked={checked}
                onChange={() => onChange(themeKey)}
                className="sr-only"
              />

              {/* Swatch warna mini lingkaran */}
              <span
                aria-hidden
                className="flex size-4 items-center justify-center rounded-full border border-ink shadow-xs"
                style={{ backgroundColor: meta.bg }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: meta.accent }}
                />
              </span>

              <span>{meta.label}</span>
            </label>
          );
        })}
      </div>

      <p className="mt-2.5 text-[12px] leading-relaxed text-ink-faint">
        {POST_THEME_META[value]?.desc ??
          "Pilih varian warna untuk kartu gambar Instagram kamu."}
      </p>
    </fieldset>
  );
}
