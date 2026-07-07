import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPreviewBundle } from "@/server/scenarios/load";

/**
 * `loadPreviewBundle` is tested against a throwaway temp directory (not real
 * scenario content under `content/interview-scenarios/`) so this phase adds
 * zero scenario changes while still exercising the loader's preview logic.
 */

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

function makeScenarioDir(): string {
  dir = mkdtempSync(join(tmpdir(), "preview-loader-"));
  return dir;
}

describe("loadPreviewBundle", () => {
  it("returns undefined when the scenario has no preview/ folder", () => {
    const scenarioDir = makeScenarioDir();
    expect(loadPreviewBundle(scenarioDir)).toBeUndefined();
  });

  it("loads Preview.tsx verbatim when preview/ exists", () => {
    const scenarioDir = makeScenarioDir();
    mkdirSync(join(scenarioDir, "preview"));
    writeFileSync(join(scenarioDir, "preview", "Preview.tsx"), "export default function Preview() {}");

    const bundle = loadPreviewBundle(scenarioDir);
    expect(bundle).toBeDefined();
    expect(bundle?.source.preview).toBe("export default function Preview() {}");
    expect(bundle?.source.providers).toBeUndefined();
    expect(bundle?.config).toEqual({ kind: "component" });
    expect(bundle?.stories).toEqual([{ id: "default", label: "Preview" }]);
  });

  it("loads providers.tsx verbatim when present", () => {
    const scenarioDir = makeScenarioDir();
    mkdirSync(join(scenarioDir, "preview"));
    writeFileSync(join(scenarioDir, "preview", "Preview.tsx"), "// preview");
    writeFileSync(join(scenarioDir, "preview", "providers.tsx"), "// providers");

    const bundle = loadPreviewBundle(scenarioDir);
    expect(bundle?.source.providers).toBe("// providers");
  });

  it("throws when preview/ exists but Preview.tsx is missing", () => {
    const scenarioDir = makeScenarioDir();
    mkdirSync(join(scenarioDir, "preview"));
    expect(() => loadPreviewBundle(scenarioDir)).toThrow(/Preview\.tsx is missing/);
  });

  describe("stories.ts", () => {
    function withPreviewAnd(storiesSource: string) {
      const scenarioDir = makeScenarioDir();
      mkdirSync(join(scenarioDir, "preview"));
      writeFileSync(join(scenarioDir, "preview", "Preview.tsx"), "export default function Preview() {}");
      writeFileSync(join(scenarioDir, "preview", "stories.ts"), storiesSource);
      return scenarioDir;
    }

    it("parses named stories exported as `stories`", () => {
      const dir = withPreviewAnd(`
        export const stories = [
          { id: "empty", label: "Empty state" },
          { id: "many", label: "Many items", props: { count: 200 } },
        ];
      `);
      const bundle = loadPreviewBundle(dir);
      expect(bundle?.stories).toEqual([
        { id: "empty", label: "Empty state" },
        { id: "many", label: "Many items", props: { count: 200 } },
      ]);
    });

    it("parses a default-exported stories array", () => {
      const dir = withPreviewAnd(`
        export default [{ id: "loading", label: "Loading" }];
      `);
      expect(loadPreviewBundle(dir)?.stories).toEqual([{ id: "loading", label: "Loading" }]);
    });

    it("falls back to the implicit default story when the array is empty", () => {
      const dir = withPreviewAnd(`export const stories = [];`);
      expect(loadPreviewBundle(dir)?.stories).toEqual([{ id: "default", label: "Preview" }]);
    });

    it("throws when a story is missing an id or label", () => {
      const dir = withPreviewAnd(`export const stories = [{ label: "No id" }];`);
      expect(() => loadPreviewBundle(dir)).toThrow(/must have a string "id" and "label"/);
    });

    it("throws on duplicate story ids", () => {
      const dir = withPreviewAnd(`
        export const stories = [
          { id: "a", label: "A" },
          { id: "a", label: "A again" },
        ];
      `);
      expect(() => loadPreviewBundle(dir)).toThrow(/duplicate story id "a"/);
    });

    it("rejects an attempt to import another module (must be plain data)", () => {
      const dir = withPreviewAnd(`
        import { something } from "./helper";
        export const stories = [{ id: "a", label: "A", extra: something }];
      `);
      expect(() => loadPreviewBundle(dir)).toThrow(/may not import/);
    });
  });

  describe("preview.config.ts", () => {
    function withPreviewAnd(configSource: string, storiesSource?: string) {
      const scenarioDir = makeScenarioDir();
      mkdirSync(join(scenarioDir, "preview"));
      writeFileSync(join(scenarioDir, "preview", "Preview.tsx"), "export default function Preview() {}");
      writeFileSync(join(scenarioDir, "preview", "preview.config.ts"), configSource);
      if (storiesSource) writeFileSync(join(scenarioDir, "preview", "stories.ts"), storiesSource);
      return scenarioDir;
    }

    it("parses title and defaultStoryId", () => {
      const dir = withPreviewAnd(
        `export const config = { kind: "component", title: "Card list", defaultStoryId: "many" };`,
        `export const stories = [{ id: "many", label: "Many" }];`,
      );
      const bundle = loadPreviewBundle(dir);
      expect(bundle?.config).toEqual({ kind: "component", title: "Card list", defaultStoryId: "many" });
    });

    it("defaults kind to 'component' when omitted", () => {
      const dir = withPreviewAnd(`export const config = { title: "No kind set" };`);
      expect(loadPreviewBundle(dir)?.config.kind).toBe("component");
    });

    it("throws for an unknown kind", () => {
      const dir = withPreviewAnd(`export const config = { kind: "sql" };`);
      expect(() => loadPreviewBundle(dir)).toThrow(/unknown preview kind "sql"/);
    });

    it("throws when defaultStoryId doesn't match any story", () => {
      const dir = withPreviewAnd(
        `export const config = { defaultStoryId: "missing" };`,
        `export const stories = [{ id: "many", label: "Many" }];`,
      );
      expect(() => loadPreviewBundle(dir)).toThrow(/defaultStoryId "missing" does not match any story/);
    });
  });
});
