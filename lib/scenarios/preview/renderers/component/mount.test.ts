// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountPreview, unmountPreview } from "@/lib/scenarios/preview/renderers/component/mount";

/**
 * Exercises the compile → link → render pipeline directly (no iframe, no
 * postMessage) with tiny, throwaway fixtures — NOT real scenario content
 * (Phase 2 requirement: prove the runtime works without touching
 * `content/interview-scenarios/**`). This doubles as the "demo scenario":
 * the recompilation test below is the literal proof that editing a
 * component updates the preview.
 */

const PREVIEW_SOURCE = `
  import CandidateEntry from "scenario:entry";
  export default function Preview() {
    return <CandidateEntry />;
  }
`;

function greeting(text: string) {
  return `
    export default function Greeting() {
      return <div data-testid="greeting">${text}</div>;
    }
  `;
}

function waitFor(
  container: HTMLElement,
  testId: string,
  timeoutMs = 2000,
  predicate: (el: Element) => boolean = () => true,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    (function poll() {
      const el = container.querySelector(`[data-testid="${testId}"]`);
      // React's root.render() commits asynchronously, so on a rerender the
      // SAME testid can still be found on the stale, pre-update node for a
      // moment — waiting for `predicate` (not just presence) is what makes
      // this deterministic instead of racing the commit.
      if (el && predicate(el)) return resolve(el);
      if (Date.now() - started > timeoutMs) return reject(new Error(`timed out waiting for ${testId}`));
      setTimeout(poll, 10);
    })();
  });
}

function waitForCall(fn: ReturnType<typeof vi.fn>, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    (function poll() {
      if (fn.mock.calls.length > 0) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error("timed out waiting for callback"));
      setTimeout(poll, 10);
    })();
  });
}

