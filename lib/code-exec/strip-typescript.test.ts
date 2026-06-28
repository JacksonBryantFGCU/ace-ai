import { describe, expect, it } from "vitest";
import { stripTypeScript } from "@/lib/code-exec/strip-typescript";

describe("stripTypeScript", () => {
  it("removes parameter and return type annotations", () => {
    const ts = `function add(a: number, b: number): number {\n  return a + b;\n}`;
    const js = stripTypeScript(ts);
    expect(js).not.toContain(": number");
    expect(js).toContain("function add(a, b)");
    // The stripped code should still run.
    const fn = new Function(`${js}; return add;`)() as (a: number, b: number) => number;
    expect(fn(2, 3)).toBe(5);
  });

  it("removes interface and type alias declarations", () => {
    const ts = `interface Point { x: number; y: number }\ntype Id = string;\nfunction f() { return 1; }`;
    const js = stripTypeScript(ts);
    expect(js).not.toContain("interface");
    expect(js).not.toMatch(/\btype Id\b/);
  });

  it("removes as-assertions and non-null assertions", () => {
    const ts = `const x = (y as string);\nconst z = obj!.value;`;
    const js = stripTypeScript(ts);
    expect(js).not.toContain(" as string");
    expect(js).not.toContain("!.");
  });
});
