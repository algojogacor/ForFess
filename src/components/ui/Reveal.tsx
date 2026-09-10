"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealState = "idle" | "hidden" | "visible";

/**
 * Wrapper scroll-reveal yang aman:
 * - SSR / tanpa JS / reduced-motion → konten LANGSUNG terlihat (idle tidak
 *   pernah menyembunyikan apa pun).
 * - Setelah mount, elemen yang berada di bawah viewport baru disembunyikan
 *   lalu dimunculkan saat masuk viewport (IntersectionObserver, sekali saja).
 *   Elemen yang sudah kelihatan di layar pertama tidak pernah berkedip.
 *
 * Delay (ms) hanya mengatur jeda transisi via CSS var --reveal-delay.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<RevealState>("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // IntersectionObserver nggak ada (browser jadul) → biarkan terlihat saja.
    if (typeof IntersectionObserver === "undefined") return;

    // Ukur SETELAH frame berikut supaya layout stabil — sekaligus menghindari
    // setState sinkron di dalam effect.
    const raf = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      // Sudah terlihat di layar pertama → jangan pernah menyembunyikannya.
      if (rect.top < window.innerHeight * 0.94) return;

      setState("hidden");
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setState("visible");
              io.disconnect();
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
      );
      io.observe(el);
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        className,
        state === "hidden" && "reveal",
        state === "visible" && "reveal is-visible"
      )}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
