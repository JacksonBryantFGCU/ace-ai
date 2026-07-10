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
  it("returns the seeded applications ordered by applied_at descending", async () => {
    const response = await request("/applications");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.applications).toHaveLength(8);
    expect(body.applications.map((a: { id: number }) => a.id)).toEqual([2, 7, 4, 6, 3, 5, 8, 1]);

    expect(body.applications[0]).toMatchObject({
      id: 2,
      company: "Stripe",
      role: "Frontend Engineer Intern",
      location: "Remote",
      status: "applied",
      source: "company_site",
      notes: "Submitted through careers page.",
    });
  });
});
