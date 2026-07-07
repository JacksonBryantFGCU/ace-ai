import { describe, expect, it } from "vitest";
import { rankScenarios, selectScenario, selectScenarioResult } from "@/lib/scenarios/selection/select-scenario";
import type { ScenarioCandidate, SelectionCriteria } from "@/lib/scenarios/selection/types";

function cand(partial: Partial<ScenarioCandidate> & { slug: string }): ScenarioCandidate {
  return {
    slug: partial.slug,
    interviewTypes: partial.interviewTypes ?? ["technical"],
    jobRoles: partial.jobRoles ?? ["frontend"],
    category: partial.category ?? "frontend-react",
    difficulty: partial.difficulty ?? "medium",
    languages: partial.languages ?? ["typescript"],
    runtime: partial.runtime,
    framework: partial.framework,
    experienceMin: partial.experienceMin ?? "entry",
    experienceMax: partial.experienceMax ?? "senior",
    status: partial.status ?? "verified",
  };
}

const criteria: SelectionCriteria = {
  interviewType: "technical",
  jobRole: "frontend",
  difficulty: "medium",
  experience: "junior",
  language: "typescript",
  category: "frontend-react",
};

// Deterministic RNG: replay a fixed sequence of [0,1) values.
const rng = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
};

describe("selectScenario — matching", () => {
  it("returns an exact match with no relaxations", () => {
    const result = selectScenario([cand({ slug: "a" })], criteria);
    expect(result?.candidate.slug).toBe("a");
    expect(result?.relaxed).toEqual([]);
    expect(result?.penalty).toBe(0);
  });

  it("returns null when the pool is empty", () => {
    expect(selectScenario([], criteria)).toBeNull();
  });

  it("treats interview type as a hard prerequisite (never relaxed)", () => {
    const behavioral: SelectionCriteria = { ...criteria, interviewType: "behavioral" };
    expect(selectScenario([cand({ slug: "a" })], behavioral)).toBeNull();
  });

  it("respects the eligible-status filter", () => {
    const pool = [cand({ slug: "draft", status: "draft" }), cand({ slug: "ok", status: "verified" })];
    const result = selectScenario(pool, criteria, { eligibleStatuses: ["verified", "review"] });
    expect(result?.candidate.slug).toBe("ok");
    expect(selectScenario([cand({ slug: "d", status: "draft" })], criteria, { eligibleStatuses: ["verified"] })).toBeNull();
  });

  it("matches experience within the candidate's range and penalizes outside it", () => {
    const inRange = cand({ slug: "in", experienceMin: "entry", experienceMax: "senior" });
    const outRange = cand({ slug: "out", experienceMin: "senior", experienceMax: "senior" });
    expect(selectScenario([inRange], criteria)?.relaxed).toEqual([]);
    expect(selectScenario([outRange], criteria)?.relaxed).toEqual(["experience"]);
  });

  it("ignores optional criteria that are absent (no language/category constraint)", () => {
    const minimal: SelectionCriteria = { interviewType: "technical", jobRole: "frontend" };
    const result = selectScenario([cand({ slug: "a", languages: ["python"], category: "backend-sql" })], minimal);
    expect(result?.relaxed).toEqual([]); // language/category not asked for → not relaxed
  });

  it("matches job role case-insensitively across the scenario's roles", () => {
    const result = selectScenario([cand({ slug: "a", jobRoles: ["Fullstack", "Frontend"] })], criteria);
    expect(result?.relaxed).toEqual([]);
  });
});

