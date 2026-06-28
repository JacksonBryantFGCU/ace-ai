import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

/**
 * Centered auth shell for login/signup, on the pastel brand gradient (legacy
 * appearance). The auth cards themselves supply the glassmorphism.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="surface-light flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-gray-900" aria-label="ACE.AI home">
        <BrandLogo />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
