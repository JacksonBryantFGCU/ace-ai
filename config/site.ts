/**
 * Static, public site configuration. No secrets here — safe to import anywhere
 * (server or client). Per-environment values come from `config/env.ts`.
 */
export const siteConfig = {
  name: "ACE.AI",
  title: "ACE.AI — Voice Engineering Interview Practice",
  description:
    "Practice realistic AI-powered voice engineering interviews. Behavioral and technical, with instant scoring.",
  // Public base URL of the deployment. Used for metadata, sitemap, robots, OG.
  // Falls back to localhost in dev; override with NEXT_PUBLIC_SITE_URL.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
} as const;

export type SiteConfig = typeof siteConfig;
