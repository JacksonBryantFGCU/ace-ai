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
  it("validates updates and persists successful responses", async () => {
    const invalid = await request("/feedback/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved", response: "   " }),
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Response is required for resolved feedback" });

    const update = await request("/feedback/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "resolved",
        response: "Thanks for the report. We improved weekly report loading.",
      }),
    });
    expect(update.status).toBe(200);

    const updateBody = await update.json();
    expect(updateBody.feedback).toMatchObject({
      id: 1,
      status: "resolved",
      response: "Thanks for the report. We improved weekly report loading.",
    });

    const resolved = await request("/feedback?status=resolved");
    const resolvedBody = await resolved.json();
    expect(resolvedBody.feedback.map((item: { id: number }) => item.id)).toContain(1);
  });
});
