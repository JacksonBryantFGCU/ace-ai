import { describe, expect, it } from "vitest";
import { listScenarioCandidates, listScenarioPickerOptions } from "@/server/scenarios/candidates";

describe("public scenario candidate discovery", () => {
  it("includes public backend scenarios in technical selection candidates", async () => {
    const candidates = await listScenarioCandidates();
    expect(candidates.some((scenario) => scenario.slug === "notes-rest-api")).toBe(true);
  });

  it("includes public backend scenarios in the candidate scenario picker", async () => {
    const options = await listScenarioPickerOptions();
    expect(options.some((scenario) => scenario.slug === "notes-rest-api")).toBe(true);
  });
});
