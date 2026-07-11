import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadScenario } from "@/server/scenarios/load";
import { verifyStepOnServer } from "@/server/scenarios/verification-service";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * Proves that fullstack step verification is BEHAVIORAL (routes / response
 * shapes / accessible UI contract), not coupled to the reference solution's
 * file layout — using the real production path: `verifyStepOnServer` ->
 * `verifyScenarioStep` -> `verifyFullstackScenarioStep`, which spawns real
 * backend/frontend processes and runs the scenario's actual authored
 * backend/frontend/integration tests against them. Nothing here is mocked.
 *
 * Target: event-rsvp-manager, step "filter-and-create-rsvp" (step index 1),
 * which has the richest authored test coverage (filters + RSVP creation +
 * validation, across backend/frontend/integration layers) and, because
 * `includePreviousSteps` defaults to true, also re-runs step 1's tests.
 *
 * Two fixtures, both real files exercised through the real runtime:
 *  - "alt-passing": a differently organized but behaviorally equivalent
 *    candidate implementation (router + centralized error middleware on the
 *    backend; hook + component decomposition on the frontend). Must pass.
 *  - "integration-broken": a backend that looks right in isolation but
 *    serializes the created RSVP with camelCase attendee fields instead of
 *    the contracted snake_case, which the (unmodified reference) frontend
 *    renders via `rsvp.attendee_name`. Must fail, and the failure must show
 *    up in the integration layer.
 */

const SCENARIO_SLUG = "event-rsvp-manager";
const STEP_ID = "filter-and-create-rsvp";

const CONTENT_ROOT = join(
  process.cwd(),
  "content",
  "interview-scenarios",
  "fullstack-react-node",
  "event-rsvp-manager",
);
const FIXTURE_ROOT = join(process.cwd(), "server", "scenarios", "fixtures", "event-rsvp-manager");

const readContent = (rel: string) => readFileSync(join(CONTENT_ROOT, rel), "utf8");
const readFixture = (rel: string) => readFileSync(join(FIXTURE_ROOT, rel), "utf8");

async function baseSnapshot(): Promise<SnapshotFile[]> {
  const loaded = await loadScenario(SCENARIO_SLUG, { includeAuthorOnly: false });
  return loaded.files.map((file) => ({ path: file.path, content: file.content, role: file.role }));
}

function withOverrides(base: SnapshotFile[], overrides: Record<string, string>, additions: SnapshotFile[] = []) {
  const overridden = base.map((file) =>
    overrides[file.path] !== undefined ? { ...file, content: overrides[file.path]! } : file,
  );
  return [...overridden, ...additions];
}

describe("behavioral equivalence — event-rsvp-manager step 2 (filter-and-create-rsvp)", () => {
  it(
    "passes real fullstack verification for an alt-passing candidate with a different module split",
    async () => {
      const base = await baseSnapshot();
      const files = withOverrides(
        base,
        {
          "backend/src/app.ts": readFixture("alt-passing/backend-app.ts"),
          "frontend/src/App.tsx": readFixture("alt-passing/frontend-App.tsx"),
        },
        [
          { path: "frontend/src/use-event-catalog.ts", content: readFixture("alt-passing/frontend-use-event-catalog.ts"), role: "edit" },
          { path: "frontend/src/components.tsx", content: readFixture("alt-passing/frontend-components.tsx"), role: "edit" },
        ],
      );

      const result = await verifyStepOnServer({
        scenarioSlug: SCENARIO_SLUG,
        step: { id: STEP_ID, harness: "component" },
        files,
      });

      if (result.status !== "passed") {
        // Surface real process output for fast diagnosis if the fixture regresses.
        console.error(JSON.stringify(result.groups, null, 2));
      }

      expect(result.engine).toBe("fullstack");
      expect(result.status).toBe("passed");
      expect(result.passed).toBe(true);
      expect(result.testResults.every((t) => t.status === "passed" || t.status === "skipped")).toBe(true);
    },
    180_000,
  );

  it(
    "FAILS real fullstack verification for an integration-broken candidate (backend/frontend field-name mismatch)",
    async () => {
      const base = await baseSnapshot();
      const files = withOverrides(base, {
        "backend/src/app.ts": readFixture("integration-broken/backend-app.ts"),
        // Reference (unmodified) frontend: still expects snake_case attendee_name/
        // attendee_email from the backend, per the documented contract.
        "frontend/src/App.tsx": readContent("solution/step-2/frontend/src/App.tsx"),
      });

      const result = await verifyStepOnServer({
        scenarioSlug: SCENARIO_SLUG,
        step: { id: STEP_ID, harness: "component" },
        files,
      });

      expect(result.status).not.toBe("passed");
      expect(result.passed).toBe(false);

      // The integration layer (real frontend + real backend running together)
      // must be the one catching this — not just skipped.
      const integrationResult = result.testResults.find((t) => t.name === "integration");
      expect(integrationResult).toBeDefined();
      expect(integrationResult?.status).toBe("failed");
    },
    180_000,
  );
});
