import type { ReactNode } from "react";
import type { PreviewRendererRegistry } from "@/lib/scenarios/preview/renderer";
import type { PreviewSnapshot } from "@/lib/scenarios/preview/snapshot";
import type { ServedPreviewBundle } from "@/lib/scenarios/preview/types";

/**
 * The Preview Runtime (docs/README.md):
 * receives a snapshot, resolves a renderer for the scenario's preview `kind`,
 * and renders it. Nothing else — it has no idea what a scenario, a session, a
 * Monaco editor, verification, or Vapi is; its only inputs are the three
 * plain values below.
 *
 * A pure function, not a hook: the actual sandbox lifecycle (iframe,
 * debounce, postMessage) is owned by the `component` renderer's own React
 * component (`ComponentPreviewFrame`) once `render()` returns it — this
 * function's job ends at "resolve a renderer and hand it the snapshot."
 */
export type PreviewRuntimeStatus =
  | "no-preview" // the scenario has no `preview/` bundle
  | "unsupported-kind" // the bundle's `kind` has no registered renderer
  | "rendered"; // a renderer produced output

export interface PreviewRuntimeOutput {
  readonly status: PreviewRuntimeStatus;
  readonly node: ReactNode | null;
}

export function renderPreview(
  bundle: ServedPreviewBundle | undefined,
  snapshot: PreviewSnapshot,
  registry: PreviewRendererRegistry,
): PreviewRuntimeOutput {
  if (!bundle) return { status: "no-preview", node: null };

  const renderer = registry.get(bundle.config.kind);
  if (!renderer) return { status: "unsupported-kind", node: null };

  return { status: "rendered", node: renderer.render(snapshot, bundle) };
}
