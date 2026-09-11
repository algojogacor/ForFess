"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bar progres baca — garis kuning tipis yang melebar di bawah navbar
 * saat halaman panjang (arsip, koleksi) digulir. Detail kecil bergaya
 * zine: biar tau posisi kita di tumpukan kartu.
 *
 * Teknis: satu listener scroll+resize pasif, tulisan posisi di-buffer
 * via rAF (bukan setState per piksel), transform scaleX (GPU, tanpa
 * reflow), dan hormati prefers-reduced-motion (tanpa transisi).
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  /** Muncul hanya setelah ada guliran — di puncak, garisnya tak berguna. */
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
      setVisible(window.scrollY > 40 && max > 200);
    };

    const onScroll = () => {
      if (raf === 0) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] w-full"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-signal shadow-[0_1px_0_0_rgba(0,0,0,0.15)] motion-reduce:transition-none"
        style={{
          transform: "scaleX(0)",
          transition: "transform 80ms linear",
        }}
      />
    </div>
  );
}
