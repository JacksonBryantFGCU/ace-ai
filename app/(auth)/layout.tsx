import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";

/**
 * Centered auth shell for login/signup.
 *
 * TODO(auth): redirect already-authenticated users to /dashboard (server check).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        {siteConfig.name}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
