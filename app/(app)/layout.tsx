import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/server/auth";
import { DashboardNavbar } from "@/components/dashboard-navbar";

// Private surface — keep out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Authenticated application shell. `requireUser()` is the server-side gate
 * (defense-in-depth behind the proxy); it also provides the user to the navbar.
 * The DashboardNavbar is a persistent layout — it renders once and survives
 * client navigations between child pages.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardNavbar user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
