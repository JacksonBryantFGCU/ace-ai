import { describe, expect, it } from "vitest";
import { criteriaFromConfig, scenarioToCandidate } from "@/lib/scenarios/selection/adapters";
import type { Scenario } from "@/lib/scenarios/schema";
import type { VapiInterviewConfig } from "@/types/interview";

// Minimal Scenario for mapping — only the frontmatter fields the adapter reads.
const scenario = {
  category: "frontend-react",
  jobRoles: ["frontend", "fullstack"],
  difficulty: "medium",
  experienceMin: "entry",
  experienceMax: "senior",
  stack: { languages: ["typescript"], harness: "component" },
  status: "draft",
} as unknown as Scenario;

describe("scenarioToCandidate", () => {
  it("projects the frontmatter fields the selector needs", () => {
    const candidate = scenarioToCandidate(scenario, "user-directory-search");
    expect(candidate).toMatchObject({
      slug: "user-directory-search",
      interviewTypes: ["technical"],
      jobRoles: ["frontend", "fullstack"],
      category: "frontend-react",
      difficulty: "medium",
      languages: ["typescript"],
      experienceMin: "entry",
      experienceMax: "senior",
      status: "draft",
    });
  });
});

describe("criteriaFromConfig", () => {
  it("maps role/difficulty/experience/type and leaves language/category unconstrained", () => {
    const config: VapiInterviewConfig = {
      role: "frontend",
      difficulty: "medium",
      experience: "junior",
      strictness: "balanced",
      questionType: "technical",
      interviewer: "cassidy",
    };
    expect(criteriaFromConfig(config)).toEqual({
      interviewType: "technical",
      jobRole: "frontend",
      difficulty: "medium",
      experience: "junior",
    });
  });
});
