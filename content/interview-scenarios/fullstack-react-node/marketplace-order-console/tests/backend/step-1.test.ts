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
  it("returns orders with customer summary in default order", async () => {
    const response = await request("/orders");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.orders).toHaveLength(8);
    expect(body.orders.map((order: { id: number }) => order.id)).toEqual([4, 6, 8, 2, 5, 3, 7, 1]);

    const first = body.orders[0];
    expect(first).toMatchObject({
      id: 4,
      customer: { id: 1, name: "Alex Rivera", email: "alex@example.com" },
      status: "pending",
      subtotal_cents: 14100,
      item_count: 2,
      seller_count: 2,
      fulfilled_at: null,
      cancelled_at: null,
    });
  });

  it("returns order detail with joined product and seller info on items", async () => {
    const response = await request("/orders/1");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.order).toMatchObject({ id: 1, status: "pending", subtotal_cents: 10200 });
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({
      id: 1,
      product: { id: 1, name: "Wireless Keyboard", sku: "TECH-KEY-001" },
      seller: { id: 1, name: "Tech Supply Co" },
      quantity: 2,
      unit_price_cents: 4500,
      line_total_cents: 9000,
    });
  });

  it("returns 400 for an invalid order id and 404 for a missing order", async () => {
    const invalid = await request("/orders/not-a-number");
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("Invalid order id");

    const missing = await request("/orders/9999");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe("Order not found");
  });

  it("returns order options with every customer, every seller, and only active products from active sellers", async () => {
    const response = await request("/order-options");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.customers).toHaveLength(3);
    expect(body.sellers).toHaveLength(3);
    expect(body.products.map((product: { id: number }) => product.id)).toEqual([1, 2, 4, 5]);
  });
});
