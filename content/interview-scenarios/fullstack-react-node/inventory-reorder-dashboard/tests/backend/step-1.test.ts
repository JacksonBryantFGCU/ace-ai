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
  it("returns the seeded products in deterministic order with computed needs_reorder", async () => {
    const response = await request("/products");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.products).toHaveLength(8);
    expect(body.products.map((p: { id: number }) => p.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(body.products[0]).toMatchObject({
      id: 1,
      name: "Wireless Mouse",
      sku: "ELEC-MOUSE-001",
      category: "electronics",
      stock: 8,
      reorder_level: 10,
      needs_reorder: true,
    });
    expect(body.products[1]).toMatchObject({
      id: 2,
      stock: 25,
      reorder_level: 15,
      needs_reorder: false,
    });
  });
});