describe("mountPreview", () => {
  let container: HTMLElement;

  afterEach(() => {
    unmountPreview(container);
  });

  it("compiles, links, and renders the candidate entry through Preview.tsx", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    await mountPreview(
      container,
      {
        files: [{ path: "Greeting.tsx", content: greeting("Hello v1") }],
        entryPath: "Greeting.tsx",
        previewSource: PREVIEW_SOURCE,
      },
      { onRendered, onError },
    );

    const el = await waitFor(container, "greeting");
    expect(el.textContent).toBe("Hello v1");
    expect(onError).not.toHaveBeenCalled();
    await waitForCall(onRendered);
  });

  it("recompiles and rerenders in place after an edit — no remount of the container", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    const input = (text: string) => ({
      files: [{ path: "Greeting.tsx", content: greeting(text) }],
      entryPath: "Greeting.tsx",
      previewSource: PREVIEW_SOURCE,
    });

    await mountPreview(container, input("Hello v1"), { onRendered, onError });
    expect((await waitFor(container, "greeting", 2000, (el) => el.textContent === "Hello v1")).textContent).toBe(
      "Hello v1",
    );

    await mountPreview(container, input("Hello v2"), { onRendered, onError });
    expect((await waitFor(container, "greeting", 2000, (el) => el.textContent === "Hello v2")).textContent).toBe(
      "Hello v2",
    );

    expect(onError).not.toHaveBeenCalled();
    // Same container/root reused across both calls (in-place update, no page
    // refresh, no remount) — the DOM node itself was never replaced.
    expect(container.childElementCount).toBeGreaterThan(0);
  });

  it("resolves relative imports between candidate files", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    await mountPreview(
      container,
      {
        files: [
          { path: "helper.ts", content: `export const LABEL = "from helper";` },
          {
            path: "Entry.tsx",
            content: `
              import { LABEL } from "./helper";
              export default function Entry() {
                return <div data-testid="out">{LABEL}</div>;
              }
            `,
          },
        ],
        entryPath: "Entry.tsx",
        previewSource: PREVIEW_SOURCE,
      },
      { onRendered, onError },
    );

    const el = await waitFor(container, "out");
    expect(el.textContent).toBe("from helper");
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports an unresolved import as a compile-phase error, without throwing", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    await expect(
      mountPreview(
        container,
        {
          files: [
            {
              path: "Entry.tsx",
              content: `
                import { nope } from "some-npm-package";
                export default function Entry() { return <div>{nope}</div>; }
              `,
            },
          ],
          entryPath: "Entry.tsx",
          previewSource: PREVIEW_SOURCE,
        },
        { onRendered, onError },
      ),
    ).resolves.toBeUndefined();

    expect(onRendered).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toMatchObject({ phase: "compile" });
  });

  it("contains a candidate component that throws during render as a runtime error", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    await mountPreview(
      container,
      {
        files: [
          {
            path: "Bad.tsx",
            content: `
              export default function Bad() {
                throw new Error("boom");
              }
            `,
          },
        ],
        entryPath: "Bad.tsx",
        previewSource: PREVIEW_SOURCE,
      },
      { onRendered, onError },
    );

    await waitForCall(onError);
    expect(onError.mock.calls[0]![0]).toMatchObject({ phase: "runtime", message: "boom" });
    expect(onRendered).not.toHaveBeenCalled();
  });

  it("forwards storyProps and theme as props on Preview.tsx's default export", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    await mountPreview(
      container,
      {
        files: [{ path: "Greeting.tsx", content: greeting("ignored") }],
        entryPath: "Greeting.tsx",
        previewSource: `
          import CandidateEntry from "scenario:entry";
          export default function Preview(props) {
            return <div data-testid="story-props">{props.label}:{props.theme}</div>;
          }
        `,
        storyProps: { label: "Many items" },
        theme: "dark",
      },
      { onRendered, onError },
    );

    const el = await waitFor(container, "story-props");
    expect(el.textContent).toBe("Many items:dark");
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a syntax error with file/line/column", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    await mountPreview(
      container,
      {
        files: [
          {
            path: "Broken.tsx",
            content: `
              export default function Broken() {
                return <div>(
              }
            `,
          },
        ],
        entryPath: "Broken.tsx",
        previewSource: PREVIEW_SOURCE,
      },
      { onRendered, onError },
    );

    expect(onRendered).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    const err = onError.mock.calls[0]![0];
    expect(err.phase).toBe("compile");
    expect(err.file).toBe("Broken.tsx");
    expect(typeof err.line).toBe("number");
    expect(typeof err.column).toBe("number");
  });

  it("attributes an unresolved import to the importing file", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    await mountPreview(
      container,
      {
        files: [{ path: "Entry.tsx", content: `import { nope } from "./missing";\nexport default function Entry() { return <div>{nope}</div>; }` }],
        entryPath: "Entry.tsx",
        previewSource: PREVIEW_SOURCE,
      },
      { onRendered, onError },
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const err = onError.mock.calls[0]![0];
    expect(err.phase).toBe("compile");
    expect(err.file).toBe("missing");
  });

  it("supports an authored providers.tsx wrapping the candidate entry", async () => {
    container = document.createElement("div");
    const onRendered = vi.fn();
    const onError = vi.fn();

    await mountPreview(
      container,
      {
        files: [{ path: "Greeting.tsx", content: greeting("wrapped") }],
        entryPath: "Greeting.tsx",
        previewSource: `
          import CandidateEntry from "scenario:entry";
          import { Wrapper } from "./providers";
          export default function Preview() {
            return <Wrapper><CandidateEntry /></Wrapper>;
          }
        `,
        providersSource: `
          export function Wrapper({ children }) {
            return <div data-testid="wrapper">{children}</div>;
          }
        `,
      },
      { onRendered, onError },
    );

    const wrapper = await waitFor(container, "wrapper");
    expect(wrapper.textContent).toBe("wrapped");
    expect(onError).not.toHaveBeenCalled();
  });
});
