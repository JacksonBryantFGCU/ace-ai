import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/server/auth";
import { userDisplayName } from "@/lib/user-display";
import { InterviewShell } from "./interview-shell";

// Private surface — keep out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Chrome for the interview experience. The live interview runtime keeps the dark
 * surface, while setup-adjacent picker pages use the light app navbar.
 * `requireUser()` is the server-side gate behind the proxy.
 */
export default async function InterviewLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <InterviewShell name={userDisplayName(user)} email={user.email ?? null}>
      {children}
    </InterviewShell>
  );
}
