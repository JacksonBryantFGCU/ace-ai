import { describe, expect, it } from "vitest";
import {
  FALLBACK_PROBLEMS,
  TECHNICAL_PROBLEMS,
  filterProblems,
  pickRandomProblems,
} from "@/lib/data/technical-problems";
import { codingProblemSchema } from "@/lib/validation/problem";

describe("technical problem bank", () => {
  it("every bank problem matches the canonical schema", () => {
    for (const p of TECHNICAL_PROBLEMS) {
      expect(() => codingProblemSchema.parse(p)).not.toThrow();
    }
  });

  it("filterProblems respects difficulty and topics", () => {
    const easyArrays = filterProblems("easy", ["arrays"]);
    expect(easyArrays.length).toBeGreaterThan(0);
    expect(easyArrays.every((p) => p.difficulty === "easy")).toBe(true);
    expect(easyArrays.every((p) => p.topics.includes("arrays"))).toBe(true);
  });

  it("falls back to difficulty-only when topics don't match", () => {
    const result = filterProblems("easy", ["does-not-exist"]);
    expect(result.every((p) => p.difficulty === "easy")).toBe(true);
  });

  it("pickRandomProblems returns at most the requested count", () => {
    const picked = pickRandomProblems("medium", [], 3);
    expect(picked.length).toBeLessThanOrEqual(3);
    expect(picked.every((p) => p.difficulty === "medium")).toBe(true);
  });

  it("provides a non-empty fallback set", () => {
    expect(FALLBACK_PROBLEMS.length).toBeGreaterThan(0);
  });
});
