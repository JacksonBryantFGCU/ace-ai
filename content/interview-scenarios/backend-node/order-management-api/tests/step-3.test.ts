import app from "../workspace/app";
import { db } from "../workspace/db";

function resetStatuses() {
  db.run("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", ["pending", "2025-01-10T09:00:00.000Z", 1]);
  db.run("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", ["paid", "2025-01-11T10:30:00.000Z", 2]);
  db.run("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", ["shipped", "2025-01-12T12:00:00.000Z", 3]);
  db.run("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", ["cancelled", "2025-01-13T12:15:00.000Z", 4]);
}

beforeEach(() => resetStatuses());

test("PATCH /orders/:id/status validates id, order existence, and status body", async () => {
  const invalidId = await request(app).patch("/orders/abc/status").send({ status: "paid" });
  const missingOrder = await request(app).patch("/orders/999/status").send({ status: "paid" });
  const missingStatus = await request(app).patch("/orders/1/status").send({});
  const invalidStatus = await request(app).patch("/orders/1/status").send({ status: "refunded" });

  expect(invalidId.body).toEqual({ error: "Invalid order id" });
  expect(missingOrder.status).toBe(404);
  expect(missingOrder.body).toEqual({ error: "Order not found" });
  expect(missingStatus.body).toEqual({ error: "Status is required" });
  expect(invalidStatus.body).toEqual({ error: "Invalid status" });
});

test("PATCH /orders/:id/status allows valid transitions", async () => {
  const pendingPaid = await request(app).patch("/orders/1/status").send({ status: "paid" });
  resetStatuses();
  const pendingCancelled = await request(app).patch("/orders/1/status").send({ status: "cancelled" });
  const paidShipped = await request(app).patch("/orders/2/status").send({ status: "shipped" });
  resetStatuses();
  const paidCancelled = await request(app).patch("/orders/2/status").send({ status: "cancelled" });

  expect(pendingPaid.body.order.status).toBe("paid");
  expect(pendingCancelled.body.order.status).toBe("cancelled");
  expect(paidShipped.body.order.status).toBe("shipped");
  expect(paidCancelled.body.order.status).toBe("cancelled");
});

test("PATCH /orders/:id/status rejects invalid transitions from pending, shipped, and cancelled", async () => {
  const pendingShipped = await request(app).patch("/orders/1/status").send({ status: "shipped" });
  const shippedPaid = await request(app).patch("/orders/3/status").send({ status: "paid" });
  const cancelledPaid = await request(app).patch("/orders/4/status").send({ status: "paid" });

  expect(pendingShipped.body).toEqual({ error: "Invalid status transition" });
  expect(shippedPaid.body).toEqual({ error: "Invalid status transition" });
  expect(cancelledPaid.body).toEqual({ error: "Invalid status transition" });
});

test("PATCH /orders/:id/status updates updated_at and preserves totals and items", async () => {
  const before = await request(app).get("/orders/1");
  const updated = await request(app).patch("/orders/1/status").send({ status: "paid" });

  expect(updated.status).toBe(200);
  expect(updated.body.order.status).toBe("paid");
  expect(updated.body.order.updated_at).not.toBe(before.body.order.updated_at);
  expect(updated.body.order.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(updated.body.order.total_cents).toBe(before.body.order.total_cents);
  expect(updated.body.order.items).toEqual(before.body.order.items);
});

test("completed API still supports listing, filtering, detail, and order creation", async () => {
  await request(app).patch("/orders/1/status").send({ status: "paid" });
  const list = await request(app).get("/orders?status=paid");
  const created = await request(app).post("/orders").send({ customer_id: 1, items: [{ product_id: 5, quantity: 1 }] });

  expect(list.body.orders.map((order: { id: number }) => order.id)).toEqual([1, 2]);
  expect(created.status).toBe(201);
  expect(created.body.order.total_cents).toBe(1500);
});
