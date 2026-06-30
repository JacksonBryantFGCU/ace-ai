import { redirect } from "next/navigation";

/**
 * Temporary redirect alias. The configuration step now lives in the unified
 * `/new` workflow; this preserves the `?role=` handoff so existing links to
 * `/setup` continue into the right step during the transition.
 */
export default async function SetupRedirect(props: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await props.searchParams;
  redirect(typeof role === "string" ? `/new?role=${encodeURIComponent(role)}` : "/new");
}
