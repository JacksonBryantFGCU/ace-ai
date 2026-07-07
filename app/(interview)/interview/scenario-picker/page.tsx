import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readDraft } from "@/server/interview-draft";
import { listScenarioCandidates, listScenarioPickerOptions } from "@/server/scenarios/candidates";
import { selectScenarioResult } from "@/lib/scenarios/selection/select-scenario";
import { criteriaFromConfig } from "@/lib/scenarios/selection/adapters";
import { ScenarioPickerPage } from "@/components/scenario/scenario-picker-page";

export const metadata: Metadata = {
  title: "Choose your scenario",
  robots: { index: false, follow: false },
};

export default async function InterviewScenarioPickerRoute() {
  const config = await readDraft();
  if (!config || config.questionType !== "technical") {
    redirect("/new");
  }

  const [scenarios, candidates] = await Promise.all([
    listScenarioPickerOptions(),
    listScenarioCandidates(),
  ]);
  const recommendation = selectScenarioResult(candidates, criteriaFromConfig(config), { exclude: [] });

  return (
    <ScenarioPickerPage
      config={config}
      scenarios={scenarios}
      recommendedSlug={recommendation.status === "selected" ? recommendation.candidate.slug : null}
    />
  );
}
