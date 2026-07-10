import express from "express";
import { resetDatabase } from "./db";

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/__test/reset", async (_req, res) => {
  if (process.env.NODE_ENV !== "test") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await resetDatabase();
  res.json({ ok: true });
});

app.get("/orders", async (_req, res) => {
  // TODO (Step 1): return { orders } using listOrders(). Support the optional
  // status, customer_id, and seller_id filters in Step 2 — for now this can
  // ignore query parameters and return every order.
  res.json({ orders: [] });
});

app.get("/order-options", async (_req, res) => {
  // TODO (Step 1): return { customers, sellers, products } using
  // getOrderOptions(). It already includes every customer and seller, and
  // only active products from active sellers.
  res.json({ customers: [], sellers: [], products: [] });
});

app.get("/orders/:id", async (_req, res) => {
  // TODO (Step 1): validate the id, look up the order with its items, and
  // return { order, items }. Respond 400 "Invalid order id" for a
  // non-numeric id and 404 "Order not found" when it doesn't exist.
  res.status(404).json({ error: "Order not found" });
});

// TODO (Step 2): add GET /orders/summary (total_orders, pending, fulfilled,
// cancelled, gross_revenue_cents from fulfilled orders, pending_revenue_cents
// from pending orders) and POST /orders to create a pending order — validate
// the customer, every item (product exists/active, seller active, quantity,
// inventory, no duplicate products), calculate line totals and the subtotal
// server-side, and decrement inventory in a transaction.

// TODO (Step 3): add PATCH /orders/:id/fulfill and PATCH /orders/:id/cancel.
// Only pending orders can be fulfilled or cancelled; cancelling restores
// inventory. Both should be transactional and return the updated order.

export default app;
