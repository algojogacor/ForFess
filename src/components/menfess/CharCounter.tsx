"use client";

import { MAX_CHARS } from "@/constants";
import { cn } from "@/lib/utils";

/**
 * Counter karakter real-time + bar progres tipis.
 * Warna berubah mendekati batas: netral → kuning (≥80%) → merah (≥97%).
 */
export function CharCounter({
  value,
  max = MAX_CHARS,
}: {
  value: string;
  max?: number;
}) {
  const count = value.length;
  const ratio = Math.min(count / max, 1);
  const nearLimit = ratio >= 0.8;
  const atLimit = ratio >= 0.97;

  return (
    <div className="flex items-center justify-end gap-2.5">
      <div
        className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/10"
        role="presentation"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-200",
            atLimit ? "bg-tomato" : nearLimit ? "bg-signal-deep" : "bg-ink/60"
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span
        className={cn(
          "font-mono text-[13px] tabular-nums transition-colors",
          atLimit ? "font-bold text-tomato" : nearLimit ? "text-signal-deep" : "text-ink-faint"
        )}
        aria-live="polite"
        aria-label={`${count} dari ${max} karakter`}
      >
        {count}/{max}
      </span>
    </div>
  );
}
