import { describe, expect, it } from "vitest";
import { ensureDomEnv } from "@/server/scenarios/dom-env";

/**
 * `ensureDomEnv` must stand up a real DOM on the Node globals (this test runs in
 * the default `node` environment — NOT jsdom — so it exercises the production path)
 * and be safe to call repeatedly.
 */
describe("ensureDomEnv", () => {
  it("installs a working DOM onto the Node globals", () => {
    ensureDomEnv();
    const g = globalThis as unknown as { document?: Document; window?: unknown };
    expect(g.window).toBeDefined();
    expect(g.document).toBeDefined();
    const el = g.document!.createElement("div");
    el.textContent = "hi";
    expect(el.tagName).toBe("DIV");
    expect(el.textContent).toBe("hi");
  });

  it("is idempotent (safe to call again)", () => {
    ensureDomEnv();
    ensureDomEnv();
    expect((globalThis as unknown as { document?: Document }).document).toBeDefined();
  });

  it("does not clobber Node's own globals (fetch stays native)", () => {
    ensureDomEnv();
    // jsdom ships no global `fetch`; Node's must survive the install.
    expect(typeof fetch).toBe("function");
  });
});
