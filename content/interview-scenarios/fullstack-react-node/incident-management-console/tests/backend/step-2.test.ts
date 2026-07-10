import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function assign(incidentId: number, body: unknown) {
  return request(`/incidents/${incidentId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function addEvent(incidentId: number, body: unknown) {
  return request(`/incidents/${incidentId}/events`, {
    method: "POST",
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

describe("backend step 2 - filters", () => {
  it("filters by status", async () => {
    const response = await request("/incidents?status=open");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incidents.map((incident: { id: number }) => incident.id)).toEqual([2, 5]);
  });

  it("filters by severity", async () => {
    const response = await request("/incidents?severity=sev3");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incidents.map((incident: { id: number }) => incident.id)).toEqual([5, 3, 4]);
  });

  it("filters by service_id", async () => {
    const response = await request("/incidents?service_id=1");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incidents.map((incident: { id: number }) => incident.id)).toEqual([1, 5]);
  });

  it("filters by assigned true and false", async () => {
    const assigned = await request("/incidents?assigned=true");
    expect(assigned.status).toBe(200);
    expect((await assigned.json()).incidents.map((incident: { id: number }) => incident.id)).toEqual([6, 1, 3, 4]);

    const unassigned = await request("/incidents?assigned=false");
    expect(unassigned.status).toBe(200);
    expect((await unassigned.json()).incidents.map((incident: { id: number }) => incident.id)).toEqual([2, 5]);
  });

  it("combines filters", async () => {
    const response = await request("/incidents?severity=sev3&assigned=false");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incidents.map((incident: { id: number }) => incident.id)).toEqual([5]);
  });

  it("rejects invalid filters", async () => {
    const status = await request("/incidents?status=bogus");
    expect(status.status).toBe(400);
    await expect(status.json()).resolves.toEqual({ error: "Invalid incident status" });

    const severity = await request("/incidents?severity=bogus");
    expect(severity.status).toBe(400);
    await expect(severity.json()).resolves.toEqual({ error: "Invalid severity" });

    const invalidServiceId = await request("/incidents?service_id=not-a-number");
    expect(invalidServiceId.status).toBe(400);
    await expect(invalidServiceId.json()).resolves.toEqual({ error: "Invalid service id" });

    const missingService = await request("/incidents?service_id=999");
    expect(missingService.status).toBe(404);
    await expect(missingService.json()).resolves.toEqual({ error: "Service not found" });

    const assignedFilter = await request("/incidents?assigned=maybe");
    expect(assignedFilter.status).toBe(400);
    await expect(assignedFilter.json()).resolves.toEqual({ error: "Invalid assigned filter" });
  });
});

describe("backend step 2 - summary", () => {
  it("returns correct counts", async () => {
    const response = await request("/incidents/summary");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toEqual({
      total: 6,
      open: 2,
      investigating: 2,
      monitoring: 1,
      resolved: 1,
      sev1: 2,
      sev2: 1,
      sev3: 3,
      unassigned: 2,
    });
  });
});

describe("backend step 2 - assign", () => {
  it("assigns an active responder and creates an assigned event", async () => {
    const response = await assign(5, { responder_id: 2 });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident.assigned_responder).toEqual({ id: 2, name: "Jordan Lee", email: "jordan@example.com", role: "manager" });
    expect(body.event).toMatchObject({ event_type: "assigned", message: "Assigned to Jordan Lee." });
    expect(body.incident.updated_at).not.toBe("2025-02-12T07:01:00.000Z");
  });

  it("validates incident id and existence", async () => {
    const invalid = await assign(0, { responder_id: 1 });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid incident id" });

    const missing = await assign(999, { responder_id: 1 });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Incident not found" });
  });

  it("rejects assignment on a resolved incident", async () => {
    const response = await assign(4, { responder_id: 1 });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Incident is resolved" });
  });

  it("validates responder_id", async () => {
    const invalid = await assign(5, { responder_id: "nope" });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid responder id" });

    const missing = await assign(5, { responder_id: 999 });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Responder not found" });

    const inactive = await assign(5, { responder_id: 4 });
    expect(inactive.status).toBe(400);
    await expect(inactive.json()).resolves.toEqual({ error: "Responder is inactive" });
  });

  it("rejects assigning the already-assigned responder", async () => {
    const response = await assign(1, { responder_id: 1 });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Responder is already assigned" });
  });
});

describe("backend step 2 - timeline updates", () => {
  it("adds an update event to an unresolved incident", async () => {
    const response = await addEvent(5, { responder_id: 1, message: "Investigating config drift source." });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.event).toMatchObject({ event_type: "update", message: "Investigating config drift source." });
    expect(body.incident.updated_at).not.toBe("2025-02-12T07:01:00.000Z");
  });

  it("rejects updates on a resolved incident", async () => {
    const response = await addEvent(4, { responder_id: 1, message: "Trying to add more info." });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Incident is resolved" });
  });

  it("validates responder_id", async () => {
    const invalid = await addEvent(5, { responder_id: "nope", message: "hi" });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid responder id" });

    const missing = await addEvent(5, { responder_id: 999, message: "hi" });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Responder not found" });

    const inactive = await addEvent(5, { responder_id: 4, message: "hi" });
    expect(inactive.status).toBe(400);
    await expect(inactive.json()).resolves.toEqual({ error: "Responder is inactive" });
  });

  it("validates the message", async () => {
    const missing = await addEvent(5, { responder_id: 1, message: "   " });
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: "Message is required" });

    const tooLong = await addEvent(5, { responder_id: 1, message: "a".repeat(501) });
    expect(tooLong.status).toBe(400);
    await expect(tooLong.json()).resolves.toEqual({ error: "Message is too long" });
  });
});
