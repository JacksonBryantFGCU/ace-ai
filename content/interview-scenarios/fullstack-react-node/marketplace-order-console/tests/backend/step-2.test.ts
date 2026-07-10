import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { getProductById, resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function postJson(path: string, body: unknown) {
  return request(path, {
    method: "POST",
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

describe("backend step 2 filters and summary", () => {
  it("filters by status", async () => {
    const response = await request("/orders?status=pending");
    const body = await response.json();
    expect(body.orders.map((order: { id: number }) => order.id)).toEqual([4, 6, 8, 1]);
  });

  it("rejects an invalid status filter", async () => {
    const response = await request("/orders?status=shipped");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid order status");
  });

  it("filters by customer_id and validates it", async () => {
    const response = await request("/orders?customer_id=1");
    const body = await response.json();
    expect(body.orders.map((order: { id: number }) => order.id)).toEqual([4, 7, 1]);

    const invalid = await request("/orders?customer_id=abc");
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("Invalid customer id");

    const missing = await request("/orders?customer_id=9999");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe("Customer not found");
  });

  it("filters by seller_id (orders containing at least one item from that seller) and validates it", async () => {
    const response = await request("/orders?seller_id=1");
    const body = await response.json();
    expect(body.orders.map((order: { id: number }) => order.id)).toEqual([4, 6, 3, 7, 1]);

    const missing = await request("/orders?seller_id=9999");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe("Seller not found");
  });

  it("returns summary counts and revenue", async () => {
    const response = await request("/orders/summary");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toEqual({
      total_orders: 8,
      pending: 4,
      fulfilled: 2,
      cancelled: 2,
      gross_revenue_cents: 16800,
      pending_revenue_cents: 42600,
    });
  });
});

describe("backend step 2 order creation", () => {
  it("validates the customer", async () => {
    const invalid = await postJson("/orders", { customer_id: "abc", items: [{ product_id: 1, quantity: 1 }] });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("Invalid customer id");

    const missing = await postJson("/orders", { customer_id: 9999, items: [{ product_id: 1, quantity: 1 }] });
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe("Customer not found");
  });

  it("requires at least one item", async () => {
    const response = await postJson("/orders", { customer_id: 1, items: [] });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Items are required");
  });

  it("rejects a duplicate product in one order", async () => {
    const response = await postJson("/orders", {
      customer_id: 1,
      items: [
        { product_id: 1, quantity: 1 },
        { product_id: 1, quantity: 1 },
      ],
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Duplicate product in order");
  });

  it("rejects an inactive product", async () => {
    const response = await postJson("/orders", { customer_id: 1, items: [{ product_id: 3, quantity: 1 }] });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Product is inactive");
  });

  it("rejects a product from a suspended seller", async () => {
    const response = await postJson("/orders", { customer_id: 1, items: [{ product_id: 6, quantity: 1 }] });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Seller is suspended");
  });

  it("rejects an invalid quantity", async () => {
    const response = await postJson("/orders", { customer_id: 1, items: [{ product_id: 1, quantity: 0 }] });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid quantity");
  });

  it("rejects insufficient inventory", async () => {
    const response = await postJson("/orders", { customer_id: 1, items: [{ product_id: 2, quantity: 1 }] });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Insufficient inventory");
  });

  it("creates an order, calculates totals server-side, and decrements inventory", async () => {
    const response = await postJson("/orders", {
      customer_id: 1,
      items: [
        { product_id: 1, quantity: 1 },
        { product_id: 4, quantity: 2 },
      ],
    });
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.order).toMatchObject({ customer: { id: 1 }, status: "pending", subtotal_cents: 6900 });
    expect(body.items).toHaveLength(2);
    expect(body.items.find((item: { product: { id: number } }) => item.product.id === 1)).toMatchObject({
      quantity: 1,
      unit_price_cents: 4500,
      line_total_cents: 4500,
    });
    expect(body.items.find((item: { product: { id: number } }) => item.product.id === 4)).toMatchObject({
      quantity: 2,
      unit_price_cents: 1200,
      line_total_cents: 2400,
    });

    const product1 = await getProductById(1);
    const product4 = await getProductById(4);
    expect(product1?.inventory_count).toBe(17);
    expect(product4?.inventory_count).toBe(38);
  });
});
