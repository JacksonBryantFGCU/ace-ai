import { describe, expect, it } from "vitest";
import { createPreviewRendererRegistry, type PreviewRenderer } from "@/lib/scenarios/preview/renderer";
import { createPreviewSnapshot } from "@/lib/scenarios/preview/snapshot";
import { renderPreview } from "@/lib/scenarios/preview/runtime";
import type { Scenario } from "@/lib/scenarios/schema";
import type { ServedPreviewBundle } from "@/lib/scenarios/preview/types";
import type { SessionFile } from "@/lib/scenarios/types";

const SCENARIO = { workspace: { entry: "UserSearch.tsx" } } as unknown as Scenario;
const FILES: SessionFile[] = [
  { id: "1", path: "UserSearch.tsx", content: "// entry", role: "edit", origin: "authored" },
];
const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });

const BUNDLE: ServedPreviewBundle = {
  config: { kind: "component" },
  stories: [{ id: "default", label: "Preview" }],
  source: { preview: "// authored Preview.tsx source" },
};

describe("renderPreview", () => {
  it("reports 'no-preview' when the scenario has no preview bundle", () => {
    const registry = createPreviewRendererRegistry([]);
    const result = renderPreview(undefined, snapshot, registry);
    expect(result).toEqual({ status: "no-preview", node: null });
  });

  it("reports 'unsupported-kind' when no renderer is registered for the bundle's kind", () => {
    const registry = createPreviewRendererRegistry([]);
    const result = renderPreview(BUNDLE, snapshot, registry);
    expect(result).toEqual({ status: "unsupported-kind", node: null });
  });

  it("resolves the renderer for the bundle's kind and renders the snapshot", () => {
    let received: unknown;
    const renderer: PreviewRenderer = {
      kind: "component",
      render: (snap) => {
        received = snap;
        return "rendered!";
      },
    };
    const registry = createPreviewRendererRegistry([renderer]);
    const result = renderPreview(BUNDLE, snapshot, registry);
    expect(result).toEqual({ status: "rendered", node: "rendered!" });
    expect(received).toBe(snapshot);
  });

  it("passes the bundle through to the renderer alongside the snapshot", () => {
    let receivedBundle: unknown;
    const renderer: PreviewRenderer = {
      kind: "component",
      render: (_snap, bundle) => {
        receivedBundle = bundle;
        return "rendered!";
      },
    };
    const registry = createPreviewRendererRegistry([renderer]);
    renderPreview(BUNDLE, snapshot, registry);
    expect(receivedBundle).toBe(BUNDLE);
  });
});
