import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listStudioScenarios } from "@/actions/authoring";
import { AuthoringStudio } from "@/components/scenario/studio/authoring-studio";

export const metadata: Metadata = {
  title: "Scenario Authoring Studio",
  robots: { index: false, follow: false },
};

/**
 * Dev-only Scenario Authoring Studio. The central environment for creating,
 * validating, previewing, and debugging scenarios — no auth, no interview setup.
 * The initial scenario list is loaded server-side (fast first paint); everything
 * else is fetched on demand through the dev-only `actions/authoring` server
 * actions. Returns 404 in production so a no-auth route never ships live.
 */
export default async function PlaygroundPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const scenarios = await listStudioScenarios();
  return <AuthoringStudio initialScenarios={scenarios} />;
}
