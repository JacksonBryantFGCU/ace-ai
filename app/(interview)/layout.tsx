import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/server/auth";

// Private surface — keep out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Distraction-free, full-height chrome for live interviews. No navbar — the
 * client island owns the screen. `requireUser()` is the server-side gate
 * (defense-in-depth behind the proxy).
 */
export default async function InterviewLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <div className="flex h-dvh flex-col">{children}</div>;
}
