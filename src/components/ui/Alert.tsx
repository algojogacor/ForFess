import * as React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Alert feedback brand — sukses / error / warning / info.
 * Border tinta tebal + ikon, dipakai di form dan halaman lain.
 */
export type AlertVariant = "success" | "error" | "warning" | "info";

const VARIANT_STYLES: Record<
  AlertVariant,
  { box: string; icon: React.ReactNode; label: string }
> = {
  success: {
    box: "border-emerald-800 bg-emerald-50 text-emerald-950",
    icon: <CheckCircle2 className="size-5 shrink-0" aria-hidden />,
    label: "Berhasil",
  },
  error: {
    box: "border-tomato-deep bg-[#FBEAE3] text-[#7A2A12]",
    icon: <XCircle className="size-5 shrink-0" aria-hidden />,
    label: "Gagal",
  },
  warning: {
    box: "border-signal-deep bg-signal-soft text-ink",
    icon: <AlertTriangle className="size-5 shrink-0" aria-hidden />,
    label: "Perhatian",
  },
  info: {
    box: "border-ink bg-paper-raised text-ink",
    icon: <Info className="size-5 shrink-0" aria-hidden />,
    label: "Info",
  },
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  /** Judul singkat; kalau kosong, pakai label default varian. */
  title?: string;
  /** Isi pesan — boleh multi-baris. */
  children?: React.ReactNode;
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
  ...props
}: AlertProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 px-4 py-3.5 animate-pop",
        styles.box,
        className
      )}
      {...props}
    >
      <span className="mt-0.5">{styles.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{title ?? styles.label}</p>
        {children ? (
          <div className="mt-1 text-[15px] leading-relaxed [&_p]:leading-relaxed">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
