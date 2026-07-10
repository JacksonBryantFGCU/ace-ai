import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { getDatabase, resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function cancel() {
  return request("/subscription/cancel", { method: "POST" });
}

async function reactivate() {
  return request("/subscription/reactivate", { method: "POST" });
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

describe("backend step 3", () => {
  it("schedules cancellation for an active subscription and changes updated_at", async () => {
    const response = await cancel();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.subscription).toMatchObject({ status: "active", cancel_at_period_end: true });
    expect(body.subscription.updated_at).not.toBe("2025-01-10T09:00:00.000Z");
  });

  it("rejects a duplicate scheduled cancellation", async () => {
    const first = await cancel();
    expect(first.status).toBe(200);

    const second = await cancel();
    expect(second.status).toBe(400);
    await expect(second.json()).resolves.toEqual({ error: "Cancellation is already scheduled" });
  });

  it("rejects cancelling an already-cancelled subscription", async () => {
    await setCurrentSubscriptionStatus("cancelled");
    const response = await cancel();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Subscription is already cancelled" });
  });

  it("reactivates a subscription with a scheduled cancellation", async () => {
    await cancel();
    const response = await reactivate();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.subscription).toMatchObject({ status: "active", cancel_at_period_end: false });
  });

  it("rejects reactivating a subscription with no scheduled cancellation", async () => {
    const response = await reactivate();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Subscription is not scheduled for cancellation" });
  });

  it("rejects reactivating a cancelled subscription", async () => {
    await setCurrentSubscriptionStatus("cancelled");
    const response = await reactivate();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Subscription is already cancelled" });
  });
});
