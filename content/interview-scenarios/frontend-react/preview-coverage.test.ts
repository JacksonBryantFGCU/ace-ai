import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadScenario } from "@/server/scenarios/load";
import type { ServedPreviewBundle } from "@/lib/scenarios/preview/types";

/**
 * Phase 5 cross-scenario consistency checks: every frontend scenario in this
 * set has a preview, its stories/config resolve correctly, and the authored
 * source follows the same conventions (no runtime imports, deterministic
 * rendering, consistent naming) across the whole set — not per-scenario
 * behavior, which `lib/scenarios/authoring/preview.test.ts` already covers.
 */

const FRONTEND_SCENARIOS = [
  "todo-list",
  "kanban-board",
  "shopping-cart",
  "multi-step-form-wizard",
  "paginated-data-table",
  "markdown-editor",
  "analytics-dashboard",
  "file-explorer",
  "user-directory-search",
];

const CONTENT_ROOT = join(process.cwd(), "content", "interview-scenarios", "frontend-react");

function previewSourceOf(slug: string): string {
  return readFileSync(join(CONTENT_ROOT, slug, "preview", "Preview.tsx"), "utf8");
}

describe("frontend scenario preview coverage", () => {
  it.each(FRONTEND_SCENARIOS)("%s has a preview bundle", async (slug) => {
    const loaded = await loadScenario(slug);
    expect(loaded.preview, `${slug} is missing a preview/ folder`).toBeDefined();
  });

  it("no frontend scenario is missing a preview (Phase 5 requirement)", async () => {
    const missing: string[] = [];
    for (const slug of FRONTEND_SCENARIOS) {
      const loaded = await loadScenario(slug);
      if (!loaded.preview) missing.push(slug);
    }
    expect(missing).toEqual([]);
  });
});

describe("frontend scenario preview stories resolve correctly", () => {
  it.each(FRONTEND_SCENARIOS)("%s's defaultStoryId resolves to a real story", async (slug) => {
    const loaded = await loadScenario(slug);
    const preview = loaded.preview as ServedPreviewBundle;
    const defaultId = preview.config.defaultStoryId;
    expect(defaultId).toBeDefined();
    expect(preview.stories.some((s) => s.id === defaultId)).toBe(true);
  });

  it.each(FRONTEND_SCENARIOS)("%s declares the standardized default/empty/large-dataset story set", async (slug) => {
    const loaded = await loadScenario(slug);
    const ids = (loaded.preview as ServedPreviewBundle).stories.map((s) => s.id);
    expect(ids).toContain("default");
    expect(ids).toContain("empty");
    expect(ids).toContain("large-dataset");
  });

  it.each(FRONTEND_SCENARIOS)("%s has no duplicate story ids", async (slug) => {
    const loaded = await loadScenario(slug);
    const ids = (loaded.preview as ServedPreviewBundle).stories.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("frontend scenario preview source hygiene", () => {
  it.each(FRONTEND_SCENARIOS)("%s's Preview.tsx never imports interview runtime or execution engines", (slug) => {
    const src = previewSourceOf(slug);
    expect(src).not.toMatch(/interview-machine|verification\.ts|checkpoints\.ts|browser-test-runtime/);
  });

  it.each(FRONTEND_SCENARIOS)("%s's Preview.tsx renders the live candidate entry via scenario:entry", (slug) => {
    const src = previewSourceOf(slug);
    expect(src).toContain('"scenario:entry"');
  });

  it.each(FRONTEND_SCENARIOS)("%s's Preview.tsx has no debug artifacts (console.log/TODO/FIXME)", (slug) => {
    const src = previewSourceOf(slug);
    expect(src).not.toMatch(/console\.(log|debug)\(/);
    expect(src).not.toMatch(/\b(TODO|FIXME)\b/);
  });
});

describe("frontend scenario preview viewport story", () => {
  it.each(FRONTEND_SCENARIOS)("%s has a mobile story pinning a narrow viewport (consistent viewport behavior)", async (slug) => {
    const loaded = await loadScenario(slug);
    const stories = (loaded.preview as ServedPreviewBundle).stories;
    const mobile = stories.find((s) => s.id === "mobile");
    expect(mobile, `${slug} has no mobile story`).toBeDefined();
    expect(mobile?.viewport).toBe("mobile");
  });
});

describe("frontend scenario preview determinism", () => {
  it.each(FRONTEND_SCENARIOS)("%s's story props are the same across repeated loads (deterministic)", async (slug) => {
    const first = await loadScenario(slug);
    const second = await loadScenario(slug);
    const a = (first.preview as ServedPreviewBundle).stories;
    const b = (second.preview as ServedPreviewBundle).stories;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
