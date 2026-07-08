import { describe, expect, it } from "vitest";
import { interviewTrackMatchForScenario, roleMatchForScenario } from "@/lib/scenarios/selection/roles";

const frontendScenario = {
  category: "frontend-react",
  type: "frontend",
  jobRoles: ["frontend"],
};

const backendScenario = {
  category: "backend-node",
  type: "backend",
  jobRoles: ["backend"],
};

const fullstackScenario = {
  category: "fullstack-react-node",
  type: "fullstack",
  jobRoles: ["fullstack"],
};

describe("role matching", () => {
  it("keeps the broad selector match for fullstack recommendations", () => {
    expect(roleMatchForScenario(frontendScenario, "fullstack").allowed).toBe(true);
    expect(roleMatchForScenario(backendScenario, "fullstack").allowed).toBe(true);
    expect(roleMatchForScenario(fullstackScenario, "fullstack").allowed).toBe(true);
  });

  it("uses a strict track boundary for the live fullstack interview picker and launch flow", () => {
    expect(interviewTrackMatchForScenario(frontendScenario, "fullstack").allowed).toBe(false);
    expect(interviewTrackMatchForScenario(backendScenario, "fullstack").allowed).toBe(false);
    expect(interviewTrackMatchForScenario(fullstackScenario, "fullstack").allowed).toBe(true);
  });
});
