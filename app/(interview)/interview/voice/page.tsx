import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readDraft } from "@/server/interview-draft";
import { VoiceInterviewClient } from "@/components/interview/voice-interview-client";

export const metadata: Metadata = {
  title: "Behavioral interview",
  robots: { index: false, follow: false },
};

export default async function VoiceInterviewPage() {
  // Config is resolved on the server from the setup draft cookie (set by
  // saveSetupDraft). No draft → send the user back to setup.
  const config = await readDraft();
  if (!config || config.questionType !== "behavioral") {
    redirect("/setup");
  }

  return <VoiceInterviewClient config={config} />;
}
