"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/providers/theme-provider";

/**
 * Single mount point for cross-cutting client providers (theme today; toasts,
 * tooltips, etc. later). Kept intentionally minimal — the app has no global
 * store; server data + local state cover most needs.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
