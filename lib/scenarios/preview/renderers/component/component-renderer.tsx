import type { PreviewRenderer } from "@/lib/scenarios/preview/renderer";
import { ComponentPreviewFrame } from "@/components/scenario/preview/component-preview-frame";

/**
 * The first (only) preview renderer: mounts the candidate's live component
 * inside a sandboxed iframe (docs/README.md
 * §9, §11-14). Its only inputs are the snapshot + the authored bundle — it
 * has no idea what an interview, a scenario, or a session is.
 */
export const componentPreviewRenderer: PreviewRenderer = {
  kind: "component",
  render: (snapshot, bundle) => {
    if (!bundle.source.preview) return null;
    return <ComponentPreviewFrame snapshot={snapshot} bundle={bundle} />;
  },
};
