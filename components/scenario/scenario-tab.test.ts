import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScenarioTab } from "@/components/scenario/shell/scenario-tab";
import type { ScenarioStep } from "@/lib/scenarios/schema";

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
          running: false,
          result: null,
          onRun() {},
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
});
