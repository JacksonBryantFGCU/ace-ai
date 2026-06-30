import { describe, expect, it } from "vitest";
import { decideEntitlement } from "@/lib/billing/entitlement";
import { computeAccessExpiry, getPass, asPassId, FREE_INTERVIEW_LIMIT } from "@/lib/billing/passes";

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

describe("decideEntitlement", () => {
  it("allows free interviews until the limit is reached", () => {
    const first = decideEntitlement({ completedCount: 0, accessExpiresAt: null, now: NOW });
    expect(first).toMatchObject({ allowed: true, reason: "free_remaining" });
    expect(first.freeRemaining).toBe(FREE_INTERVIEW_LIMIT);

    const last = decideEntitlement({
      completedCount: FREE_INTERVIEW_LIMIT - 1,
      accessExpiresAt: null,
      now: NOW,
    });
    expect(last).toMatchObject({ allowed: true, reason: "free_remaining", freeRemaining: 1 });
  });

  it("blocks once the free allowance is used and there is no pass", () => {
    const result = decideEntitlement({
      completedCount: FREE_INTERVIEW_LIMIT,
      accessExpiresAt: null,
      now: NOW,
    });
    expect(result).toMatchObject({ allowed: false, reason: "free_used", passActive: false });
  });

  it("allows unlimited interviews while a pass is active, regardless of count", () => {
    const future = new Date(NOW + 60_000).toISOString();
    const result = decideEntitlement({ completedCount: 999, accessExpiresAt: future, now: NOW });
    expect(result).toMatchObject({ allowed: true, reason: "active_pass", passActive: true });
  });

  it("treats an expired pass as no pass", () => {
    const past = new Date(NOW - 60_000).toISOString();
    const result = decideEntitlement({
      completedCount: FREE_INTERVIEW_LIMIT,
      accessExpiresAt: past,
      now: NOW,
    });
    expect(result.allowed).toBe(false);
    expect(result.passActive).toBe(false);
  });
});

describe("computeAccessExpiry", () => {
  it("grants the pass duration from now when there is no active pass", () => {
    const expiry = computeAccessExpiry(getPass("week"), null, NOW);
    expect(new Date(expiry).getTime()).toBe(NOW + 7 * 24 * 60 * 60 * 1000);
  });

  it("stacks on top of an existing active pass", () => {
    const current = new Date(NOW + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days left
    const expiry = computeAccessExpiry(getPass("day"), current, NOW);
    // 2 remaining days + 1 day pass = 3 days from now.
    expect(new Date(expiry).getTime()).toBe(NOW + 3 * 24 * 60 * 60 * 1000);
  });
});

describe("asPassId", () => {
  it("accepts known passes and rejects others", () => {
    expect(asPassId("day")).toBe("day");
    expect(asPassId("week")).toBe("week");
    expect(asPassId("month")).toBeUndefined();
    expect(asPassId(undefined)).toBeUndefined();
  });
});
