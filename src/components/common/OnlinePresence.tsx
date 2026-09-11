"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SESSION_KEY = "fess_presence_sid_v1";
const HEARTBEAT_INTERVAL_MS = 45 * 1000;

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `fess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `fallback_${Date.now()}`;
  }
}

interface OnlinePresenceProps {
  className?: string;
  variant?: "badge" | "minimal" | "stat";
}

/**
 * Komponen realtime presence:
 * Mengirim heartbeat pasif setiap 45 detik saat tab aktif,
 * dan menampilkan indikator "XX mahasiswa online".
 */
export function OnlinePresence({
  className,
  variant = "badge",
}: OnlinePresenceProps) {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const sid = getOrCreateSessionId();

    const sendHeartbeat = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.online === "number") {
            setOnlineCount(data.online);
          }
        }
      } catch {
        /* Fail-open: jika gagal, biarkan tampilan sebelumnya atau sembunyikan */
      }
    };

    // Panggil saat pertama kali mount
    sendHeartbeat();

    // Loop interval berkala
    timer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Kirim segera saat pengguna kembali membuka tab ini
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Jangan render apa-apa sebelum ada respon (hindari angka dummy)
  if (onlineCount === null) {
    return null;
  }

  if (variant === "minimal") {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5 font-mono text-[12px]", className)}
        title={`${onlineCount} mahasiswa sedang online`}
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="tabular-nums font-bold text-ink">{onlineCount}</span>
      </span>
    );
  }

  if (variant === "stat") {
    return (
      <span
        className={cn(
          "flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-soft",
          className
        )}
        title={`${onlineCount} mahasiswa sedang membuka situs Fess UNAIR`}
      >
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <strong className="text-base font-bold tabular-nums text-ink">
          {onlineCount}
        </strong>{" "}
        mahasiswa online
      </span>
    );
  }

  // Default: variant === "badge" (untuk Navbar)
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-ink/20 bg-paper-raised/80 px-2.5 py-1 backdrop-blur-sm transition-colors hover:border-ink/40",
        className
      )}
      title={`${onlineCount} mahasiswa sedang aktif di web Fess UNAIR`}
      role="status"
      aria-label={`${onlineCount} mahasiswa online`}
    >
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-mono text-[11px] font-medium tracking-wide text-ink-soft">
        <strong className="tabular-nums text-ink">{onlineCount}</strong> online
      </span>
    </div>
  );
}
