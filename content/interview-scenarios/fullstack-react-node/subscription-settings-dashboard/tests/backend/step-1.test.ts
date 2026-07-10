import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
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

describe("backend step 1", () => {
  it("returns the current customer's subscription joined with customer and plan", async () => {
    const response = await request("/subscription");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.customer).toEqual({ id: 1, name: "Alex Rivera", email: "alex@example.com" });
    expect(body.subscription).toMatchObject({
      id: 1,
      status: "active",
      billing_cycle: "monthly",
      seats: 5,
      cancel_at_period_end: false,
      current_period_end: "2025-03-01T00:00:00.000Z",
    });
    expect(body.plan).toEqual({
      id: 2,
      name: "Pro",
      tier: "pro",
      price_cents: 4900,
      seats_included: 5,
    });
  });

  it("returns only active plans, ordered by price_cents then id", async () => {
    const response = await request("/plans");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.plans).toEqual([
      { id: 1, name: "Starter", tier: "starter", price_cents: 900, seats_included: 1 },
      { id: 2, name: "Pro", tier: "pro", price_cents: 4900, seats_included: 5 },
      { id: 3, name: "Business", tier: "business", price_cents: 14900, seats_included: 20 },
    ]);
  });
});
