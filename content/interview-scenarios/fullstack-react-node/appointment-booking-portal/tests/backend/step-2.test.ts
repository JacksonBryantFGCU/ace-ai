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
  it("filters by staff and rejects an invalid or missing staff id", async () => {
    const filtered = await request("/appointments?staff_id=1");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.appointments.map((a: { id: number }) => a.id)).toEqual([4, 8, 1, 6]);

    const invalid = await request("/appointments?staff_id=not-a-number");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid staff id" });

    const missing = await request("/appointments?staff_id=999");
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Staff not found" });
  });

  it("filters by status and rejects an invalid status", async () => {
    const filtered = await request("/appointments?status=scheduled");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.appointments.map((a: { id: number }) => a.id)).toEqual([8, 1, 2, 7]);

    const invalid = await request("/appointments?status=confirmed");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid appointment status" });
  });

  it("filters by date and rejects an invalid date", async () => {
    const filtered = await request("/appointments?date=2025-02-10");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.appointments.map((a: { id: number }) => a.id)).toEqual([1, 6, 2]);

    const invalid = await request("/appointments?date=02-10-2025");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid date" });
  });

  it("validates the service, staff, customer fields, and start time on create", async () => {
    const invalidService = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: 1, customer_name: "Test", customer_email: "test@example.com", starts_at: "2025-02-15T10:00:00.000Z" }),
    });
    expect(invalidService.status).toBe(400);
    await expect(invalidService.json()).resolves.toEqual({ error: "Invalid service id" });

    const missingService = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: 999, staff_id: 1, customer_name: "Test", customer_email: "test@example.com", starts_at: "2025-02-15T10:00:00.000Z" }),
    });
    expect(missingService.status).toBe(404);
    await expect(missingService.json()).resolves.toEqual({ error: "Service not found" });

    const inactiveService = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: 4, staff_id: 1, customer_name: "Test", customer_email: "test@example.com", starts_at: "2025-02-15T10:00:00.000Z" }),
    });
    expect(inactiveService.status).toBe(400);
    await expect(inactiveService.json()).resolves.toEqual({ error: "Service is inactive" });

    const invalidStaff = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: 1, staff_id: "abc", customer_name: "Test", customer_email: "test@example.com", starts_at: "2025-02-15T10:00:00.000Z" }),
    });
    expect(invalidStaff.status).toBe(400);
    await expect(invalidStaff.json()).resolves.toEqual({ error: "Invalid staff id" });

    const missingStaff = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: 1, staff_id: 999, customer_name: "Test", customer_email: "test@example.com", starts_at: "2025-02-15T10:00:00.000Z" }),
    });
    expect(missingStaff.status).toBe(404);
    await expect(missingStaff.json()).resolves.toEqual({ error: "Staff not found" });

    const inactiveStaff = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: 1, staff_id: 4, customer_name: "Test", customer_email: "test@example.com", starts_at: "2025-02-15T10:00:00.000Z" }),
    });
    expect(inactiveStaff.status).toBe(400);
    await expect(inactiveStaff.json()).resolves.toEqual({ error: "Staff member is inactive" });

    const missingName = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: 1, staff_id: 1, customer_name: "  ", customer_email: "test@example.com", starts_at: "2025-02-15T10:00:00.000Z" }),
    });
    expect(missingName.status).toBe(400);
    await expect(missingName.json()).resolves.toEqual({ error: "Customer name is required" });

    const invalidEmail = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: 1, staff_id: 1, customer_name: "Test", customer_email: "not-an-email", starts_at: "2025-02-15T10:00:00.000Z" }),
    });
    expect(invalidEmail.status).toBe(400);
    await expect(invalidEmail.json()).resolves.toEqual({ error: "Invalid customer email" });

    const invalidStart = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: 1, staff_id: 1, customer_name: "Test", customer_email: "test@example.com", starts_at: "not-a-date" }),
    });
    expect(invalidStart.status).toBe(400);
    await expect(invalidStart.json()).resolves.toEqual({ error: "Invalid start time" });

    const notesTooLong = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: 1,
        staff_id: 3,
        customer_name: "Test",
        customer_email: "test@example.com",
        starts_at: "2025-02-15T10:00:00.000Z",
        notes: "x".repeat(501),
      }),
    });
    expect(notesTooLong.status).toBe(400);
    await expect(notesTooLong.json()).resolves.toEqual({ error: "Notes are too long" });
  });

  it("rejects a booking that conflicts with an existing scheduled appointment", async () => {
    const response = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: 1,
        staff_id: 1,
        customer_name: "Test",
        customer_email: "test@example.com",
        starts_at: "2025-02-10T15:30:00.000Z",
      }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Appointment conflicts with existing booking" });
  });

  it("allows a booking that only overlaps a cancelled appointment", async () => {
    const response = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: 2,
        staff_id: 2,
        customer_name: "New Customer",
        customer_email: "new@example.com",
        starts_at: "2025-02-11T16:15:00.000Z",
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.appointment).toMatchObject({ status: "scheduled" });
  });

  it("creates a scheduled appointment with ends_at computed from the service duration", async () => {
    const response = await request("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: 1,
        staff_id: 3,
        customer_name: "  Jordan Patel  ",
        customer_email: "  Jordan.Patel@Example.com  ",
        starts_at: "2025-02-15T10:00:00.000Z",
        notes: "  Prefers morning slots.  ",
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.appointment).toMatchObject({
      service: { id: 1, name: "Initial Consultation" },
      staff: { id: 3, name: "Jordan Lee" },
      customer_name: "Jordan Patel",
      customer_email: "jordan.patel@example.com",
      starts_at: "2025-02-15T10:00:00.000Z",
      ends_at: "2025-02-15T11:00:00.000Z",
      status: "scheduled",
      notes: "Prefers morning slots.",
    });
  });
});
