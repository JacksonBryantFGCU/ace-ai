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
  it("filters by category and rejects an invalid category", async () => {
    const filtered = await request("/products?category=apparel");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.products.map((p: { id: number }) => p.id)).toEqual([3, 4]);

    const invalid = await request("/products?category=furniture");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid category" });
  });

  it("filters by low stock and rejects an invalid low_stock value", async () => {
    const filtered = await request("/products?low_stock=true");
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.products.map((p: { id: number }) => p.id)).toEqual([1, 3, 5, 7]);

    const invalid = await request("/products?low_stock=maybe");
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Invalid low stock filter" });
  });

  it("combines category and low_stock filters", async () => {
    const response = await request("/products?category=electronics&low_stock=true");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products.map((p: { id: number }) => p.id)).toEqual([1]);
  });

  it("returns correct summary counts", async () => {
    const response = await request("/products/summary");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toEqual({
      total_products: 8,
      low_stock: 4,
      ordered: 2,
    });
  });
});
