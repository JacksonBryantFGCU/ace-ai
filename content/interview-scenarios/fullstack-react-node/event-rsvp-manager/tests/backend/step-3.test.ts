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
  it("validates the id and body before updating", async () => {
    const invalidId = await request("/rsvps/not-a-number", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "going" }),
    });
    expect(invalidId.status).toBe(400);
    await expect(invalidId.json()).resolves.toEqual({ error: "Invalid RSVP id" });

    const missing = await request("/rsvps/999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "going" }),
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "RSVP not found" });

    const empty = await request("/rsvps/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "No update fields provided" });

    const unknownField = await request("/rsvps/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "New Name" }),
    });
    expect(unknownField.status).toBe(400);
    await expect(unknownField.json()).resolves.toEqual({ error: "Unknown update field" });

    const invalidStatus = await request("/rsvps/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "attending" }),
    });
    expect(invalidStatus.status).toBe(400);
    await expect(invalidStatus.json()).resolves.toEqual({ error: "Invalid RSVP status" });
  });

  it("moves a cancelled RSVP to going when the event has capacity, and recomputes counts", async () => {
    const response = await request("/rsvps/3", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "going" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rsvp).toMatchObject({ id: 3, status: "going" });
    expect(body.rsvp.updated_at).not.toBe("2025-01-10T09:10:00.000Z");
    expect(body.event).toMatchObject({ id: 1, going_count: 3, spots_remaining: 2 });
  });

  it("rejects moving a waitlisted RSVP to going when the event is full", async () => {
    const response = await request("/rsvps/6", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "going" }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Event is full" });
  });

  it("cancels a going RSVP and frees up a spot", async () => {
    const response = await request("/rsvps/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rsvp).toMatchObject({ id: 1, status: "cancelled" });
    expect(body.event).toMatchObject({ id: 1, going_count: 1, spots_remaining: 4, is_full: false });
  });

  it("moves a waitlisted RSVP to going once a spot opens up", async () => {
    await request("/rsvps/4", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const response = await request("/rsvps/6", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "going" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rsvp).toMatchObject({ id: 6, status: "going" });
    expect(body.event).toMatchObject({ id: 2, going_count: 2, is_full: true });
  });
});
