import app from "../workspace/app";

test("GET /orders returns seeded orders with customer summary fields in deterministic order", async () => {
  const res = await request(app).get("/orders");

  expect(res.status).toBe(200);
  expect(res.body.orders.map((order: { id: number }) => order.id)).toEqual([1, 2, 3, 4]);
  expect(res.body.orders[0]).toEqual({
    id: 1,
    customer_id: 1,
    customer_name: "Alex Rivera",
    customer_email: "alex@example.com",
    status: "pending",
    total_cents: 7498,
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  });
});

test("GET /orders filters by status and rejects invalid status", async () => {
  const pending = await request(app).get("/orders?status=pending");
  const paid = await request(app).get("/orders?status=paid");
  const shipped = await request(app).get("/orders?status=shipped");
  const cancelled = await request(app).get("/orders?status=cancelled");
  const invalid = await request(app).get("/orders?status=refunded");

  expect(pending.body.orders.map((order: { id: number }) => order.id)).toEqual([1]);
  expect(paid.body.orders.map((order: { id: number }) => order.id)).toEqual([2]);
  expect(shipped.body.orders.map((order: { id: number }) => order.id)).toEqual([3]);
  expect(cancelled.body.orders.map((order: { id: number }) => order.id)).toEqual([4]);
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid status" });
});

test("GET /orders/:id returns one order with customer and item details", async () => {
  const res = await request(app).get("/orders/1");

  expect(res.status).toBe(200);
  expect(res.body.order).toEqual({
    id: 1,
    customer: { id: 1, name: "Alex Rivera", email: "alex@example.com" },
    status: "pending",
    total_cents: 7498,
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
    items: [
      {
        id: 1,
        product_id: 1,
        product_name: "Wireless Mouse",
        quantity: 2,
        unit_price_cents: 2499,
        line_total_cents: 4998,
      },
      {
        id: 2,
        product_id: 2,
        product_name: "Notebook",
        quantity: 1,
        unit_price_cents: 2500,
        line_total_cents: 2500,
      },
    ],
  });
});

test("GET /orders/:id validates ids and missing orders", async () => {
  const invalid = await request(app).get("/orders/abc");
  const missing = await request(app).get("/orders/999");

  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid order id" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Order not found" });
});
