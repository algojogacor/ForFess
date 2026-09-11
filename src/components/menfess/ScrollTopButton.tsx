"use client";

import { useSyncExternalStore } from "react";
import { ArrowUp } from "lucide-react";

/** Subscribe ke scroll event (passive — tidak blok main thread). */
function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/** Muncul setelah scroll melewati batas ini (px). */
const SHOW_AFTER = 480;

/**
 * Tombol melayang "kembali ke atas" — muncul setelah halaman di-scroll
 * cukup jauh (arsip & koleksi bisa panjang sekali). Posisinya di atas
 * footer dan tidak pernah menutupi konten saat halaman masih di puncak.
 */
export function ScrollTopButton() {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > SHOW_AFTER,
    () => false
  );

  if (!scrolled) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Kembali ke atas halaman"
      title="Kembali ke atas"
      className="animate-pop fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-xl border-2 border-ink bg-signal text-ink-fixed shadow-[4px_4px_0_0_var(--hard-strong)] transition-transform duration-150 outline-none hover:-translate-y-1 focus-visible:shadow-[0_0_0_3px_var(--focus-ring)] active:translate-y-0"
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
