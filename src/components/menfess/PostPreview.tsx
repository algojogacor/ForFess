"use client";

import { createElement, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  buildTemplateNode,
  CSS_FONTS_REF,
  type SatoriNode as TemplateNode,
} from "@/lib/post-template";

/**
 * Pratinjau kartu menfess di browser — dirender pada kanvas internal
 * 1080x1080 lalu di-scale ke lebar kontainer, jadi hasilnya proporsional
 * (hampir identik) dengan gambar asli yang diposting ke Instagram.
 */

function renderNode(node: TemplateNode, key?: number): ReactNode {
  const { type, props } = node;
  const children = props.children;

  return createElement(
    type,
    { key, style: props.style as CSSProperties },
    typeof children === "string"
      ? children
      : children?.map((child, i) => renderNode(child, i))
  );
}

export function PostPreview({
  text,
  className,
  ariaLabel = "Pratinjau kartu menfess",
}: {
  text: string;
  className?: string;
  ariaLabel?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  // Hitung skala saat lebar kontainer berubah (responsive + resize window).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => setScale(el.clientWidth / 1080);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Teks kosong: tampilkan placeholder agar layout tetap terjaga.
  const displayText = text.trim().length > 0 ? text : " ";

  return (
    <div
      ref={wrapperRef}
      role="img"
      aria-label={ariaLabel}
      className={`relative w-full overflow-hidden ${className ?? ""}`}
      style={{ aspectRatio: "1 / 1" }}
    >
      <div
        style={{
          width: 1080,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {renderNode(buildTemplateNode(displayText, CSS_FONTS_REF))}
      </div>
    </div>
  );
}
