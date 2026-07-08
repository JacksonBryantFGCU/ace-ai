import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScenarioTab } from "@/components/scenario/shell/scenario-tab";
import type { ScenarioStep } from "@/lib/scenarios/schema";
import type { VerificationResult } from "@/lib/scenarios/verification";

describe("ScenarioTab", () => {
  it("shows the verification action for backend node-vm steps", () => {
    const step: ScenarioStep = {
      id: "return-notes",
      kind: "implement",
      prompt: "Return notes from the SQLite database.",
      verification: "automated-tests",
      verify: { harness: "node-vm", functionName: "app", tests: ["tests/step-1.test.ts"] },
      weight: 100,
      checkpoint: { files: ["solution/step-1/app.ts"] },
      hints: ["Use db.all."],
    };

    const html = renderToStaticMarkup(
      createElement(ScenarioTab, {
        steps: [step],
        machine: {
          state: {
            phase: "in_progress",
            stepIndex: 0,
            steps: [
              {
                id: "return-notes",
                status: "in_progress",
                revealedHints: 0,
                hintCount: 1,
                response: "",
              },
            ],
            log: [],
          },
          current: {
            id: "return-notes",
            status: "in_progress",
            revealedHints: 0,
            hintCount: 1,
            response: "",
          },
          lastStep: true,
          complete: false,
        },
        controller: {
          goTo() {},
          revealHint() {},
          offerCheckpoint() {},
          prev() {},
          next() {},
        },
        verification: {
          supported: true,
          mode: "single-file",
          running: false,
          result: null,
          onRun() {},
          runLabel: "Run verification",
          runningLabel: "Running…",
        },
        checkpoint: {
          available: true,
          applied: false,
          onUse() {},
        },
      } as never),
    );

    expect(html).toContain("Run verification");
    expect(html).not.toContain("Your response");
  });

  it("shows the fullstack step verification UI instead of the old dead-end message", () => {
    const step: ScenarioStep = {
      id: "load-feedback",
      kind: "implement",
      prompt: "Load customer feedback from the real backend.",
      verification: "hybrid",
      verify: { harness: "none" },
      weight: 100,
    };
    const result: VerificationResult = {
      engine: "fullstack",
      mode: "scenario-step",
      scenarioSlug: "customer-feedback-dashboard",
      stepIndex: 0,
      status: "failed",
      passed: false,
      durationMs: 25,
      finishedAt: Date.now(),
      errors: [],
      message: "Step checks failed.",
      groups: [
        { name: "backend", ok: true, durationMs: 5 },
        { name: "frontend", ok: true, skipped: true, durationMs: 0, reason: "No frontend tests found." },
        { name: "integration", ok: false, durationMs: 20, reason: "Request timed out." },
      ],
      testResults: [
        { name: "backend", status: "passed", durationMs: 5 },
        { name: "frontend", status: "skipped", durationMs: 0 },
        { name: "integration", status: "failed", durationMs: 20 },
      ],
    };

    const html = renderToStaticMarkup(
      createElement(ScenarioTab, {
        steps: [step],
        machine: {
          state: {
            phase: "in_progress",
            stepIndex: 0,
            steps: [
              {
                id: "load-feedback",
                status: "failed",
                revealedHints: 0,
                hintCount: 0,
                response: "",
              },
            ],
            log: [],
          },
          current: {
            id: "load-feedback",
            status: "failed",
            revealedHints: 0,
            hintCount: 0,
            response: "",
          },
          lastStep: true,
          complete: false,
        },
        controller: {
          goTo() {},
          revealHint() {},
          offerCheckpoint() {},
          prev() {},
          next() {},
        },
        verification: {
          supported: true,
          mode: "scenario-step",
          running: false,
          result,
          onRun() {},
          runLabel: "Run step checks",
          runningLabel: "Running fullstack checks...",
          nextLocked: true,
          nextLockedReason: "Verify this step before moving to the next one.",
        },
        checkpoint: {
          available: false,
          applied: false,
          onUse() {},
        },
      } as never),
    );

    expect(html).toContain("Run step checks");
    expect(html).toContain("Step checks failed.");
    expect(html).toContain("Verify this step before moving to the next one.");
    expect(html).toContain("backend");
    expect(html).toContain("frontend");
    expect(html).toContain("integration");
    expect(html).not.toContain("fullstack scenario test runner instead of the single-file verification button");
  });
});
