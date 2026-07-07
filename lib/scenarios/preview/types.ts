/**
 * Authored preview contracts — the data shape produced by loading a scenario's
 * optional `preview/` folder. PURE: no React, no server-only, no execution of
 * authored source. See docs/README.md.
 *
 * Component scenarios provide a sandboxed visual preview. Backend Express
 * scenarios provide an API Explorer preview configured by `preview/api.config.ts`.
 */
import type { ApiPreviewConfig } from "@/lib/scenarios/preview/api";

/** Preview renderer kind. Widened by adding renderer implementations to the registry. */
export type PreviewKind = "component" | "api";

export interface PreviewConfig {
  kind: PreviewKind;
  title?: string;
  defaultStoryId?: string;
}

/** An authored, named rendering state. Plain, serializable data only — no
 *  functions, no React elements. */
export interface PreviewStory {
  id: string;
  label: string;
  description?: string;
  props?: Record<string, unknown>;
  viewport?: "mobile" | "desktop" | { width: number; height: number };
  theme?: "light" | "dark";
}

/**
 * The candidate-facing preview bundle attached to `LoadedScenario.preview`.
 * `source` carries authored `Preview.tsx`/`providers.tsx` verbatim — nothing
 * in this bundle is ever executed server-side.
 */
export interface ServedPreviewBundle {
  config: PreviewConfig;
  stories: PreviewStory[];
  source: {
    preview?: string;
    providers?: string;
    /** Optional authored `preview/preview.css` — an advanced, per-scenario
     *  stylesheet layered on top of the shared `.preview-canvas` base/tokens
     *  and injected into the sandbox document. Absent when the scenario ships
     *  no `preview.css`, in which case the preview renders on the base alone. */
    css?: string;
    /** API Explorer examples for backend preview scenarios. */
    api?: ApiPreviewConfig;
  };
}

/** The single story every bundle carries when `stories.ts` is absent, empty,
 *  or (today) not yet parsed. */
export const DEFAULT_PREVIEW_STORY: PreviewStory = { id: "default", label: "Preview" };
