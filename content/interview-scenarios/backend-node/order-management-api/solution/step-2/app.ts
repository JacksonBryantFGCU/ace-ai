import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const VALID_STATUSES = new Set(["pending", "paid", "shipped", "cancelled"]);

type OrderRow = { id: number; customer_id: number; customer_name: string; customer_email: string; status: string; total_cents: number; created_at: string; updated_at: string };
type ItemRow = { id: number; product_id: number; product_name: string; quantity: number; unit_price_cents: number; line_total_cents: number };
type ProductRow = { id: number; name: string; price_cents: number; stock: number; is_active: number };

function nowIso() { return new Date().toISOString(); }
function queryValue(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function parseId(raw: string) { const id = Number(raw); return Number.isInteger(id) && id > 0 ? id : null; }

function orderList(where = "", params: unknown[] = []) {
  return db.all<OrderRow>(
    `SELECT orders.id, orders.customer_id, customers.name AS customer_name, customers.email AS customer_email,
            orders.status, orders.total_cents, orders.created_at, orders.updated_at
     FROM orders JOIN customers ON customers.id = orders.customer_id ${where}
     ORDER BY orders.created_at ASC, orders.id ASC`,
    params,
  );
}

function findOrder(id: number) {
  const row = db.get<OrderRow>(
    `SELECT orders.id, orders.customer_id, customers.name AS customer_name, customers.email AS customer_email,
            orders.status, orders.total_cents, orders.created_at, orders.updated_at
     FROM orders JOIN customers ON customers.id = orders.customer_id WHERE orders.id = ?`,
    [id],
  );
  if (!row) return null;
  const items = db.all<ItemRow>(
    `SELECT order_items.id, order_items.product_id, products.name AS product_name,
            order_items.quantity, order_items.unit_price_cents, order_items.line_total_cents
     FROM order_items JOIN products ON products.id = order_items.product_id
     WHERE order_items.order_id = ? ORDER BY order_items.id ASC`,
    [id],
  );
  return { id: row.id, customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email }, status: row.status, total_cents: row.total_cents, created_at: row.created_at, updated_at: row.updated_at, items };
}

function validateOrderBody(body: { customer_id?: unknown; items?: unknown }) {
  if (body.customer_id === undefined) return { error: "Customer id is required" };
  if (!Number.isInteger(body.customer_id) || body.customer_id <= 0) return { error: "Invalid customer id" };
  if (!Array.isArray(body.items) || body.items.length === 0) return { error: "At least one item is required" };
  const seen = new Set<number>();
  for (const item of body.items as Array<{ product_id?: unknown; quantity?: unknown }>) {
    if (!Number.isInteger(item.product_id) || item.product_id <= 0) return { error: "Invalid product id" };
    if (seen.has(item.product_id)) return { error: "Duplicate product item" };
    seen.add(item.product_id);
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) return { error: "Invalid quantity" };
  }
  return null;
}

app.get("/orders", (req, res) => {
  const status = queryValue(req.query.status);
  if (status && !VALID_STATUSES.has(status)) return void res.status(400).json({ error: "Invalid status" });
  res.status(200).json({ orders: status ? orderList("WHERE orders.status = ?", [status]) : orderList() });
});

app.get("/orders/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return void res.status(400).json({ error: "Invalid order id" });
  const order = findOrder(id);
  if (!order) return void res.status(404).json({ error: "Order not found" });
  res.status(200).json({ order });
});

app.post("/orders", (req, res) => {
  const body = req.body as { customer_id?: unknown; items?: unknown };
  const invalid = validateOrderBody(body);
  if (invalid) return void res.status(400).json(invalid);
  if (!db.get("SELECT id FROM customers WHERE id = ?", [body.customer_id])) return void res.status(404).json({ error: "Customer not found" });

  try {
    const orderId = db.transaction(() => {
      const prepared = (body.items as Array<{ product_id: number; quantity: number }>).map((item) => {
        const product = db.get<ProductRow>("SELECT id, name, price_cents, stock, is_active FROM products WHERE id = ?", [item.product_id]);
        if (!product) throw new Error("Product not found");
        if (product.is_active !== 1) throw new Error("Product is inactive");
        if (product.stock < item.quantity) throw new Error("Insufficient stock");
        return { ...item, product, line_total_cents: product.price_cents * item.quantity };
      });
      const total = prepared.reduce((sum, item) => sum + item.line_total_cents, 0);
      const now = nowIso();
      const result = db.run("INSERT INTO orders (customer_id, status, total_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", [body.customer_id, "pending", total, now, now]);
      for (const item of prepared) {
        db.run("INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, line_total_cents) VALUES (?, ?, ?, ?, ?)", [result.lastInsertRowid, item.product_id, item.quantity, item.product.price_cents, item.line_total_cents]);
        db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
      }
      return result.lastInsertRowid;
    })();
    res.status(201).json({ order: findOrder(orderId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Product not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

export default app;
