import type { ReactNode } from "react";
import type { PreviewKind, ServedPreviewBundle } from "@/lib/scenarios/preview/types";
import type { PreviewSnapshot } from "@/lib/scenarios/preview/snapshot";

/**
 * A pluggable preview renderer for one `PreviewKind` — mirrors
 * `VerificationEngine` (`lib/scenarios/verification.ts`). Deliberately tiny:
 * no lifecycle beyond a plain render call, no plugins, no event bus. Stays a
 * generic, renderer-agnostic contracts file — like `verification.ts`, it
 * never imports a concrete renderer; those are wired in at a composition
 * root (`renderers/registry.ts`).
 *
 * `bundle` was added in Phase 2 alongside the first real renderer — it needs
 * the authored `Preview.tsx`/`providers.tsx` source, which the snapshot alone
 * doesn't carry (Phase 1 deliberately left this open; see the Phase 1 notes
 * in this file's history).
 */
export interface PreviewRenderer {
  readonly kind: PreviewKind;
  render(snapshot: PreviewSnapshot, bundle: ServedPreviewBundle): ReactNode;
}

/**
 * The empty, generic baseline — no renderer is wired in here. Real renderers
 * are composed in `lib/scenarios/preview/renderers/registry.ts`; appending to
 * a renderer list is how a new preview kind goes live, but that list lives at
 * the composition root, not in this contracts file.
 */
export const defaultPreviewRenderers: PreviewRenderer[] = [];

export interface PreviewRendererRegistry {
  get(kind: PreviewKind): PreviewRenderer | undefined;
}

/**
 * Create a stateless registry over a set of renderers, dispatched by `kind` —
 * mirrors `createVerificationService`'s engine map (`lib/scenarios/verification.ts`).
 */
export function createPreviewRendererRegistry(
  renderers: readonly PreviewRenderer[],
): PreviewRendererRegistry {
  const registry = new Map(renderers.map((renderer) => [renderer.kind, renderer]));
  return {
    get: (kind) => registry.get(kind),
  };
}

/** The empty baseline registry — real call sites use
 *  `previewRendererRegistry` from `renderers/registry.ts` instead. */
export const defaultPreviewRendererRegistry = createPreviewRendererRegistry(defaultPreviewRenderers);
