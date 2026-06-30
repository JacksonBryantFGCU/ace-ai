import type { ReactNode } from "react";
import { getUser } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Public marketing shell, mounted at the site root (`/`, `/pricing`, `/faq`,
 * `/features`, `/how-it-works`, `/interview-types`). Public surface — uses
 * `getUser()` only to swap the header CTA (no `requireUser` gate). These pages are
 * indexable, so this layout intentionally sets no `noindex` robots metadata; the
 * authed→`/dashboard` redirect lives in the home page, not here, so secondary
 * marketing pages stay reachable while signed in.
 */
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const user = await getUser();

  return (
    <div className="flex min-h-dvh flex-col bg-white text-gray-900">
      <SiteHeader isAuthed={Boolean(user)} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
