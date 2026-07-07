// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { loadScenario } from "@/server/scenarios/load";
import { mountPreview, unmountPreview } from "@/lib/scenarios/preview/renderers/component/mount";
import type { ServedPreviewBundle } from "@/lib/scenarios/preview/types";

/**
 * End-to-end regression test for the real preview pipeline against REAL
 * scenario content — the same compile → link → render path the sandbox runs
 * (`lib/scenarios/preview/renderers/component/mount.tsx`), fed with each
 * scenario's actual workspace files and authored preview source. This is
 * what caught the "Element type is invalid... got: undefined" bug: every
 * scenario's `Preview.tsx` imported the candidate entry as a DEFAULT import
 * (`import CandidateEntry from "scenario:entry"`), but every real workspace
 * entry component is a NAMED export — so `CandidateEntry` was `undefined`.
 * `lib/scenarios/authoring/preview.test.ts` and `preview-coverage.test.ts`
 * don't catch this because neither one actually EXECUTES the compiled
 * preview against real content; this test does, on purpose.
 */

/** React's root.render() commits asynchronously, so `mountPreview`'s own
 *  promise resolving doesn't guarantee `onRendered`/`onError` has fired yet —
 *  poll for either, mirroring `mount.test.ts`'s own approach. */
function waitForOutcome(onRendered: ReturnType<typeof vi.fn>, onError: ReturnType<typeof vi.fn>, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    (function poll() {
      if (onRendered.mock.calls.length > 0 || onError.mock.calls.length > 0) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error("timed out waiting for render outcome"));
      setTimeout(poll, 10);
    })();
  });
}

const FRONTEND_SCENARIOS = [
  "todo-list",
  "kanban-board",
  "shopping-cart",
  "multi-step-form-wizard",
  "paginated-data-table",
  "markdown-editor",
  "analytics-dashboard",
  "file-explorer",
  "user-directory-search",
];

describe("frontend scenario previews actually render against real workspace content", () => {
  it.each(FRONTEND_SCENARIOS)("%s renders every authored story without a compile or runtime error", async (slug) => {
    const loaded = await loadScenario(slug);
    const preview = loaded.preview as ServedPreviewBundle;
    expect(preview).toBeDefined();

    for (const story of preview.stories) {
      const container = document.createElement("div");
      const onError = vi.fn();
      const onRendered = vi.fn();

      await mountPreview(
        container,
        {
          files: loaded.files.map((f) => ({ path: f.path, content: f.content })),
          entryPath: loaded.entry,
          previewSource: preview.source.preview,
          providersSource: preview.source.providers,
          storyProps: story.props,
          theme: story.theme,
        },
        { onRendered, onError },
      );
      await waitForOutcome(onRendered, onError);

      expect(onError, `${slug} story "${story.id}" reported an error: ${JSON.stringify(onError.mock.calls[0])}`).not.toHaveBeenCalled();
      expect(onRendered, `${slug} story "${story.id}" never rendered`).toHaveBeenCalled();
      expect(container.childElementCount, `${slug} story "${story.id}" rendered nothing`).toBeGreaterThan(0);

      unmountPreview(container);
    }
  });
});
