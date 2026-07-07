import type { PreviewRenderer } from "@/lib/scenarios/preview/renderer";
import { ApiPreviewExplorer } from "@/components/scenario/preview/api-preview-explorer";

export const apiPreviewRenderer: PreviewRenderer = {
  kind: "api",
  render: (snapshot, bundle) => {
    if (!bundle.source.api) return null;
    return <ApiPreviewExplorer snapshot={snapshot} config={bundle.source.api} />;
  },
};
