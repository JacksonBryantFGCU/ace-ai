// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResponseEditor } from "@/components/scenario/ui/response-editor";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => vi.useFakeTimers());

function setup(onSave: (t: string) => void = vi.fn(), initialValue = "") {
  const utils = render(createElement(ResponseEditor, { initialValue, onSave, debounceMs: 600 }));
  const textarea = utils.container.querySelector("textarea")!;
  return { ...utils, textarea, onSave };
}

describe("ResponseEditor", () => {
  it("autosaves after the debounce, coalescing keystrokes into one write", () => {
    const onSave = vi.fn();
    const { textarea } = setup(onSave);
    fireEvent.change(textarea, { target: { value: "a" } });
    fireEvent.change(textarea, { target: { value: "ab" } });
    fireEvent.change(textarea, { target: { value: "abc" } });
    expect(onSave).not.toHaveBeenCalled(); // still within the debounce window
    act(() => vi.advanceTimersByTime(600));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("abc");
  });

  it("surfaces Unsaved changes while pending, then Saved", () => {
    const { textarea, container } = setup();
    fireEvent.change(textarea, { target: { value: "draft" } });
    expect(container.textContent).toContain("Unsaved changes");
    act(() => vi.advanceTimersByTime(600)); // debounce → committed (Saving…)
    act(() => vi.advanceTimersByTime(500)); // → Saved
    expect(container.textContent).toContain("Saved");
  });

  it("flushes a pending edit on unmount so nothing is lost", () => {
    const onSave = vi.fn();
    const { textarea, unmount } = setup(onSave);
    fireEvent.change(textarea, { target: { value: "unblurred" } });
    unmount(); // before the debounce fires
    expect(onSave).toHaveBeenCalledWith("unblurred");
  });

  it("does not write when nothing changed", () => {
    const onSave = vi.fn();
    const { unmount } = setup(onSave, "same");
    unmount();
    expect(onSave).not.toHaveBeenCalled();
  });
});
