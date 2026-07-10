import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function patchJson(path: string, body: unknown) {
  return request(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

describe("backend step 3 campaign updates", () => {
  it("validates the id and existence", async () => {
    const invalid = await patchJson("/campaigns/not-a-number", { budget_cents: 1000 });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("Invalid campaign id");

    const missing = await patchJson("/campaigns/9999", { budget_cents: 1000 });
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe("Campaign not found");
  });

  it("requires at least one update field", async () => {
    const response = await patchJson("/campaigns/5", {});
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("No update fields provided");
  });

  it("rejects an unknown field", async () => {
    const response = await patchJson("/campaigns/5", { name: "New Name" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Unknown update field");
  });

  it("rejects an invalid budget", async () => {
    const response = await patchJson("/campaigns/5", { budget_cents: -100 });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid budget");
  });

  it("rejects an invalid status", async () => {
    const response = await patchJson("/campaigns/5", { status: "archived" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid campaign status");
  });

  it("updates budget, changes updated_at, and returns recalculated metrics", async () => {
    const before = await (await request("/campaigns/5")).json();

    const response = await patchJson("/campaigns/5", { budget_cents: 200000 });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.campaign.budget_cents).toBe(200000);
    expect(body.campaign.metrics.budget_remaining_cents).toBe(200000 - body.campaign.metrics.spend_cents);
    expect(body.campaign.updated_at).not.toBe(before.campaign.updated_at);
  });

  it("allows draft -> active", async () => {
    const response = await patchJson("/campaigns/3", { status: "active" });
    expect(response.status).toBe(200);
    expect((await response.json()).campaign.status).toBe("active");
  });

  it("allows active -> paused", async () => {
    const response = await patchJson("/campaigns/1", { status: "paused" });
    expect(response.status).toBe(200);
    expect((await response.json()).campaign.status).toBe("paused");
  });

  it("allows paused -> active", async () => {
    const response = await patchJson("/campaigns/2", { status: "active" });
    expect(response.status).toBe(200);
    expect((await response.json()).campaign.status).toBe("active");
  });

  it("allows active -> completed", async () => {
    const response = await patchJson("/campaigns/5", { status: "completed" });
    expect(response.status).toBe(200);
    expect((await response.json()).campaign.status).toBe("completed");
  });

  it("rejects draft -> completed", async () => {
    const response = await patchJson("/campaigns/3", { status: "completed" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid status transition");
  });

  it("rejects completed -> active", async () => {
    const response = await patchJson("/campaigns/4", { status: "active" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid status transition");
  });

  it("rejects any update on a completed campaign", async () => {
    const response = await patchJson("/campaigns/4", { budget_cents: 500000 });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Campaign is completed");
  });
});
