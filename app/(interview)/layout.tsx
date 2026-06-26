import type { Metadata } from "next";
import type { ReactNode } from "react";

// Private surface — keep out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Distraction-free, full-height chrome for live interviews. No navbar — the
 * client island owns the screen.
 *
 * TODO(auth): `requireUser()` gate here (Phase 1), same as the (app) group.
 */
export default function InterviewLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-dvh flex-col">{children}</div>;
}
