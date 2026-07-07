import { createPreviewRendererRegistry } from "@/lib/scenarios/preview/renderer";
import { apiPreviewRenderer } from "@/lib/scenarios/preview/renderers/api/api-preview-renderer";
import { componentPreviewRenderer } from "@/lib/scenarios/preview/renderers/component/component-renderer";

/**
 * The composition root wiring real renderers into the registry — mirrors
 * `server/scenarios/verification-service.ts`'s
 * `createVerificationService([createComponentEngine({ testSource })])`.
 * `lib/scenarios/preview/renderer.ts` stays a generic, renderer-agnostic
 * contracts file (like `lib/scenarios/verification.ts`); it never imports a
 * concrete renderer. A new preview kind is wired in by adding it to this
 * array — never by touching the registry or the runtime.
 */
export const previewRendererRegistry = createPreviewRendererRegistry([componentPreviewRenderer, apiPreviewRenderer]);
