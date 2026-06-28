import type { ReactNode } from "react";

/**
 * Single mount point for cross-cutting providers. Intentionally a passthrough:
 * the restored design uses **fixed per-surface themes** (light pastel for
 * marketing/app, dark slate for the interview/replay experience) rather than a
 * user-toggled light/dark mode, so there is no theme provider. Add toasts,
 * tooltips, etc. here if needed later.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
