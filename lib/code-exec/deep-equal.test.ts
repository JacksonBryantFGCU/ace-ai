import { describe, expect, it } from "vitest";
import { deepEqual } from "@/lib/code-exec/deep-equal";

describe("deepEqual", () => {
  it("compares integers exactly", () => {
    expect(deepEqual(2, 2)).toBe(true);
    expect(deepEqual(2, 3)).toBe(false);
  });

  it("compares floats within tolerance", () => {
    expect(deepEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(deepEqual(1.0, 1.1)).toBe(false);
  });

  it("compares arrays recursively", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("compares objects regardless of key order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("handles strings and booleans", () => {
    expect(deepEqual("olleh", "olleh")).toBe(true);
    expect(deepEqual(true, false)).toBe(false);
  });
});
