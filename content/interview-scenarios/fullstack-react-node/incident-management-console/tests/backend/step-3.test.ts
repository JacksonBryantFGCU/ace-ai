import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function changeStatus(incidentId: number, body: unknown) {
  return request(`/incidents/${incidentId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
  it("validates incident id and existence", async () => {
    const invalid = await changeStatus(0, { status: "investigating", responder_id: 1, message: "hi" });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid incident id" });

    const missing = await changeStatus(999, { status: "investigating", responder_id: 1, message: "hi" });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Incident not found" });
  });

  it("requires and validates status", async () => {
    const missing = await changeStatus(5, { responder_id: 1, message: "hi" });
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: "Status is required" });

    const invalid = await changeStatus(5, { status: "bogus", responder_id: 1, message: "hi" });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid incident status" });
  });

  it("rejects any transition on an already-resolved incident", async () => {
    const response = await changeStatus(4, { status: "investigating", responder_id: 1, message: "hi" });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Incident is already resolved" });
  });

  it("rejects a disallowed transition", async () => {
    const response = await changeStatus(5, { status: "resolved", responder_id: 1, message: "hi" });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid status transition" });
  });

  it("validates responder_id on a valid transition", async () => {
    const invalid = await changeStatus(5, { status: "investigating", responder_id: "nope", message: "hi" });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid responder id" });

    const missing = await changeStatus(5, { status: "investigating", responder_id: 999, message: "hi" });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Responder not found" });

    const inactive = await changeStatus(5, { status: "investigating", responder_id: 4, message: "hi" });
    expect(inactive.status).toBe(400);
    await expect(inactive.json()).resolves.toEqual({ error: "Responder is inactive" });
  });

  it("validates the message", async () => {
    const missing = await changeStatus(5, { status: "investigating", responder_id: 1, message: "   " });
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: "Message is required" });

    const tooLong = await changeStatus(5, { status: "investigating", responder_id: 1, message: "a".repeat(501) });
    expect(tooLong.status).toBe(400);
    await expect(tooLong.json()).resolves.toEqual({ error: "Message is too long" });
  });

  it("allows open -> investigating and creates a status_changed event", async () => {
    const response = await changeStatus(5, { status: "investigating", responder_id: 1, message: "Looking into it." });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident).toMatchObject({ status: "investigating", resolved_at: null });
    expect(body.event).toMatchObject({ event_type: "status_changed", message: "Looking into it." });
    expect(body.incident.updated_at).not.toBe("2025-02-12T07:01:00.000Z");
  });

  it("allows investigating -> monitoring", async () => {
    const response = await changeStatus(1, { status: "monitoring", responder_id: 1, message: "Stable, watching dashboards." });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident).toMatchObject({ status: "monitoring", resolved_at: null });
  });

  it("allows monitoring -> investigating", async () => {
    const response = await changeStatus(3, { status: "investigating", responder_id: 2, message: "Regression detected, re-opening." });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident).toMatchObject({ status: "investigating", resolved_at: null });
  });

  it("allows investigating -> resolved, sets resolved_at, and creates a resolved event", async () => {
    const response = await changeStatus(1, { status: "resolved", responder_id: 1, message: "Latency back to normal." });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident.status).toBe("resolved");
    expect(body.incident.resolved_at).not.toBeNull();
    expect(body.event).toMatchObject({ event_type: "resolved", message: "Latency back to normal." });
  });

  it("allows monitoring -> resolved", async () => {
    const response = await changeStatus(3, { status: "resolved", responder_id: 2, message: "Confirmed stable." });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident.status).toBe("resolved");
    expect(body.incident.resolved_at).not.toBeNull();
    expect(body.event).toMatchObject({ event_type: "resolved" });
  });
});
