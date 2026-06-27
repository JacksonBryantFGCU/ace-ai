import { describe, expect, it } from "vitest";
import { hashInput } from "@/server/cache";

describe("hashInput", () => {
  it("is deterministic for equal input", () => {
    const a = hashInput({ transcript: [{ role: "user", text: "hi" }], config: { role: "frontend" } });
    const b = hashInput({ transcript: [{ role: "user", text: "hi" }], config: { role: "frontend" } });
    expect(a).toBe(b);
  });

  it("differs for different input", () => {
    const a = hashInput({ role: "frontend" });
    const b = hashInput({ role: "backend" });
    expect(a).not.toBe(b);
  });

  it("returns a hex sha256 digest", () => {
    expect(hashInput("x")).toMatch(/^[a-f0-9]{64}$/);
  });
});
