import { describe, expect, it } from "vitest";
import { createPreviewRendererRegistry, type PreviewRenderer } from "@/lib/scenarios/preview/renderer";

const fakeRenderer: PreviewRenderer = {
  kind: "component",
  render: () => "rendered output",
};

describe("createPreviewRendererRegistry", () => {
  it("returns the registered renderer for its kind", () => {
    const registry = createPreviewRendererRegistry([fakeRenderer]);
    expect(registry.get("component")).toBe(fakeRenderer);
  });

  it("returns undefined for a kind with no registered renderer", () => {
    const registry = createPreviewRendererRegistry([]);
    expect(registry.get("component")).toBeUndefined();
  });

  it("registers by kind, not by insertion order (last one wins if duplicated)", () => {
    const first: PreviewRenderer = { kind: "component", render: () => "first" };
    const second: PreviewRenderer = { kind: "component", render: () => "second" };
    const registry = createPreviewRendererRegistry([first, second]);
    expect(registry.get("component")).toBe(second);
  });
});
