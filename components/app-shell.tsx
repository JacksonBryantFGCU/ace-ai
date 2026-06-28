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
export function AppShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const dark = isDarkSurface(pathname);
  // The Home/hero (`/`) uses the lighter legacy hero gradient; other light pages
  // use the pastel surface.
  const surface = dark
    ? "dark surface-dark text-foreground"
    : pathname === "/"
      ? "surface-hero text-gray-900"
      : "surface-light text-gray-900";

  return (
    <div className={cn("flex min-h-dvh flex-col", surface)}>
      <DashboardNavbar name={name} variant={dark ? "dark" : "light"} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 md:px-8">{children}</main>
    </div>
  );
}
