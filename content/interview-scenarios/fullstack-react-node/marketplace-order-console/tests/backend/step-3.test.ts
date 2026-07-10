import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { getProductById, resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function patch(path: string) {
  return request(path, { method: "PATCH" });
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

describe("backend step 3 fulfill", () => {
  it("validates the id and existence", async () => {
    const invalid = await patch("/orders/not-a-number/fulfill");
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("Invalid order id");

    const missing = await patch("/orders/9999/fulfill");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe("Order not found");
  });

  it("fulfills a pending order and sets fulfilled_at/updated_at", async () => {
    const response = await patch("/orders/1/fulfill");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.order.status).toBe("fulfilled");
    expect(body.order.fulfilled_at).not.toBeNull();
    expect(body.order.updated_at).not.toBe("2025-03-01T09:00:00.000Z");
  });

  it("rejects fulfilling an already fulfilled order", async () => {
    const response = await patch("/orders/2/fulfill");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Order is already fulfilled");
  });

  it("rejects fulfilling a cancelled order", async () => {
    const response = await patch("/orders/3/fulfill");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Order is cancelled");
  });
});

describe("backend step 3 cancel", () => {
  it("cancels a pending order, sets cancelled_at, and restores inventory", async () => {
    const beforeProduct1 = await getProductById(1);
    const beforeProduct5 = await getProductById(5);

    const response = await patch("/orders/4/cancel");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.order.status).toBe("cancelled");
    expect(body.order.cancelled_at).not.toBeNull();

    const afterProduct1 = await getProductById(1);
    const afterProduct5 = await getProductById(5);
    expect(afterProduct1?.inventory_count).toBe(beforeProduct1!.inventory_count + 1);
    expect(afterProduct5?.inventory_count).toBe(beforeProduct5!.inventory_count + 2);
  });

  it("rejects cancelling an already cancelled order", async () => {
    const response = await patch("/orders/3/cancel");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Order is already cancelled");
  });

  it("rejects cancelling a fulfilled order", async () => {
    const response = await patch("/orders/2/cancel");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Order is fulfilled");
  });
});
