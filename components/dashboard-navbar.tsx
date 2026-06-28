"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, FileText, LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Practice Interviews", href: "/roles" },
  { label: "Interviews", href: "/interviews" },
  { label: "Analytics", href: "/analytics" },
] as const;

/** Which nav item owns a given pathname (so deep routes still light up a tab). */
function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/roles") {
    return ["/roles", "/setup", "/interview"].some((p) => pathname.startsWith(p));
  }
  if (href === "/interviews") return pathname.startsWith("/interviews");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFrom(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Persistent navigation for the authenticated app. Client component so it can
 * highlight the active tab (`usePathname`), drive the avatar dropdown + mobile
 * menu, and adapt to the surface theme: `variant="dark"` on the dark interview/
 * replay surfaces, `light` everywhere else.
 */
export function DashboardNavbar({
  name,
  variant = "light",
}: {
  name: string;
  variant?: "light" | "dark";
}) {
  const pathname = usePathname();
  const dark = variant === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initials = initialsFrom(name);

  // Close the avatar dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const closeMenus = () => {
    setMenuOpen(false);
    setDropdownOpen(false);
  };

  const iconHover = dark ? "hover:bg-white/10" : "hover:bg-white/50";
  const iconColor = dark ? "text-gray-300" : "text-gray-700";
  const inactiveTab = dark
    ? "text-gray-300 hover:bg-white/10 hover:text-white"
    : "text-gray-700 hover:bg-white/60 hover:text-gray-900";

  return (
    <nav
      className={cn(
        "relative z-50 border-b shadow-sm backdrop-blur-xl",
        dark ? "border-white/10 bg-white/5 text-white" : "border-white/40 bg-white/60",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center px-6 py-3 md:px-8">
        <Link href="/" className="shrink-0" aria-label="ACE.AI home">
          <BrandLogo />
        </Link>

        <div className="ml-auto flex items-center gap-3 lg:gap-5">
          {/* Pill nav tabs */}
          <div className="hidden items-center gap-2 lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                  isActive(item.href, pathname)
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                    : inactiveTab,
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            className={cn("rounded-xl p-2.5 transition-all lg:hidden", iconHover)}
          >
            {menuOpen ? (
              <X className={cn("size-5", iconColor)} />
            ) : (
              <Menu className={cn("size-5", iconColor)} />
            )}
          </button>

          {/* Notifications (decorative, matches legacy) */}
          <button
            type="button"
            aria-label="Notifications"
            className={cn("relative rounded-xl p-2.5 transition-all", iconHover)}
          >
            <Bell className={cn("size-5", iconColor)} />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-white bg-red-500" />
          </button>

          {/* Avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              className={cn("flex items-center gap-3 rounded-xl py-2 pr-3 pl-2 transition-all", iconHover)}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-sm font-semibold text-white shadow-sm">
                {initials}
              </span>
              <span className={cn("hidden font-medium sm:block", dark ? "text-white" : "text-gray-900")}>
                {name}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  dropdownOpen && "rotate-180",
                  dark ? "text-gray-400" : "text-gray-600",
                )}
              />
            </button>

            {dropdownOpen ? (
              <div
                role="menu"
                className={cn(
                  "absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border shadow-lg backdrop-blur-xl",
                  dark ? "border-white/10 bg-gray-800/90" : "border-white/60 bg-white/80",
                )}
              >
                <div className="py-2">
                  <Link
                    href="/interviews"
                    role="menuitem"
                    onClick={closeMenus}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 font-medium transition-all",
                      dark ? "text-gray-300 hover:bg-white/10" : "text-gray-700 hover:bg-blue-50/50",
                    )}
                  >
                    <FileText className="size-4" />
                    Past Interviews
                  </Link>
                  <div className={cn("my-2 border-t", dark ? "border-white/10" : "border-gray-200/50")} />
                  <form action={signOut}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="flex w-full items-center gap-3 px-4 py-3 font-medium text-red-500 transition-all hover:bg-red-500/10"
                    >
                      <LogOut className="size-4" />
                      Sign Out
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen ? (
        <div className={cn("border-t lg:hidden", dark ? "border-white/10" : "border-white/30")}>
          <div className="flex flex-col gap-1 px-6 py-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenus}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-left font-medium transition-all",
                  isActive(item.href, pathname)
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                    : inactiveTab,
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
