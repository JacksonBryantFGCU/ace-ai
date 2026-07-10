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
  it("returns appointments joined with service and staff details in starts_at order", async () => {
    const response = await request("/appointments");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.appointments).toHaveLength(8);
    expect(body.appointments.map((a: { id: number }) => a.id)).toEqual([4, 8, 1, 6, 2, 3, 5, 7]);

    const first = body.appointments.find((a: { id: number }) => a.id === 1);
    expect(first).toMatchObject({
      id: 1,
      service: { id: 1, name: "Initial Consultation", duration_minutes: 60, price_cents: 7500 },
      staff: { id: 1, name: "Alex Rivera", email: "alex@example.com", role: "consultant" },
      customer_name: "Morgan Diaz",
      status: "scheduled",
      starts_at: "2025-02-10T15:00:00.000Z",
      ends_at: "2025-02-10T16:00:00.000Z",
    });
  });

  it("returns only active services and staff for booking options", async () => {
    const response = await request("/booking-options");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.services.map((s: { id: number }) => s.id)).toEqual([1, 2, 3]);
    expect(body.staff.map((m: { id: number }) => m.id)).toEqual([1, 2, 3]);
  });
});
