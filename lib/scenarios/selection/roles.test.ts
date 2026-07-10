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

const machineLearningScenario = {
  category: "machine-learning-python",
  type: "machine-learning",
  jobRoles: ["machine-learning"],
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

  it("keeps machine-learning scenarios out of every other track, loose or strict", () => {
    expect(roleMatchForScenario(machineLearningScenario, "frontend").allowed).toBe(false);
    expect(roleMatchForScenario(machineLearningScenario, "backend").allowed).toBe(false);
    expect(roleMatchForScenario(machineLearningScenario, "fullstack").allowed).toBe(false);
    expect(interviewTrackMatchForScenario(machineLearningScenario, "fullstack").allowed).toBe(false);
  });

  it("keeps other tracks out of the machine-learning track, loose or strict", () => {
    expect(roleMatchForScenario(frontendScenario, "machine-learning").allowed).toBe(false);
    expect(roleMatchForScenario(backendScenario, "machine-learning").allowed).toBe(false);
    expect(roleMatchForScenario(fullstackScenario, "machine-learning").allowed).toBe(false);
    expect(interviewTrackMatchForScenario(frontendScenario, "machine-learning").allowed).toBe(false);
    expect(interviewTrackMatchForScenario(backendScenario, "machine-learning").allowed).toBe(false);
    expect(interviewTrackMatchForScenario(fullstackScenario, "machine-learning").allowed).toBe(false);
  });

  it("matches a machine-learning scenario to a machine-learning request", () => {
    expect(roleMatchForScenario(machineLearningScenario, "machine-learning").allowed).toBe(true);
    expect(interviewTrackMatchForScenario(machineLearningScenario, "machine-learning").allowed).toBe(true);
  });
});
