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
  it("validates the id, presence, and value of status", async () => {
    const invalidId = await request("/tasks/not-a-number/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(invalidId.status).toBe(400);
    await expect(invalidId.json()).resolves.toEqual({ error: "Invalid task id" });

    const missing = await request("/tasks/999/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Task not found" });

    const missingStatus = await request("/tasks/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(missingStatus.status).toBe(400);
    await expect(missingStatus.json()).resolves.toEqual({ error: "Status is required" });

    const invalidStatus = await request("/tasks/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "blocked" }),
    });
    expect(invalidStatus.status).toBe(400);
    await expect(invalidStatus.json()).resolves.toEqual({ error: "Invalid task status" });
  });

  it("allows every valid transition and updates updated_at", async () => {
    const todoToInProgress = await request("/tasks/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(todoToInProgress.status).toBe(200);
    const todoToInProgressBody = await todoToInProgress.json();
    expect(todoToInProgressBody.task).toMatchObject({ id: 1, status: "in_progress" });
    expect(todoToInProgressBody.task.updated_at).not.toBe("2025-01-10T09:00:00.000Z");

    const inProgressToReview = await request("/tasks/2/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "review" }),
    });
    expect(inProgressToReview.status).toBe(200);
    await expect(inProgressToReview.json()).resolves.toMatchObject({ task: { id: 2, status: "review" } });

    const reviewToDone = await request("/tasks/4/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    expect(reviewToDone.status).toBe(200);
    await expect(reviewToDone.json()).resolves.toMatchObject({ task: { id: 4, status: "done" } });
  });

  it("allows review back to in_progress", async () => {
    const response = await request("/tasks/4/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ task: { id: 4, status: "in_progress" } });
  });

  it("rejects transitions that skip stages or move backward from a terminal state", async () => {
    const skipsStages = await request("/tasks/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "review" }),
    });
    expect(skipsStages.status).toBe(400);
    await expect(skipsStages.json()).resolves.toEqual({ error: "Invalid status transition" });

    const fromDone = await request("/tasks/5/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "todo" }),
    });
    expect(fromDone.status).toBe(400);
    await expect(fromDone.json()).resolves.toEqual({ error: "Invalid status transition" });
  });

  it("does not change unrelated task fields on a status update", async () => {
    const response = await request("/tasks/1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    const body = await response.json();
    expect(body.task).toMatchObject({
      title: "Design onboarding screen",
      priority: "high",
      due_date: "2025-02-01T00:00:00.000Z",
      assignee: { id: 1, name: "Alex Rivera", email: "alex@example.com" },
    });
  });
});
