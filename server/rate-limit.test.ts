import { beforeEach, describe, expect, it } from "vitest";
import { _resetRateLimitForTests, rateLimit } from "@/server/rate-limit";

describe("rateLimit (ai bucket = 10/min)", () => {
  beforeEach(() => _resetRateLimitForTests());

  it("allows up to the max, then blocks", () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit("user-1", "ai").ok).toBe(true);
    }
    expect(rateLimit("user-1", "ai").ok).toBe(false);
  });

  it("tracks keys independently", () => {
    for (let i = 0; i < 10; i++) rateLimit("user-1", "ai");
    expect(rateLimit("user-1", "ai").ok).toBe(false);
    expect(rateLimit("user-2", "ai").ok).toBe(true);
  });
});
