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
  it("returns incidents with service and assigned responder, in deterministic order", async () => {
    const response = await request("/incidents");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.incidents.map((incident: { id: number }) => incident.id)).toEqual([2, 6, 1, 5, 3, 4]);

    const first = body.incidents[0];
    expect(first).toMatchObject({
      id: 2,
      title: "Auth service full outage",
      severity: "sev1",
      status: "open",
      assigned_responder: null,
    });
    expect(first.service).toEqual({ id: 3, name: "Auth Service", slug: "auth-service", status: "down" });

    const assigned = body.incidents.find((incident: { id: number }) => incident.id === 1);
    expect(assigned.assigned_responder).toEqual({ id: 1, name: "Alex Rivera", email: "alex@example.com", role: "engineer" });
  });

  it("returns null assigned_responder for unassigned incidents", async () => {
    const response = await request("/incidents/5");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident.assigned_responder).toBeNull();
  });

  it("options include all services and active responders only", async () => {
    const response = await request("/incident-options");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.services).toHaveLength(4);
    expect(body.services[0]).toEqual({ id: 1, name: "API Gateway", slug: "api-gateway", status: "degraded" });
    expect(body.responders).toHaveLength(3);
    expect(body.responders.map((responder: { id: number }) => responder.id)).toEqual([1, 2, 3]);
    expect(body.responders.some((responder: { name: string }) => responder.name === "Casey Kim")).toBe(false);
  });

  it("returns an incident detail with events ordered by created_at then id", async () => {
    const response = await request("/incidents/3");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident).toMatchObject({ id: 3, title: "Payment webhook delays", status: "monitoring" });
    expect(body.events.map((event: { id: number }) => event.id)).toEqual([5, 6, 7, 8]);
    expect(body.events[0]).toMatchObject({ event_type: "created", responder: null });
    expect(body.events[1]).toMatchObject({
      event_type: "assigned",
      responder: { id: 2, name: "Jordan Lee", email: "jordan@example.com", role: "manager" },
    });
  });

  it("rejects an invalid or missing incident id", async () => {
    const invalid = await request("/incidents/not-a-number");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid incident id" });

    const missing = await request("/incidents/999");
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Incident not found" });
  });
});
