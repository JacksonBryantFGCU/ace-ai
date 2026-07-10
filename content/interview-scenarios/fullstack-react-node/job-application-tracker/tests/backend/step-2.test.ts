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
    const filtered = await request("/applications?status=interviewing");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.applications.map((a: { id: number }) => a.id)).toEqual([4, 8]);

    const invalid = await request("/applications?status=submitted");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid status" });
  });

  it("filters by source and rejects an invalid source", async () => {
    const filtered = await request("/applications?source=linkedin");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.applications.map((a: { id: number }) => a.id)).toEqual([7, 3]);

    const invalid = await request("/applications?source=indeed");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid source" });
  });

  it("combines status and source filters", async () => {
    const response = await request("/applications?status=applied&source=referral");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.applications.map((a: { id: number }) => a.id)).toEqual([5]);
  });

  it("returns correct summary counts including zero-count statuses", async () => {
    const response = await request("/applications/summary");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toEqual({
      total: 8,
      draft: 2,
      applied: 2,
      interviewing: 2,
      offer: 0,
      rejected: 2,
    });
  });

  it("validates required fields, status, source, and notes on create", async () => {
    const missingCompany = await request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "Intern", location: "Remote" }),
    });
    expect(missingCompany.status).toBe(400);
    await expect(missingCompany.json()).resolves.toEqual({ error: "Company is required" });

    const missingRole = await request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", location: "Remote" }),
    });
    expect(missingRole.status).toBe(400);
    await expect(missingRole.json()).resolves.toEqual({ error: "Role is required" });

    const missingLocation = await request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", role: "Intern" }),
    });
    expect(missingLocation.status).toBe(400);
    await expect(missingLocation.json()).resolves.toEqual({ error: "Location is required" });

    const invalidStatus = await request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", role: "Intern", location: "Remote", status: "pending" }),
    });
    expect(invalidStatus.status).toBe(400);
    await expect(invalidStatus.json()).resolves.toEqual({ error: "Invalid status" });

    const invalidSource = await request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", role: "Intern", location: "Remote", source: "indeed" }),
    });
    expect(invalidSource.status).toBe(400);
    await expect(invalidSource.json()).resolves.toEqual({ error: "Invalid source" });

    const invalidNotes = await request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", role: "Intern", location: "Remote", notes: 42 }),
    });
    expect(invalidNotes.status).toBe(400);
    await expect(invalidNotes.json()).resolves.toEqual({ error: "Invalid notes" });

    const notesTooLong = await request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", role: "Intern", location: "Remote", notes: "x".repeat(501) }),
    });
    expect(notesTooLong.status).toBe(400);
    await expect(notesTooLong.json()).resolves.toEqual({ error: "Notes are too long" });
  });

  it("creates an application, defaulting status/source, trimming fields, and nulling empty notes", async () => {
    const response = await request("/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: "  Linear  ",
        role: "  Software Engineer Intern  ",
        location: "  Remote  ",
        notes: "   ",
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.application).toMatchObject({
      company: "Linear",
      role: "Software Engineer Intern",
      location: "Remote",
      status: "draft",
      source: "other",
      notes: null,
    });

    const listed = await request("/applications");
    const listedBody = await listed.json();
    expect(listedBody.applications).toHaveLength(9);
  });
});
