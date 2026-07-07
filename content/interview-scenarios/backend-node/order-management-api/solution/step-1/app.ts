import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const VALID_STATUSES = new Set(["pending", "paid", "shipped", "cancelled"]);

type OrderRow = {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  status: string;
  total_cents: number;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function orderList(where = "", params: unknown[] = []) {
  return db.all<OrderRow>(
    `SELECT orders.id, orders.customer_id, customers.name AS customer_name, customers.email AS customer_email,
            orders.status, orders.total_cents, orders.created_at, orders.updated_at
     FROM orders
     JOIN customers ON customers.id = orders.customer_id
     ${where}
     ORDER BY orders.created_at ASC, orders.id ASC`,
    params,
  );
}

function findOrder(id: number) {
  const row = db.get<OrderRow>(
    `SELECT orders.id, orders.customer_id, customers.name AS customer_name, customers.email AS customer_email,
            orders.status, orders.total_cents, orders.created_at, orders.updated_at
     FROM orders
     JOIN customers ON customers.id = orders.customer_id
     WHERE orders.id = ?`,
    [id],
  );
  if (!row) return null;
  const items = db.all<ItemRow>(
    `SELECT order_items.id, order_items.product_id, products.name AS product_name,
            order_items.quantity, order_items.unit_price_cents, order_items.line_total_cents
     FROM order_items
     JOIN products ON products.id = order_items.product_id
     WHERE order_items.order_id = ?
     ORDER BY order_items.id ASC`,
    [id],
  );
  return {
    id: row.id,
    customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email },
    status: row.status,
    total_cents: row.total_cents,
    created_at: row.created_at,
    updated_at: row.updated_at,
    items,
  };
}

app.get("/orders", (req, res) => {
  const status = queryValue(req.query.status);
  if (status && !VALID_STATUSES.has(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const orders = status ? orderList("WHERE orders.status = ?", [status]) : orderList();
  res.status(200).json({ orders });
});

app.get("/orders/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const order = findOrder(id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.status(200).json({ order });
});

export default app;
