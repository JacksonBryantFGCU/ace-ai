import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { getDatabase, resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function patchSubscription(body: unknown) {
  return request("/subscription", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function setCurrentSubscriptionStatus(status: string) {
  const db = await getDatabase();
  db.run("UPDATE subscriptions SET status = ? WHERE customer_id = 1", [status]);
}

beforeEach(async () => {
  await resetDatabase();
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP test server");
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("backend step 2", () => {
  it("rejects an empty body and unknown fields", async () => {
    const empty = await patchSubscription({});
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "No update fields provided" });

    const unknown = await patchSubscription({ status: "cancelled" });
    expect(unknown.status).toBe(400);
    await expect(unknown.json()).resolves.toEqual({ error: "Unknown update field" });
  });

  it("rejects any change to a cancelled subscription", async () => {
    await setCurrentSubscriptionStatus("cancelled");
    const response = await patchSubscription({ seats: 10 });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Subscription cannot be changed" });
  });

  it("rejects a plan change on a past_due subscription but allows billing cycle and seats", async () => {
    await setCurrentSubscriptionStatus("past_due");

    const planChange = await patchSubscription({ plan_id: 1 });
    expect(planChange.status).toBe(400);
    await expect(planChange.json()).resolves.toEqual({ error: "Subscription cannot be changed" });

    const billingChange = await patchSubscription({ billing_cycle: "annual" });
    expect(billingChange.status).toBe(200);
    const body = await billingChange.json();
    expect(body.subscription).toMatchObject({ billing_cycle: "annual", status: "past_due" });
  });

  it("validates plan_id", async () => {
    const invalid = await patchSubscription({ plan_id: "not-a-number" });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid plan id" });

    const missing = await patchSubscription({ plan_id: 999 });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Plan not found" });

    const inactive = await patchSubscription({ plan_id: 4 });
    expect(inactive.status).toBe(400);
    await expect(inactive.json()).resolves.toEqual({ error: "Plan is inactive" });
  });

  it("validates billing_cycle", async () => {
    const response = await patchSubscription({ billing_cycle: "weekly" });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid billing cycle" });
  });

  it("validates seats and the plan-minimum rule", async () => {
    const zero = await patchSubscription({ seats: 0 });
    expect(zero.status).toBe(400);
    await expect(zero.json()).resolves.toEqual({ error: "Invalid seats" });

    const tooMany = await patchSubscription({ seats: 101 });
    expect(tooMany.status).toBe(400);
    await expect(tooMany.json()).resolves.toEqual({ error: "Invalid seats" });

    const notInteger = await patchSubscription({ seats: 2.5 });
    expect(notInteger.status).toBe(400);
    await expect(notInteger.json()).resolves.toEqual({ error: "Invalid seats" });

    // Current plan is Pro (seats_included: 5); 3 is below that minimum.
    const belowCurrentPlan = await patchSubscription({ seats: 3 });
    expect(belowCurrentPlan.status).toBe(400);
    await expect(belowCurrentPlan.json()).resolves.toEqual({ error: "Seat count is below plan minimum" });

    // Business (id 3) requires at least 20 seats.
    const belowNewPlan = await patchSubscription({ plan_id: 3, seats: 10 });
    expect(belowNewPlan.status).toBe(400);
    await expect(belowNewPlan.json()).resolves.toEqual({ error: "Seat count is below plan minimum" });
  });

  it("applies a valid plan change, leaving billing cycle and seats untouched", async () => {
    const response = await patchSubscription({ plan_id: 1 });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.plan).toEqual({ id: 1, name: "Starter", tier: "starter", price_cents: 900, seats_included: 1 });
    expect(body.subscription).toMatchObject({ billing_cycle: "monthly", seats: 5 });
    expect(body.subscription.updated_at).not.toBe("2025-01-10T09:00:00.000Z");
  });

  it("applies a valid billing cycle change", async () => {
    const response = await patchSubscription({ billing_cycle: "annual" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.subscription).toMatchObject({ billing_cycle: "annual", seats: 5 });
  });

  it("applies a valid seats change", async () => {
    const response = await patchSubscription({ seats: 10 });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.subscription).toMatchObject({ seats: 10, billing_cycle: "monthly" });
  });
});
