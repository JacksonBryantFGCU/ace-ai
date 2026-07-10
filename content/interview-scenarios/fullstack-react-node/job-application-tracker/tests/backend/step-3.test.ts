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
    const invalidId = await request("/applications/not-a-number", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    expect(invalidId.status).toBe(400);
    await expect(invalidId.json()).resolves.toEqual({ error: "Invalid application id" });

    const missing = await request("/applications/999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Application not found" });

    const empty = await request("/applications/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "No update fields provided" });

    const unknownField = await request("/applications/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "New Co" }),
    });
    expect(unknownField.status).toBe(400);
    await expect(unknownField.json()).resolves.toEqual({ error: "Unknown update field" });

    const invalidStatus = await request("/applications/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    expect(invalidStatus.status).toBe(400);
    await expect(invalidStatus.json()).resolves.toEqual({ error: "Invalid status" });

    const invalidNotes = await request("/applications/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: 42 }),
    });
    expect(invalidNotes.status).toBe(400);
    await expect(invalidNotes.json()).resolves.toEqual({ error: "Invalid notes" });

    const notesTooLong = await request("/applications/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "x".repeat(501) }),
    });
    expect(notesTooLong.status).toBe(400);
    await expect(notesTooLong.json()).resolves.toEqual({ error: "Notes are too long" });
  });

  it("applies a valid status update and changes updated_at", async () => {
    const response = await request("/applications/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.application).toMatchObject({ id: 1, status: "applied" });
    expect(body.application.updated_at).not.toBe("2025-01-03T09:00:00.000Z");
    // Notes are preserved when the field is omitted from the update.
    expect(body.application.notes).toBe("Need to finish application.");
  });

  it("applies a valid notes update, nulling an empty trimmed value", async () => {
    const response = await request("/applications/2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "   " }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.application).toMatchObject({ id: 2, status: "applied", notes: null });
  });
});
