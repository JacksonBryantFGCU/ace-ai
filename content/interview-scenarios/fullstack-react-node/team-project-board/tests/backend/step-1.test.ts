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
  it("returns projects, members, and tasks with correct default ordering", async () => {
    const response = await request("/board");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.projects).toHaveLength(3);
    expect(body.members).toHaveLength(4);
    expect(body.tasks).toHaveLength(8);
    expect(body.tasks.map((t: { id: number }) => t.id)).toEqual([1, 3, 7, 2, 4, 5, 6, 8]);
  });

  it("includes project name and assignee details, with null assignee when unassigned", async () => {
    const response = await request("/board");
    const body = await response.json();

    const assigned = body.tasks.find((t: { id: number }) => t.id === 1);
    expect(assigned).toMatchObject({
      id: 1,
      project_id: 1,
      project_name: "Mobile Redesign",
      assignee: { id: 1, name: "Alex Rivera", email: "alex@example.com" },
      title: "Design onboarding screen",
      status: "todo",
      priority: "high",
      due_date: "2025-02-01T00:00:00.000Z",
    });

    const unassigned = body.tasks.find((t: { id: number }) => t.id === 3);
    expect(unassigned).toMatchObject({ id: 3, assignee: null, description: null, due_date: null });
  });
});
