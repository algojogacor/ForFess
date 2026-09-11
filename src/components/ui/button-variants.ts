import { cva, type VariantProps } from "class-variance-authority";

/**
 * Varian visual Button brand Fess UNAIR — file biasa (bukan "use client")
 * supaya bisa dipakai untuk styling Link di Server Components.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-55 select-none",
  {
    variants: {
      variant: {
        /** CTA utama — kuning signal dengan shadow tinta.
         *  Teks & border selalu tinta gelap (ink-fixed): kuning harus
         *  dipasangkan dengan tinta gelap di tema apa pun. */
        signal:
          "bg-signal text-ink-fixed border-2 border-ink-fixed shadow-[4px_4px_0_0_var(--hard-strong)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--hard-strong)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--hard-strong)] disabled:shadow-[4px_4px_0_0_var(--hard-strong)]",
        /** Sekunder — blok tinta (jadi blok krem di mode gelap). */
        ink: "bg-ink text-paper border-2 border-ink shadow-[4px_4px_0_0_var(--hard-soft)] hover:bg-ink-soft active:bg-ink",
        /** Garis tinta saja. */
        outline:
          "bg-paper-raised text-ink border-2 border-ink hover:bg-signal-soft active:bg-signal-soft/60",
        /** Teks saja. */
        ghost: "text-ink-soft hover:text-ink hover:bg-ink/5",
        /** Link ke IG dsb — garis bawah kuning. */
        link: "text-ink underline decoration-signal decoration-4 underline-offset-4 hover:decoration-tomato",
      },
      size: {
        default: "h-11 px-5 text-[15px] rounded-xl",
        sm: "h-9 px-3.5 text-sm rounded-lg",
        md: "h-11 px-5 text-[15px] rounded-xl",
        lg: "h-13 px-7 text-base rounded-xl",
        icon: "size-10 rounded-lg",
      },
    },
    defaultVariants: { variant: "signal", size: "md" },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
