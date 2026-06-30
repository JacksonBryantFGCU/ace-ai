import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { siteConfig } from "@/config/site";

/** Brand marks — lucide dropped social icons, so we inline the official paths. */
function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58l-.01-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5.99.1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3z" />
    </svg>
  );
}

/**
 * Public marketing footer — dark band closing the page. Server component;
 * `basePath` mirrors the header so the same footer works at the `/marketing`
 * preview mount and the root marketing group. Section anchors resolve to the
 * marketing home (`home`), standalone pages to `basePath`.
 *
 * NOTE: Contact / Privacy / Terms pages and the social URLs don't exist yet, so
 * those links are `#` placeholders — wire them up when the pages/handles land.
 */
export function SiteFooter({ basePath = "" }: { basePath?: string }) {
  const home = basePath || "/";

  const columns = [
    {
      heading: "Product",
      links: [
        { label: "Features", href: `${basePath}/features` },
        { label: "How it works", href: `${basePath}/how-it-works` },
        { label: "Interview types", href: `${basePath}/interview-types` },
        { label: "Pricing", href: `${basePath}/pricing` },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "FAQ", href: `${basePath}/faq` },
        { label: "Contact", href: "#" },
        { label: "Privacy", href: "#" },
        { label: "Terms", href: "#" },
      ],
    },
    {
      heading: "Get started",
      links: [
        { label: "Create account", href: "/signup" },
        { label: "Log in", href: "/login" },
      ],
    },
  ];

  const socials: { label: string; href: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
    { label: "LinkedIn", href: "#", icon: LinkedinIcon },
    { label: "GitHub", href: "#", icon: GithubIcon },
  ];

  return (
    <footer className="bg-[#0a0a14] text-gray-400">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[2fr_3fr]">
          {/* Brand */}
          <div className="space-y-5">
            <Link href={home} aria-label="ACE.AI home" className="inline-flex">
              <BrandLogo />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-gray-400">
              AI-powered interview practice that talks, challenges, and grades like the real thing. Get
              interview-ready, faster.
            </p>
            <ul className="flex items-center gap-3">
              {socials.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    aria-label={label}
                    className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:justify-items-end">
            {columns.map((col) => (
              <nav key={col.heading} aria-label={col.heading} className="space-y-4">
                <p className="text-sm font-bold text-white">{col.heading}</p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p>Built for candidates who&apos;d rather practice than panic.</p>
        </div>
      </div>
    </footer>
  );
}