describe("selectScenario — fallback / relaxation", () => {
  it("relaxes the least-important constraint first (category before difficulty)", () => {
    const byCategory = cand({ slug: "cat", category: "frontend-vue" }); // category mismatch only
    const byDifficulty = cand({ slug: "diff", difficulty: "hard" }); // difficulty mismatch only
    const result = selectScenario([byDifficulty, byCategory], criteria, { random: rng(0) });
    expect(result?.candidate.slug).toBe("cat");
    expect(result?.relaxed).toEqual(["category"]);
  });

  it("protects difficulty before experience range relaxation", () => {
    const X = cand({ slug: "wrongExp", experienceMin: "senior", experienceMax: "senior" });
    const Y = cand({ slug: "wrongDifficulty", difficulty: "hard" });
    const result = selectScenario([X, Y], criteria, { random: rng(0) });
    expect(result?.candidate.slug).toBe("wrongExp");
    expect(result?.relaxed).toContain("experience");
    expect(result?.relaxed).not.toContain("difficulty");
  });

  it("relaxes experience only when there is no alternative", () => {
    const onlyOutOfRange = cand({ slug: "only", experienceMin: "intern", experienceMax: "entry" });
    const result = selectScenario([onlyOutOfRange], criteria);
    expect(result?.candidate.slug).toBe("only");
    expect(result?.relaxed).toContain("experience");
  });

  it("always returns the closest valid scenario (minimum penalty)", () => {
    const near = cand({ slug: "near", category: "other" }); // penalty 1
    const far = cand({ slug: "far", category: "other", languages: ["go"] }); // penalty 1+8=9
    const result = selectScenario([far, near], criteria, { random: rng(0) });
    expect(result?.candidate.slug).toBe("near");
    expect(result?.penalty).toBe(1);
  });

  it("reports every relaxed constraint", () => {
    const c = cand({ slug: "c", category: "other", languages: ["python"] });
    const result = selectScenario([c], criteria);
    expect(new Set(result?.relaxed)).toEqual(new Set(["category", "language"]));
    expect(result?.penalty).toBe(1 + 2);
  });

  it("honors a custom relaxation priority", () => {
    // Make difficulty the least important → it should be relaxed before category.
    const byCategory = cand({ slug: "cat", category: "other" });
    const byDifficulty = cand({ slug: "diff", difficulty: "hard" });
    const result = selectScenario([byCategory, byDifficulty], criteria, {
      random: rng(0),
      priority: ["difficulty", "category", "language", "framework", "runtime", "experience", "jobRole"],
    });
    expect(result?.candidate.slug).toBe("diff");
  });
});

describe("selectScenario — randomization & exclusion", () => {
  const three = [cand({ slug: "m0" }), cand({ slug: "m1" }), cand({ slug: "m2" })];

  it("chooses stably by slug among equally-good matches by default", () => {
    expect(selectScenario([three[2]!, three[0]!, three[1]!], criteria)?.candidate.slug).toBe("m0");
  });

  it("can use an injected RNG seam among equally-good matches", () => {
    expect(selectScenario(three, criteria, { random: rng(0) })?.candidate.slug).toBe("m0");
    expect(selectScenario(three, criteria, { random: rng(0.5) })?.candidate.slug).toBe("m1");
    expect(selectScenario(three, criteria, { random: rng(0.99) })?.candidate.slug).toBe("m2");
  });

  it("spreads picks across the whole best tier over many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seen.add(selectScenario(three, criteria, { random: rng(i / 30) })!.candidate.slug);
    }
    expect(seen).toEqual(new Set(["m0", "m1", "m2"]));
  });

  it("excludes recently completed scenarios from the best tier", () => {
    const result = selectScenario(three, criteria, { exclude: ["m0", "m2"], random: rng(0) });
    expect(result?.candidate.slug).toBe("m1"); // only fresh one, regardless of RNG
    expect(result?.repeatedRecent).toBe(false);
  });

  it("falls back to a repeat only when EVERY best match is recent", () => {
    const result = selectScenario([cand({ slug: "only" })], criteria, { exclude: ["only"] });
    expect(result?.candidate.slug).toBe("only");
    expect(result?.repeatedRecent).toBe(true);
  });

  it("does not trade match quality for freshness (best recent beats worse fresh)", () => {
    const exactRecent = cand({ slug: "exact" });
    const relaxedFresh = cand({ slug: "fresh", category: "other" });
    const result = selectScenario([exactRecent, relaxedFresh], criteria, { exclude: ["exact"] });
    expect(result?.candidate.slug).toBe("exact"); // exact match wins even though recent
    expect(result?.repeatedRecent).toBe(true);
  });
});

