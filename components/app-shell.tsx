"use client";

import { usePathname } from "next/navigation";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { cn } from "@/lib/utils";

/** Interview replay (`/interviews/<id>`) is the one dark surface inside the app
 *  group; the list (`/interviews`) and every other page stay light. */
function isDarkSurface(pathname: string): boolean {
  return /^\/interviews\/[^/]+/.test(pathname);
}

/**
 * Authenticated app chrome. Client component so it can fix the surface theme by
 * route (legacy behavior — no user-facing light/dark toggle): pastel light for
 * most pages, dark slate for the replay experience. Page content is still
 * server-rendered and passed through as `children`.
 */
export function AppShell({
  name,
  email,
  children,
}: {
  name: string;
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const dark = isDarkSurface(pathname);
  // Authenticated pages use the pastel light surface; the interview replay is the
  // one dark surface. (The marketing home and its hero gradient now live in the
  // public `(marketing)` group, outside this shell.)
  const surface = dark ? "dark surface-dark text-foreground" : "surface-light text-gray-900";

  return (
    <div className={cn("flex min-h-dvh flex-col", surface)}>
      <DashboardNavbar name={name} email={email} variant={dark ? "dark" : "light"} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 md:px-8">
        {/* Keyed on route so page content fades in on each client navigation. */}
        <div key={pathname} className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
