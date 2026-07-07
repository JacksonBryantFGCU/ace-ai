import { describe, expect, it } from "vitest";
import { previewRendererRegistry } from "@/lib/scenarios/preview/renderers/registry";
import { apiPreviewRenderer } from "@/lib/scenarios/preview/renderers/api/api-preview-renderer";
import { componentPreviewRenderer } from "@/lib/scenarios/preview/renderers/component/component-renderer";

describe("previewRendererRegistry", () => {
  it("registers the component renderer under kind 'component'", () => {
    expect(previewRendererRegistry.get("component")).toBe(componentPreviewRenderer);
  });

  it("registers the API preview renderer under kind 'api'", () => {
    expect(previewRendererRegistry.get("api")).toBe(apiPreviewRenderer);
  });
});