describe("selectScenario — strict role boundaries", () => {
  it("frontend role never selects a backend-only scenario", () => {
    const result = selectScenario(
      [cand({ slug: "api", jobRoles: ["backend"], category: "backend-node" })],
      { ...criteria, jobRole: "frontend" },
    );
    expect(result).toBeNull();
  });

  it("backend role never selects a frontend-only scenario", () => {
    const result = selectScenario(
      [cand({ slug: "ui", jobRoles: ["frontend"], category: "frontend-react" })],
      { ...criteria, jobRole: "backend", category: undefined },
    );
    expect(result).toBeNull();
  });

  it("fullstack can select frontend, backend, and fullstack scenarios", () => {
    const pool = [
      cand({ slug: "frontend", jobRoles: ["frontend"], category: "frontend-react" }),
      cand({ slug: "backend", jobRoles: ["backend"], category: "backend-node" }),
      cand({ slug: "fullstack", jobRoles: ["fullstack"], category: "fullstack-node-react" }),
    ];
    const ranked = rankScenarios(pool, { ...criteria, jobRole: "fullstack", category: undefined });
    expect(ranked.map((item) => item.candidate.slug)).toEqual(["fullstack", "backend", "frontend"]);
  });

  it("difficulty relaxation stays inside the role boundary", () => {
    const result = selectScenario(
      [
        cand({ slug: "frontend-medium", jobRoles: ["frontend"], category: "frontend-react", difficulty: "medium" }),
        cand({ slug: "backend-hard", jobRoles: ["backend"], category: "backend-node", difficulty: "hard" }),
      ],
      { ...criteria, jobRole: "backend", difficulty: "medium", category: undefined },
    );
    expect(result?.candidate.slug).toBe("backend-hard");
    expect(result?.relaxed).toContain("difficulty");
  });

  it("no matching role returns a structured no-scenario result", () => {
    const result = selectScenarioResult(
      [cand({ slug: "ui", jobRoles: ["frontend"], category: "frontend-react" })],
      { ...criteria, jobRole: "backend", category: undefined },
    );
    expect(result).toMatchObject({
      status: "empty",
      reason: "no-role-match",
      message: "No backend scenarios are available yet.",
    });
  });

  it("exact role match outranks category-only fallback", () => {
    const exact = cand({ slug: "exact", jobRoles: ["backend"], category: "backend-node" });
    const fallback = cand({ slug: "fallback", jobRoles: [], category: "backend-node" });
    const result = selectScenario([fallback, exact], {
      ...criteria,
      jobRole: "backend",
      category: undefined,
    });
    expect(result?.candidate.slug).toBe("exact");
    expect(result?.relaxed).toEqual([]);
  });
});

describe("selectScenario — real scenario regressions", () => {
  it("backend notes-rest-api is selected for Backend Engineer when appropriate", () => {
    const result = selectScenario(
      [
        cand({ slug: "todo-list", jobRoles: ["frontend"], category: "frontend-react", difficulty: "easy" }),
        cand({ slug: "notes-rest-api", jobRoles: ["backend"], category: "backend-node", difficulty: "easy" }),
      ],
      { interviewType: "technical", jobRole: "backend", difficulty: "easy", experience: "junior" },
    );
    expect(result?.candidate.slug).toBe("notes-rest-api");
  });
});

describe("rankScenarios — reusable scoring", () => {
  it("orders eligible candidates closest-first and drops ineligible ones", () => {
    const pool = [
      cand({ slug: "far", category: "other", languages: ["go"] }), // penalty 9
      cand({ slug: "exact" }), // penalty 0
      cand({ slug: "behavioral-only", interviewTypes: ["behavioral"] }), // ineligible
      cand({ slug: "near", category: "other" }), // penalty 1
    ];
    const ranked = rankScenarios(pool, criteria);
    expect(ranked.map((r) => r.candidate.slug)).toEqual(["exact", "near", "far"]);
    expect(ranked[0]!.penalty).toBe(0);
  });

  it("puts fresh candidates before recent ones on a penalty tie", () => {
    const ranked = rankScenarios([cand({ slug: "recent" }), cand({ slug: "fresh" })], criteria, {
      exclude: ["recent"],
    });
    expect(ranked.map((r) => r.candidate.slug)).toEqual(["fresh", "recent"]);
  });
});
