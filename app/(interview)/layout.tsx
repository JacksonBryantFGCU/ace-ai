import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/server/auth";
import { userDisplayName } from "@/lib/user-display";
import { DashboardNavbar } from "@/components/dashboard-navbar";

// Private surface — keep out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Chrome for the live interview experience. Dark slate surface with the dark
 * navbar variant (legacy appearance — see screenshot 08). `requireUser()` is the
 * server-side gate (defense-in-depth behind the proxy) and supplies the navbar
 * name; the interactive Vapi island owns the rest of the screen.
 */
export default async function InterviewLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="dark surface-dark text-foreground flex min-h-dvh flex-col">
      <DashboardNavbar name={userDisplayName(user)} variant="dark" />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
