// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timer } from "@/components/ui/timer";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => vi.useFakeTimers());

describe("Timer", () => {
  it("starts at 0:00 and shows estimated time remaining", () => {
    const { container } = render(createElement(Timer, { estimatedMinutes: 20 }));
    const timer = container.querySelector('[role="timer"]');
    expect(timer).not.toBeNull();
    expect(timer?.textContent).toContain("0:00");
    expect(timer?.textContent).toContain("~20:00 left");
  });

  it("counts up elapsed and counts down remaining as time passes", () => {
    const { container } = render(createElement(Timer, { estimatedMinutes: 20 }));
    act(() => {
      vi.advanceTimersByTime(65_000); // 1:05
    });
    const timer = container.querySelector('[role="timer"]');
    expect(timer?.textContent).toContain("1:05");
    expect(timer?.textContent).toContain("~18:55 left");
  });

  it("flags going over the estimate without changing anything else", () => {
    const { container } = render(createElement(Timer, { estimatedMinutes: 1 }));
    act(() => {
      vi.advanceTimersByTime(75_000); // past the 1-minute estimate
    });
    const timer = container.querySelector('[role="timer"]');
    expect(timer?.textContent).toContain("over estimate");
  });

  it("shows only elapsed when no estimate is given", () => {
    const { container } = render(createElement(Timer, {}));
    const timer = container.querySelector('[role="timer"]');
    expect(timer?.textContent).toContain("0:00");
    expect(timer?.textContent).not.toContain("left");
  });
});
