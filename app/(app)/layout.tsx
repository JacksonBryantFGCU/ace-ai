import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardNavbar } from "@/components/dashboard-navbar";

// Private surface — keep out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Authenticated application shell. The DashboardNavbar is a persistent layout —
 * it renders once and survives client navigations between child pages.
 *
 * TODO(auth): `requireUser()` here (Phase 1) to gate the whole group server-side
 * and provide the user to children. Middleware will be the first line of defense.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardNavbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
