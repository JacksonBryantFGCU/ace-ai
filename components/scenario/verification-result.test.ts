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
});
