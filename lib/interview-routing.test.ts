import { describe, expect, it } from "vitest";
import { routeForSetupDraft } from "@/lib/interview-routing";
import type { VapiInterviewConfig } from "@/types/interview";

const base: VapiInterviewConfig = {
  role: "backend",
  difficulty: "medium",
  experience: "junior",
  strictness: "balanced",
  questionType: "technical",
  interviewer: "cassidy",
};

describe("routeForSetupDraft", () => {
  it("routes technical setup drafts without a scenario to the scenario picker", () => {
    expect(routeForSetupDraft(base)).toBe("/interview/scenario-picker");
  });

  it("routes technical drafts with a selected scenario to the technical runtime", () => {
    expect(routeForSetupDraft({ ...base, scenarioSlug: "notes-rest-api" })).toBe("/technical-interview");
  });

  it("routes behavioral drafts to the voice interview flow", () => {
    expect(routeForSetupDraft({ ...base, questionType: "behavioral" })).toBe("/interview/voice");
  });
});
