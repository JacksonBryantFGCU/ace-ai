import Link from "next/link";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/interviews", label: "History" },
  { href: "/analytics", label: "Analytics" },
  { href: "/setup", label: "New interview" },
] as const;

/**
 * Persistent navigation for the authenticated `(app)` route group. Server
 * component; only the theme toggle ships JS. User name / logout will be added
 * with auth (Phase 1).
 */
export function DashboardNavbar() {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
        <ul className="text-muted-foreground hidden items-center gap-4 text-sm sm:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
