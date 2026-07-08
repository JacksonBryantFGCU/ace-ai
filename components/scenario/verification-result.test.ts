import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VerificationResultCard } from "@/components/scenario/verification-result";
import type { VerificationResult } from "@/lib/scenarios/verification";

describe("VerificationResultCard", () => {
  it("renders backend Node verification results without assuming a React/component engine", () => {
    const result: VerificationResult = {
      engine: "node",
      status: "passed",
      passed: true,
      durationMs: 42,
      finishedAt: Date.now(),
      errors: [],
      testResults: [
        { name: "GET /notes returns all seeded notes ordered by id", status: "passed" },
        { name: "DELETE /notes/:id deletes an existing note and returns 204", status: "passed" },
      ],
    };

    const html = renderToStaticMarkup(createElement(VerificationResultCard, { result }));

    expect(html).toContain("Passed");
    expect(html).toContain("42 ms");
    expect(html).toContain("GET /notes returns all seeded notes ordered by id");
    expect(html).toContain("DELETE /notes/:id deletes an existing note and returns 204");
  });

  it("renders grouped fullstack step verification results", () => {
    const result: VerificationResult = {
      engine: "fullstack",
      mode: "scenario-step",
      scenarioSlug: "customer-feedback-dashboard",
      stepIndex: 1,
      status: "failed",
      passed: false,
      durationMs: 55,
      finishedAt: Date.now(),
      errors: [],
      message: "Step checks failed.",
      groups: [
        { name: "backend", ok: true, durationMs: 10, command: "npm test -- tests/backend/step-1.test.ts" },
        { name: "frontend", ok: true, skipped: true, durationMs: 0, reason: "No frontend tests found." },
        { name: "integration", ok: false, durationMs: 45, output: "Expected 200, received 500" },
      ],
      testResults: [],
    };

    const html = renderToStaticMarkup(createElement(VerificationResultCard, { result }));

    expect(html).toContain("backend");
    expect(html).toContain("frontend");
    expect(html).toContain("integration");
    expect(html).toContain("Skipped");
    expect(html).toContain("Expected 200, received 500");
  });
});
