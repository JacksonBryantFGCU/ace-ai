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
  it("validates the id, body, and field values before updating", async () => {
    const invalidId = await request("/products/not-a-number", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: 5 }),
    });
    expect(invalidId.status).toBe(400);
    await expect(invalidId.json()).resolves.toEqual({ error: "Invalid product id" });

    const missing = await request("/products/999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: 5 }),
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Product not found" });

    const empty = await request("/products/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "No update fields provided" });

    const unknownField = await request("/products/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(unknownField.status).toBe(400);
    await expect(unknownField.json()).resolves.toEqual({ error: "Unknown update field" });

    const invalidStock = await request("/products/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: -1 }),
    });
    expect(invalidStock.status).toBe(400);
    await expect(invalidStock.json()).resolves.toEqual({ error: "Invalid stock" });

    const invalidStatus = await request("/products/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder_status: "backordered" }),
    });
    expect(invalidStatus.status).toBe(400);
    await expect(invalidStatus.json()).resolves.toEqual({ error: "Invalid reorder status" });
  });

  it("applies a valid update, recomputes needs_reorder, and persists it", async () => {
    const update = await request("/products/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: 20, reorder_status: "none" }),
    });
    expect(update.status).toBe(200);

    const updateBody = await update.json();
    expect(updateBody.product).toMatchObject({
      id: 1,
      stock: 20,
      reorder_status: "none",
      needs_reorder: false,
    });
    expect(updateBody.product.updated_at).not.toBe("2025-01-10T09:00:00.000Z");

    const persisted = await request("/products?low_stock=true");
    const persistedBody = await persisted.json();
    expect(persistedBody.products.map((p: { id: number }) => p.id)).not.toContain(1);
  });
});
