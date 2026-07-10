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
  it("filters by project and rejects an invalid or missing project", async () => {
    const filtered = await request("/board?project_id=1");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.tasks.map((t: { id: number }) => t.id)).toEqual([1, 3, 7, 2]);

    const invalid = await request("/board?project_id=not-a-number");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid project id" });

    const missing = await request("/board?project_id=999");
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Project not found" });
  });

  it("filters by assignee and rejects an invalid or missing member", async () => {
    const filtered = await request("/board?assignee_id=2");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.tasks.map((t: { id: number }) => t.id)).toEqual([2, 6]);

    const invalid = await request("/board?assignee_id=not-a-number");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid assignee id" });

    const missing = await request("/board?assignee_id=999");
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Member not found" });
  });

  it("returns correct summary counts, unfiltered and filtered", async () => {
    const total = await request("/board/summary");
    expect(total.status).toBe(200);
    const totalBody = await total.json();
    expect(totalBody.summary).toEqual({
      total: 8,
      by_status: { todo: 2, in_progress: 2, review: 1, done: 3 },
      by_priority: { low: 3, medium: 2, high: 3 },
    });

    const filtered = await request("/board/summary?project_id=1");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.summary).toEqual({
      total: 4,
      by_status: { todo: 2, in_progress: 2, review: 0, done: 0 },
      by_priority: { low: 1, medium: 1, high: 2 },
    });
  });

  it("validates task creation fields", async () => {
    const invalidProject = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", priority: "medium" }),
    });
    expect(invalidProject.status).toBe(400);
    await expect(invalidProject.json()).resolves.toEqual({ error: "Invalid project id" });

    const missingProject = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 999, title: "Task", priority: "medium" }),
    });
    expect(missingProject.status).toBe(404);
    await expect(missingProject.json()).resolves.toEqual({ error: "Project not found" });

    const archivedProject = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 3, title: "Task", priority: "medium" }),
    });
    expect(archivedProject.status).toBe(400);
    await expect(archivedProject.json()).resolves.toEqual({ error: "Project is archived" });

    const invalidAssignee = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, assignee_id: "abc", title: "Task", priority: "medium" }),
    });
    expect(invalidAssignee.status).toBe(400);
    await expect(invalidAssignee.json()).resolves.toEqual({ error: "Invalid assignee id" });

    const missingAssignee = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, assignee_id: 999, title: "Task", priority: "medium" }),
    });
    expect(missingAssignee.status).toBe(404);
    await expect(missingAssignee.json()).resolves.toEqual({ error: "Assignee not found" });

    const missingTitle = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, title: "   ", priority: "medium" }),
    });
    expect(missingTitle.status).toBe(400);
    await expect(missingTitle.json()).resolves.toEqual({ error: "Title is required" });

    const invalidDescription = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, title: "Task", priority: "medium", description: 42 }),
    });
    expect(invalidDescription.status).toBe(400);
    await expect(invalidDescription.json()).resolves.toEqual({ error: "Invalid description" });

    const descriptionTooLong = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, title: "Task", priority: "medium", description: "x".repeat(501) }),
    });
    expect(descriptionTooLong.status).toBe(400);
    await expect(descriptionTooLong.json()).resolves.toEqual({ error: "Description is too long" });

    const invalidPriority = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, title: "Task", priority: "urgent" }),
    });
    expect(invalidPriority.status).toBe(400);
    await expect(invalidPriority.json()).resolves.toEqual({ error: "Invalid priority" });

    const invalidDueDate = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, title: "Task", priority: "medium", due_date: "not-a-date" }),
    });
    expect(invalidDueDate.status).toBe(400);
    await expect(invalidDueDate.json()).resolves.toEqual({ error: "Invalid due date" });
  });

  it("creates a task with project and assignee details in the response", async () => {
    const response = await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: 1,
        assignee_id: 2,
        title: "  Implement settings route  ",
        description: "  Add backend route and connect UI.  ",
        priority: "medium",
        due_date: "2025-02-10T00:00:00.000Z",
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.task).toMatchObject({
      project_id: 1,
      project_name: "Mobile Redesign",
      assignee: { id: 2, name: "Sam Carter", email: "sam@example.com" },
      title: "Implement settings route",
      description: "Add backend route and connect UI.",
      status: "todo",
      priority: "medium",
      due_date: "2025-02-10T00:00:00.000Z",
    });

    const board = await request("/board");
    const boardBody = await board.json();
    expect(boardBody.tasks).toHaveLength(9);
  });
});
