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

describe("backend step 2", () => {
  it("filters by status and rejects an invalid status", async () => {
    const filtered = await request("/events?status=scheduled");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.events.map((e: { id: number }) => e.id)).toEqual([1, 2]);

    const invalid = await request("/events?status=archived");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid event status" });
  });

  it("filters by availability and rejects an invalid value", async () => {
    const open = await request("/events?availability=open");
    expect(open.status).toBe(200);
    const openBody = await open.json();
    expect(openBody.events.map((e: { id: number }) => e.id)).toEqual([4, 3, 1]);

    const full = await request("/events?availability=full");
    expect(full.status).toBe(200);
    const fullBody = await full.json();
    expect(fullBody.events.map((e: { id: number }) => e.id)).toEqual([2]);

    const invalid = await request("/events?availability=maybe");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid availability filter" });
  });

  it("combines status and availability filters", async () => {
    const response = await request("/events?status=scheduled&availability=full");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.events.map((e: { id: number }) => e.id)).toEqual([2]);
  });

  it("rejects RSVPs against a non-scheduled or missing event", async () => {
    const cancelledEvent = await request("/events/3/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "Test", attendee_email: "test@example.com" }),
    });
    expect(cancelledEvent.status).toBe(400);
    await expect(cancelledEvent.json()).resolves.toEqual({ error: "Event is not accepting RSVPs" });

    const completedEvent = await request("/events/4/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "Test", attendee_email: "test@example.com" }),
    });
    expect(completedEvent.status).toBe(400);
    await expect(completedEvent.json()).resolves.toEqual({ error: "Event is not accepting RSVPs" });

    const missingEvent = await request("/events/999/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "Test", attendee_email: "test@example.com" }),
    });
    expect(missingEvent.status).toBe(404);
    await expect(missingEvent.json()).resolves.toEqual({ error: "Event not found" });

    const invalidId = await request("/events/not-a-number/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "Test", attendee_email: "test@example.com" }),
    });
    expect(invalidId.status).toBe(400);
    await expect(invalidId.json()).resolves.toEqual({ error: "Invalid event id" });
  });

  it("validates attendee name, email, and duplicate RSVPs", async () => {
    const missingName = await request("/events/1/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "  ", attendee_email: "test@example.com" }),
    });
    expect(missingName.status).toBe(400);
    await expect(missingName.json()).resolves.toEqual({ error: "Attendee name is required" });

    const invalidEmail = await request("/events/1/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "Test User", attendee_email: "not-an-email" }),
    });
    expect(invalidEmail.status).toBe(400);
    await expect(invalidEmail.json()).resolves.toEqual({ error: "Invalid attendee email" });

    const duplicate = await request("/events/1/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "Alex Again", attendee_email: "alex@example.com" }),
    });
    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toEqual({ error: "Attendee already RSVP'd" });
  });

  it("creates a going RSVP when the event has capacity and a waitlisted RSVP when full", async () => {
    const open = await request("/events/1/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "New Person", attendee_email: "NewPerson@Example.com" }),
    });
    expect(open.status).toBe(201);
    const openBody = await open.json();
    expect(openBody.rsvp).toMatchObject({
      attendee_name: "New Person",
      attendee_email: "newperson@example.com",
      status: "going",
    });
    expect(openBody.event).toMatchObject({ id: 1, going_count: 3, spots_remaining: 2 });

    const full = await request("/events/2/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "Full Test", attendee_email: "fulltest@example.com" }),
    });
    expect(full.status).toBe(201);
    const fullBody = await full.json();
    expect(fullBody.rsvp).toMatchObject({ status: "waitlisted" });
    expect(fullBody.event).toMatchObject({ id: 2, going_count: 2, waitlisted_count: 2, is_full: true });
  });

  it("allows a new RSVP for an email whose only prior RSVP on the event was cancelled", async () => {
    const response = await request("/events/1/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_name: "Priya Shah", attendee_email: "priya@example.com" }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.rsvp).toMatchObject({ attendee_email: "priya@example.com", status: "going" });
  });
});
