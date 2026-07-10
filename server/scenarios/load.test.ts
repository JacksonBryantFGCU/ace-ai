import { describe, expect, it } from "vitest";
import { listScenarios, listScenarioOptions, loadScenario } from "@/server/scenarios/load";

/**
 * Integration-ish tests against the real canonical scenario on disk. These lock
 * in the serving boundary: the loader must expose the workspace and candidate
 * body, and must never leak `tests/`, `solution/`, or authored body sections.
 */

const CANONICAL = "user-directory-search";

describe("listScenarios", () => {
  it("discovers the canonical scenario", async () => {
    const summaries = await listScenarios();
    const found = summaries.find((s) => s.slug === CANONICAL);
    expect(found).toBeDefined();
    expect(found?.category).toBe("frontend-react");
    expect(found?.title).toBe("User Directory Search");
  });

  it("lists public backend scenarios in public summaries and options", async () => {
    const summaries = await listScenarios();
    expect(summaries.some((scenario) => scenario.slug === "notes-rest-api")).toBe(true);

    const options = await listScenarioOptions();
    expect(options.some((scenario) => scenario.slug === "notes-rest-api")).toBe(true);
  });
});

describe("loadScenario", () => {
  it("loads the canonical scenario with its served workspace", async () => {
    const loaded = await loadScenario(CANONICAL);
    expect(loaded.scenario.id).toBe(CANONICAL);
    expect(loaded.scenario.steps).toHaveLength(4);
    expect(loaded.entry).toBe("UserSearch.tsx");

    const paths = loaded.files.map((f) => f.path).sort();
    expect(paths).toEqual(["UserSearch.tsx", "api.ts", "types.ts"]);

    const editable = loaded.files.filter((f) => f.role === "edit").map((f) => f.path);
    expect(editable).toEqual(["UserSearch.tsx"]);

    // Contents come through (the starter stub, not the solution).
    const entry = loaded.files.find((f) => f.path === "UserSearch.tsx");
    expect(entry?.content).toContain("export function UserSearch");
    expect(entry?.content).toContain("TODO");
  });

  it("loads its preview bundle (Phase 5: the reference fixture for authored previews)", async () => {
    const loaded = await loadScenario(CANONICAL);
    expect(loaded.preview).toBeDefined();
    expect(loaded.preview?.config.kind).toBe("component");
    expect(loaded.preview?.stories.map((s) => s.id)).toEqual(["default", "empty", "large-dataset", "loading", "mobile"]);
    expect(loaded.preview?.source.preview).toContain("scenario:entry");
  });

  it("loads the notes-rest-api API preview bundle without component source", async () => {
    const loaded = await loadScenario("notes-rest-api");
    expect(loaded.preview).toBeDefined();
    expect(loaded.preview?.config).toMatchObject({
      kind: "api",
      title: "Notes API Explorer",
      defaultStoryId: "list-notes",
    });
    expect(loaded.preview?.stories).toEqual([]);
    expect(loaded.preview?.source.preview).toBeUndefined();
    expect(loaded.preview?.source.api?.defaultExampleId).toBe("list-notes");
    expect(loaded.preview?.source.api?.examples.map((example) => example.id)).toEqual([
      "list-notes",
      "get-note",
      "create-note",
      "delete-note",
    ]);
  });

  it("strips authored-only artifacts from the served model", async () => {
    const loaded = await loadScenario(CANONICAL);
    // No authored body sections.
    expect(loaded.sections["Reference Solutions"]).toBeUndefined();
    expect(loaded.sections["Evaluation Notes"]).toBeUndefined();
    // Candidate-facing sections remain.
    expect(loaded.sections["Overview"]).toBeDefined();
    // No test/solution file contents leaked into the served workspace.
    const serialized = JSON.stringify(loaded.files);
    expect(serialized).not.toContain("vi.mock");
    expect(serialized).not.toContain("ignore = true");
  });

  it("throws on an unknown slug", async () => {
    await expect(loadScenario("does-not-exist")).rejects.toThrow(/scenario not found/);
  });

  it("freezes the authored model so runtime code cannot mutate it", async () => {
    const loaded = await loadScenario(CANONICAL);
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.scenario)).toBe(true);
    expect(Object.isFrozen(loaded.scenario.steps)).toBe(true);
    expect(Object.isFrozen(loaded.files[0])).toBe(true);
    expect(() => {
      (loaded.files[0] as { content: string }).content = "hacked";
    }).toThrow();
  });

  it("excludes author-only grading data when includeAuthorOnly is false", async () => {
    const candidate = await loadScenario(CANONICAL, { includeAuthorOnly: false });
    expect(candidate.scenario.rubric).toEqual([]);
    expect(candidate.scenario.steps.every((s) => s.rubric === undefined)).toBe(true);
    // The workspace and prompts still come through — only grading data is withheld.
    expect(candidate.files).toHaveLength(3);
    expect(candidate.scenario.steps[0]?.prompt).toBeTruthy();
  });

  it("reuses the same frozen loaded scenario within the cache window", async () => {
    const first = await loadScenario(CANONICAL, { includeAuthorOnly: false });
    const second = await loadScenario(CANONICAL, { includeAuthorOnly: false });
    expect(second).toBe(first);
  });
});
