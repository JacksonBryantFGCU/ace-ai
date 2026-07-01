import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { readDraft } from "@/server/interview-draft";
import { resolveProblems } from "@/server/problems";
import { TechnicalInterviewClient } from "@/components/interview/technical-interview-client";

export const metadata: Metadata = {
  title: "Technical interview",
  robots: { index: false, follow: false },
};

/**
 * Technical interview route. Server-resolves the config from the setup draft
 * cookie and loads the 3 coding problems (local bank or AI-generated) before
 * rendering the client island. Non-technical / missing drafts go back to setup.
 */
export default async function TechnicalInterviewPage() {
  const config = await readDraft();
  if (!config || config.questionType !== "technical") {
    redirect("/new");
  }

  const user = await requireUser();
  const problems = await resolveProblems(config, user.id);

  return <TechnicalInterviewClient problems={problems} config={config} />;
}
