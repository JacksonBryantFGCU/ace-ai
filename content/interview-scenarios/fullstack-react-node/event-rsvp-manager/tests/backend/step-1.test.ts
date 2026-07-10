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
  it("returns the seeded events in starts_at order with computed capacity fields", async () => {
    const response = await request("/events");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.events).toHaveLength(4);
    expect(body.events.map((e: { id: number }) => e.id)).toEqual([4, 3, 1, 2]);

    const reactMeetup = body.events.find((e: { id: number }) => e.id === 1);
    expect(reactMeetup).toMatchObject({
      title: "React Meetup",
      going_count: 2,
      waitlisted_count: 0,
      spots_remaining: 3,
      is_full: false,
    });

    const designWorkshop = body.events.find((e: { id: number }) => e.id === 2);
    expect(designWorkshop).toMatchObject({
      title: "Design Workshop",
      going_count: 2,
      waitlisted_count: 1,
      spots_remaining: 0,
      is_full: true,
    });
  });

  it("returns one event with its RSVPs ordered by created_at", async () => {
    const response = await request("/events/1");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.event).toMatchObject({
      id: 1,
      title: "React Meetup",
      going_count: 2,
      spots_remaining: 3,
    });
    expect(body.event.rsvps.map((r: { attendee_name: string }) => r.attendee_name)).toEqual([
      "Alex Rivera",
      "Sam Carter",
      "Priya Shah",
    ]);
  });

  it("validates the event id", async () => {
    const invalid = await request("/events/not-a-number");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid event id" });

    const missing = await request("/events/999");
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Event not found" });
  });
});
