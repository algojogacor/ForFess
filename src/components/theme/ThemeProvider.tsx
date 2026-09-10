"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Provider tema (next-themes) — strategy class di <html>.
 * defaultTheme "system": ikuti preferensi OS pengguna; toggle manual
 * tetap tersedia di navbar dan tersimpan di localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
