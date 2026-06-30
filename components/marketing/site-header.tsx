import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

/**
 * Public marketing header. Server component — the auth-aware CTA is decided on
 * the server from `isAuthed` (no client JS). `basePath` lets the same header work
 * at the temporary `/marketing` preview mount (7A) and at the root `(marketing)`
 * group (7B) without code changes.
 *
 * On small screens the secondary links collapse and only the primary CTA shows;
 * a full mobile menu can be added later without changing this contract.
 */
export function SiteHeader({ isAuthed, basePath = "" }: { isAuthed: boolean; basePath?: string }) {
  const home = basePath || "/";
  const links = [
    { label: "Features", href: `${basePath}/features` },
    { label: "How it works", href: `${basePath}/how-it-works` },
    { label: "Interview types", href: `${basePath}/interview-types` },
    { label: "Pricing", href: `${basePath}/pricing` },
    { label: "FAQ", href: `${basePath}/faq` },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 md:px-8">
        <Link href={home} aria-label="ACE.AI home">
          <BrandLogo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white/60 hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-white/60 hover:text-gray-900 sm:block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
