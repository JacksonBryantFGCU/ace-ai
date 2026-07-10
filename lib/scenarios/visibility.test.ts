import { describe, expect, it } from "vitest";
import { isPublicScenario, scenarioVisibility } from "@/lib/scenarios/visibility";
import type { Scenario } from "@/lib/scenarios/schema";

/**
 * `isPublicScenario` is the single gate `server/scenarios/candidates.ts` uses to
 * build the public picker's scenario pool. These are type-agnostic — an internal
 * scenario is hidden regardless of `type`, including `machine-learning` (Phase 5:
 * internal ML reference fixtures must never leak into the public picker). Uses an
 * internal fixture only; no public ML scenario content is authored here.
 */
function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return { visibility: undefined, ...overrides } as Scenario;
}

describe("scenarioVisibility / isPublicScenario", () => {
  it("treats a scenario with no visibility field as public", () => {
    expect(scenarioVisibility(scenario())).toBe("public");
    expect(isPublicScenario(scenario())).toBe(true);
  });

  it("treats visibility: internal as internal, regardless of type", () => {
    const internalMl = scenario({ type: "machine-learning", visibility: "internal" });
    expect(scenarioVisibility(internalMl)).toBe("internal");
    expect(isPublicScenario(internalMl)).toBe(false);
  });

  it("treats visibility: public as public for machine-learning scenarios", () => {
    const publicMl = scenario({ type: "machine-learning", visibility: "public" });
    expect(isPublicScenario(publicMl)).toBe(true);
  });
});
