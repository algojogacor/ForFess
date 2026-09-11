"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export function StatusLockBtn() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLock = () => {
    startTransition(async () => {
      try {
        await fetch("/api/status-auth", { method: "DELETE" });
        router.refresh();
      } catch (err) {
        console.error("Gagal mengunci halaman:", err);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleLock}
      disabled={isPending}
      title="Kunci kembali halaman status"
      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-paper px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink transition-all hover:bg-tomato/15 hover:text-tomato-deep active:scale-95 disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Lock className="size-3.5" aria-hidden />
      )}
      <span>Kunci Sesi</span>
    </button>
  );
}
