"use client";

import { useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey, isTurnstileWidgetEnabled } from "@/lib/config";
import { ShieldCheck } from "lucide-react";

/**
 * Widget Cloudflare Turnstile.
 * - Site key valid (0x.../1x...)  → script Turnstile dimuat & widget dirender.
 * - "placeholder_development"     → mode dev: widget tidak dirender, token
 *   placeholder dikirim. Secret key development ("always pass") di server
 *   tetap memvalidasinya tanpa bypass manual.
 */

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    }
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
}

function getTurnstileApi(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

export function TurnstileWidget({
  onToken,
  disabled,
}: {
  onToken: (token: string | null) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptFailed, setScriptFailed] = useState(false);
  const widgetEnabled = isTurnstileWidgetEnabled();

  useEffect(() => {
    // Mode development: langsung set token placeholder.
    if (!widgetEnabled) {
      onToken("development-placeholder");
      return;
    }

    let widgetId: string | undefined;
    let cancelled = false;

    function tryRender(attempt: number) {
      if (cancelled || !containerRef.current) return;
      const api = getTurnstileApi();
      if (!api) {
        if (attempt > 40) {
          setScriptFailed(true);
          return;
        }
        setTimeout(() => tryRender(attempt + 1), 250);
        return;
      }
      widgetId = api.render(containerRef.current, {
        sitekey: getTurnstileSiteKey(),
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => setScriptFailed(true),
        theme: "light",
      });
    }

    // Muat script Turnstile sekali.
    const SCRIPT_ID = "cf-turnstile-script";
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }

    tryRender(0);

    return () => {
      cancelled = true;
      if (widgetId) {
        try {
          getTurnstileApi()?.remove(widgetId);
        } catch {
          /* abaikan — widget mungkin sudah lepas */
        }
      }
    };
  }, [widgetEnabled]);

  // Mode dev: tidak ada widget yang perlu dirender.
  if (!widgetEnabled) {
    return (
      <p className="flex items-center gap-2 rounded-lg border-2 border-dashed border-ink/25 bg-paper-raised px-3.5 py-3 text-[13px] text-ink-faint">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        Verifikasi keamanan: mode development (tanpa captcha).
      </p>
    );
  }

  if (scriptFailed) {
    return (
      <p className="flex items-center gap-2 rounded-lg border-2 border-tomato-deep bg-[#FBEAE3] px-3.5 py-3 text-[13px] text-[#7A2A12]">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        Widget verifikasi gagal dimuat. Muat ulang halaman, atau matikan
        pemblokir iklan lalu coba lagi.
      </p>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className={disabled ? "pointer-events-none opacity-60" : undefined}
        aria-label="Verifikasi keamanan Cloudflare Turnstile"
      />
    </div>
  );
}
