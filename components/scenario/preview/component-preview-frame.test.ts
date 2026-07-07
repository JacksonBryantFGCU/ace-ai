// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentPreviewFrame, sandboxAttrsFor } from "@/components/scenario/preview/component-preview-frame";
import { createPreviewSnapshot } from "@/lib/scenarios/preview/snapshot";
import type { Scenario } from "@/lib/scenarios/schema";
import type { ServedPreviewBundle } from "@/lib/scenarios/preview/types";
import type { SessionFile } from "@/lib/scenarios/types";

/**
 * Parent-side lifecycle only — this never actually executes candidate code
 * (that's `mount.test.ts`'s job); it only checks that the frame owns the
 * iframe correctly (sandboxed, pointed at the sandbox route), sends a render
 * request once the sandbox announces readiness, cleans up its listener on
 * unmount, and (Phase 3) drives story/viewport/theme/reset controls and the
 * expanded status states purely from postMessage traffic + local UI state.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const SCENARIO = { workspace: { entry: "Entry.tsx" } } as unknown as Scenario;
const FILES: SessionFile[] = [
  { id: "1", path: "Entry.tsx", content: "// entry", role: "edit", origin: "authored" },
];
const BUNDLE: ServedPreviewBundle = {
  config: { kind: "component" },
  stories: [{ id: "default", label: "Preview" }],
  source: { preview: "// preview" },
};

describe("ComponentPreviewFrame", () => {
  it("renders a sandboxed iframe pointed at /preview-sandbox", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const { container } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("sandbox")).toContain("allow-scripts");
    expect(iframe?.getAttribute("src")).toBe("/preview-sandbox");
  });

  describe("sandboxAttrsFor", () => {
    it("excludes allow-same-origin in production — full isolation for real candidate interviews", () => {
      expect(sandboxAttrsFor("production")).toBe("allow-scripts");
    });

    it("adds allow-same-origin outside production — next dev blocks opaque-origin asset requests otherwise", () => {
      expect(sandboxAttrsFor("development")).toBe("allow-scripts allow-same-origin");
      expect(sandboxAttrsFor("test")).toBe("allow-scripts allow-same-origin");
      expect(sandboxAttrsFor(undefined)).toBe("allow-scripts allow-same-origin");
    });
  });

  it("posts a render request to the sandbox once it announces ready", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES, label: "Live" });
    const { container } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const contentWindow = iframe.contentWindow!;
    const postMessage = vi.spyOn(contentWindow, "postMessage").mockImplementation(() => {});

    window.dispatchEvent(new MessageEvent("message", { data: { type: "sandbox-ready" }, source: contentWindow }));

    expect(postMessage).toHaveBeenCalledTimes(1);
    const [message] = postMessage.mock.calls[0]!;
    expect(message).toMatchObject({
      type: "render",
      entryPath: "Entry.tsx",
      previewSource: "// preview",
      files: [{ path: "Entry.tsx", content: "// entry" }],
    });
  });

  it("ignores messages from a window other than its own iframe", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const { container } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});

    // No `source` at all — not this iframe — must not trigger a send.
    window.dispatchEvent(new MessageEvent("message", { data: { type: "sandbox-ready" } }));
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("removes its message listener on unmount", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("message", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("shows a loading state before the sandbox announces ready", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    expect(screen.getByText("Loading preview…")).toBeInTheDocument();
  });

  it("shows a compiling state right after sending, before a response arrives", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const { container } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "sandbox-ready" }, source: iframe.contentWindow }),
      );
    });
    expect(screen.getByText("Compiling…")).toBeInTheDocument();
  });
});

describe("ComponentPreviewFrame — error states", () => {
  function readyFrame() {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const { container } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "sandbox-ready" }, source: iframe.contentWindow }),
      );
    });
    const requestId = (postMessage.mock.calls[0]![0] as { requestId: number }).requestId;
    return { iframe, postMessage, requestId };
  }

  it("shows a compile error with file/line/column", () => {
    const { iframe, requestId } = readyFrame();
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "render-error", requestId, phase: "compile", message: "Unexpected token", file: "Entry.tsx", line: 3, column: 5 },
          source: iframe.contentWindow,
        }),
      );
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Compile error");
    expect(screen.getByRole("alert")).toHaveTextContent("Entry.tsx:3:5");
    expect(screen.getByRole("alert")).toHaveTextContent("Unexpected token");
  });

  it("shows a runtime error without a file location", () => {
    const { iframe, requestId } = readyFrame();
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "render-error", requestId, phase: "runtime", message: "boom" },
          source: iframe.contentWindow,
        }),
      );
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Runtime error");
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });

  it("ignores a stale response for a superseded request id", () => {
    const { iframe, requestId } = readyFrame();
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "render-error", requestId: requestId - 1, phase: "compile", message: "stale" },
          source: iframe.contentWindow,
        }),
      );
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ComponentPreviewFrame — stories", () => {
  const MULTI_STORY_BUNDLE: ServedPreviewBundle = {
    config: { kind: "component" },
    stories: [
      { id: "default", label: "Default" },
      { id: "many", label: "Many items", props: { count: 200 } },
    ],
    source: { preview: "// preview" },
  };

  function readyFrame(bundle: ServedPreviewBundle) {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const utils = render(createElement(ComponentPreviewFrame, { snapshot, bundle }));
    const iframe = utils.container.querySelector("iframe") as HTMLIFrameElement;
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "sandbox-ready" }, source: iframe.contentWindow }),
    );
    return { ...utils, iframe, postMessage };
  }

  it("shows no story picker when the bundle has only one story", () => {
    readyFrame(BUNDLE);
    expect(screen.queryByLabelText("Preview story")).not.toBeInTheDocument();
  });

  it("shows a story picker with every authored story when there is more than one", () => {
    readyFrame(MULTI_STORY_BUNDLE);
    const select = screen.getByLabelText("Preview story") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Default", "Many items"]);
  });

  it("switching stories immediately resends a render request with the story's props (no debounce)", () => {
    const { postMessage } = readyFrame(MULTI_STORY_BUNDLE);
    postMessage.mockClear();

    fireEvent.change(screen.getByLabelText("Preview story"), { target: { value: "many" } });

    expect(postMessage).toHaveBeenCalledTimes(1);
    const [message] = postMessage.mock.calls[0]!;
    expect(message).toMatchObject({ storyProps: { count: 200 } });
  });
});

describe("ComponentPreviewFrame — viewport and theme", () => {
  const PINNED_BUNDLE: ServedPreviewBundle = {
    config: { kind: "component" },
    stories: [{ id: "mobile-dark", label: "Mobile / dark", viewport: "mobile", theme: "dark" }],
    source: { preview: "// preview" },
  };

  function readyFrame(bundle: ServedPreviewBundle) {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const utils = render(createElement(ComponentPreviewFrame, { snapshot, bundle }));
    const iframe = utils.container.querySelector("iframe") as HTMLIFrameElement;
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "sandbox-ready" }, source: iframe.contentWindow }),
    );
    return { ...utils, iframe, postMessage };
  }

  it("theme toggle sends the updated theme on the next render request (no debounce)", () => {
    const { postMessage } = readyFrame(BUNDLE);
    postMessage.mockClear();

    fireEvent.click(screen.getByRole("switch", { name: "Preview theme" }));

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0]![0]).toMatchObject({ theme: "dark" });
  });

  it("disables the theme control when the active story pins it", () => {
    readyFrame(PINNED_BUNDLE);
    expect(screen.getByRole("switch", { name: "Preview theme" })).toBeDisabled();
  });

  it("does not mutate the application theme (isolated to the sandboxed frame's own props)", () => {
    const rootClassBefore = document.documentElement.className;
    readyFrame(BUNDLE);
    fireEvent.click(screen.getByRole("switch", { name: "Preview theme" }));
    expect(document.documentElement.className).toBe(rootClassBefore);
  });
});

describe("ComponentPreviewFrame — reset", () => {
  it("Reset Preview sends a render request with reset: true, preserving files/story", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const { container } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "sandbox-ready" }, source: iframe.contentWindow }),
    );
    postMessage.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Reset preview" }));

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0]![0]).toMatchObject({
      reset: true,
      entryPath: "Entry.tsx",
      files: [{ path: "Entry.tsx", content: "// entry" }],
    });
  });
});

describe("ComponentPreviewFrame — disconnect recovery", () => {
  beforeEach(() => vi.useFakeTimers());

  it("marks the preview disconnected if the sandbox never responds, and offers a reload", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByText("Preview disconnected.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload preview" })).toBeInTheDocument();
  });

  it("reloading creates a fresh iframe and returns to the connecting state", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const { container } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    const firstIframe = container.querySelector("iframe");

    act(() => {
      vi.advanceTimersByTime(8000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Reload preview" }));

    expect(screen.getByText("Loading preview…")).toBeInTheDocument();
    expect(container.querySelector("iframe")).not.toBe(firstIframe);
  });
});

describe("ComponentPreviewFrame — rerenders only on file changes", () => {
  beforeEach(() => vi.useFakeTimers());

  it("does not resend when a parent rerender hands back the SAME snapshot identity", () => {
    const snapshot = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const { container, rerender } = render(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "sandbox-ready" }, source: iframe.contentWindow }),
    );
    expect(postMessage).toHaveBeenCalledTimes(1);

    // Unrelated parent rerender — SAME snapshot/bundle object identity, as
    // `PreviewPanel`'s memoization guarantees when only e.g. the active
    // editor tab changes, not the files themselves.
    rerender(createElement(ComponentPreviewFrame, { snapshot, bundle: BUNDLE }));
    vi.advanceTimersByTime(500);

    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it("debounces and resends once when the snapshot changes (a real file edit)", () => {
    const snapshot1 = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    const { container, rerender } = render(createElement(ComponentPreviewFrame, { snapshot: snapshot1, bundle: BUNDLE }));
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "sandbox-ready" }, source: iframe.contentWindow }),
    );
    expect(postMessage).toHaveBeenCalledTimes(1);

    const editedFiles: SessionFile[] = [
      { id: "1", path: "Entry.tsx", content: "// edited", role: "edit", origin: "authored" },
    ];
    const snapshot2 = createPreviewSnapshot({ scenario: SCENARIO, files: editedFiles });
    rerender(createElement(ComponentPreviewFrame, { snapshot: snapshot2, bundle: BUNDLE }));

    expect(postMessage).toHaveBeenCalledTimes(1); // not yet — debounced
    vi.advanceTimersByTime(300);
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(postMessage.mock.calls[1]![0]).toMatchObject({ files: [{ path: "Entry.tsx", content: "// edited" }] });
  });
});
