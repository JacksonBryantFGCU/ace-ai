import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PreviewPanel } from "@/components/scenario/preview-panel";
import { initSession } from "@/lib/scenarios/session";
import { loadScenario } from "@/server/scenarios/load";
import type { LoadedScenario } from "@/lib/scenarios/types";

vi.mock("@/actions/api-preview", () => ({
  runApiPreview: vi.fn(),
}));
vi.mock("@/actions/fullstack-preview", () => ({
  startFullstackPreview: vi.fn(),
  stopFullstackPreview: vi.fn(),
  getFullstackPreviewLogs: vi.fn(),
}));

describe("PreviewPanel backend routing", () => {
  it("renders the API Explorer for notes-rest-api", async () => {
    const loaded = await loadScenario("notes-rest-api");
    const session = initSession(loaded.files, loaded.entry);

    const html = renderToStaticMarkup(createElement(PreviewPanel, { loaded, files: session.files }));

    expect(html).toContain("Notes API Explorer");
    expect(html).toContain("Fresh SQLite seed on every request");
    expect(html).toContain("Send");
  });

  it("renders the fullstack preview shell for fullstack scenarios", () => {
    const loaded = {
      slug: "internal-fullstack-fixture",
      category: "fullstack-react-node",
      scenario: {
        id: "internal-fullstack-fixture",
        title: "Internal Fullstack Fixture",
        summary: "Internal fixture for fullstack preview routing.",
        category: "fullstack-react-node",
        skills: ["react", "api"],
        jobRoles: ["fullstack"],
        difficulty: "medium",
        experienceMin: "entry",
        experienceMax: "senior",
        estimatedMinutes: 30,
        stack: { languages: ["typescript"], harness: "component" },
        workspace: {
          files: [
            { path: "backend/app.ts", role: "edit" },
            { path: "frontend/src/App.tsx", role: "edit" },
          ],
          entry: "frontend/src/App.tsx",
        },
        rubric: [{ criterion: "Correctness", weight: 100, detail: "Works as specified." }],
        status: "draft",
        version: 1,
        type: "fullstack",
        frontend: { framework: "react", bundler: "vite" },
        backend: { framework: "express", database: "sqlite" },
        execution: { mode: "fullstack" },
        steps: [
          {
            id: "step-1",
            kind: "implement",
            prompt: "Build it.",
            verification: "automated-tests",
            verify: { harness: "component", functionName: "App", tests: ["tests/integration/flow.spec.ts"] },
            weight: 100,
          },
        ],
      },
      sections: {},
      files: [
        { path: "backend/app.ts", role: "edit", content: "export default {};" },
        { path: "frontend/src/App.tsx", role: "edit", content: "export function App() { return null; }" },
      ],
      entry: "frontend/src/App.tsx",
    } as LoadedScenario;
    const session = initSession(loaded.files, loaded.entry);

    const html = renderToStaticMarkup(createElement(PreviewPanel, { loaded, files: session.files }));

    expect(html).toContain("Fullstack Preview");
    expect(html).toContain("App Preview");
    expect(html).toContain("API Info");
    expect(html).not.toContain("Fresh SQLite seed on every request");
  });
});
