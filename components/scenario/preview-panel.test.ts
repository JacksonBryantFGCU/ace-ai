import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PreviewPanel } from "@/components/scenario/preview-panel";
import { initSession } from "@/lib/scenarios/session";
import { loadScenario } from "@/server/scenarios/load";

vi.mock("@/actions/api-preview", () => ({
  runApiPreview: vi.fn(),
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
});
