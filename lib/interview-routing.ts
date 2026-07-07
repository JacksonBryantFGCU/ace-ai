import type { VapiInterviewConfig } from "@/types/interview";

export function routeForSetupDraft(config: VapiInterviewConfig): string {
  if (config.questionType !== "technical") return "/interview/voice";
  return config.scenarioSlug ? "/technical-interview" : "/interview/scenario-picker";
}
