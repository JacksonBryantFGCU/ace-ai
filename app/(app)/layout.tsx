import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/server/auth";
import { userDisplayName } from "@/lib/user-display";
import { AppShell } from "@/components/app-shell";

// Private surface — keep out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Authenticated application shell. `requireUser()` is the server-side gate
 * (defense-in-depth behind the proxy); it also provides the display name to the
 * navbar. The shell fixes the surface theme per route (light app pages, dark
 * replay) and persists across client navigations between child pages.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <AppShell name={userDisplayName(user)} email={user.email ?? null}>
      {children}
    </AppShell>
  );
}
