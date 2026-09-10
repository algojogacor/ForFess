"use client";

import { MENFESS_CATEGORIES } from "@/constants";
import { cn } from "@/lib/utils";

/**
 * Pemilih kategori menfess — opsional, default "Bebas".
 * Semantik radio group asli (input radio sr-only + label) supaya
 * keyboard & screen reader jalan tanpa trik apa pun.
 *
 * Tampilan: deretan chip stempel zine — yang terpilih kuning sinyal
 * dengan hard shadow, yang lain kertas polos.
 */
export function CategoryPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="rounded-2xl border-2 border-ink bg-paper-raised p-4 sm:p-5"
    >
      <legend className="px-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink-soft">
        Kategori{" "}
        <span className="font-normal normal-case tracking-normal text-ink-faint">
          · opsional
        </span>
      </legend>

      <div className="mt-1 flex flex-wrap gap-2" role="presentation">
        {MENFESS_CATEGORIES.map((cat) => {
          const checked = value === cat.id;
          return (
            <label
              key={cat.id}
              title={cat.hint}
              className={cn(
                "group inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-150",
                "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--hard-soft)]",
                checked
                  ? "bg-signal text-ink-fixed shadow-[3px_3px_0_0_var(--hard-soft)]"
                  : "bg-paper text-ink",
                disabled && "pointer-events-none opacity-60"
              )}
            >
              {/* Radio asli — sr-only, tetap keyboard-navigable */}
              <input
                type="radio"
                name="menfess-category"
                value={cat.id}
                checked={checked}
                onChange={() => onChange(cat.id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "text-[15px] leading-none transition-transform duration-200",
                  checked && "group-hover:scale-125 group-active:scale-95"
                )}
              >
                {cat.emoji}
              </span>
              {cat.label}
            </label>
          );
        })}
      </div>

      <p className="mt-2.5 text-[12px] leading-relaxed text-ink-faint">
        {MENFESS_CATEGORIES.find((c) => c.id === value)?.hint ??
          "Pilih nuansa ceritamu — pembaca arsip bisa menyaring per kategori."}
      </p>
    </fieldset>
  );
}
