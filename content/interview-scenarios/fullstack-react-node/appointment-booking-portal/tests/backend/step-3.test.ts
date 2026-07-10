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

describe("backend step 3", () => {
  it("validates the id, status presence, and status value", async () => {
    const invalidId = await request("/appointments/not-a-number/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(invalidId.status).toBe(400);
    await expect(invalidId.json()).resolves.toEqual({ error: "Invalid appointment id" });

    const missing = await request("/appointments/999/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Appointment not found" });

    const missingStatus = await request("/appointments/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(missingStatus.status).toBe(400);
    await expect(missingStatus.json()).resolves.toEqual({ error: "Status is required" });

    const invalidStatus = await request("/appointments/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed" }),
    });
    expect(invalidStatus.status).toBe(400);
    await expect(invalidStatus.json()).resolves.toEqual({ error: "Invalid appointment status" });

    const backToScheduled = await request("/appointments/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled" }),
    });
    expect(backToScheduled.status).toBe(400);
    await expect(backToScheduled.json()).resolves.toEqual({ error: "Invalid appointment status" });
  });

  it("finalizes a scheduled appointment as completed or cancelled and updates updated_at", async () => {
    const completed = await request("/appointments/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(completed.status).toBe(200);
    const completedBody = await completed.json();
    expect(completedBody.appointment).toMatchObject({ id: 1, status: "completed" });
    expect(completedBody.appointment.updated_at).not.toBe("2025-01-10T09:00:00.000Z");

    const cancelled = await request("/appointments/2/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    expect(cancelled.status).toBe(200);
    await expect(cancelled.json()).resolves.toMatchObject({ appointment: { id: 2, status: "cancelled" } });
  });

  it("rejects finalizing an appointment that is already completed or cancelled", async () => {
    const alreadyCompleted = await request("/appointments/3/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    expect(alreadyCompleted.status).toBe(400);
    await expect(alreadyCompleted.json()).resolves.toEqual({ error: "Appointment is already finalized" });

    const alreadyCancelled = await request("/appointments/5/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(alreadyCancelled.status).toBe(400);
    await expect(alreadyCancelled.json()).resolves.toEqual({ error: "Appointment is already finalized" });
  });
});
