import app from "../workspace/app";
import { db } from "../workspace/db";

const seed = {
  customers:
    "INSERT INTO customers (id, email, name, created_at) VALUES (1, 'alex@example.com', 'Alex Rivera', '2025-01-01T09:00:00.000Z'), (2, 'sam@example.com', 'Sam Carter', '2025-01-02T10:30:00.000Z');",
  products:
    "INSERT INTO products (id, name, price_cents, stock, is_active, created_at) VALUES (1, 'Wireless Mouse', 2499, 10, 1, '2025-01-03T09:00:00.000Z'), (2, 'Notebook', 2500, 20, 1, '2025-01-03T10:00:00.000Z'), (3, 'Legacy Mug', 1299, 4, 0, '2025-01-03T11:00:00.000Z'), (4, 'Mechanical Keyboard', 4999, 2, 1, '2025-01-03T12:00:00.000Z'), (5, 'Design Systems Book', 1500, 5, 1, '2025-01-03T13:00:00.000Z');",
  orders:
    "INSERT INTO orders (id, customer_id, status, total_cents, created_at, updated_at) VALUES (1, 1, 'pending', 7498, '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'), (2, 2, 'paid', 4999, '2025-01-11T10:00:00.000Z', '2025-01-11T10:30:00.000Z'), (3, 1, 'shipped', 1500, '2025-01-12T11:00:00.000Z', '2025-01-12T12:00:00.000Z'), (4, 2, 'cancelled', 2500, '2025-01-13T12:00:00.000Z', '2025-01-13T12:15:00.000Z');",
  items:
    "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents, line_total_cents) VALUES (1, 1, 1, 2, 2499, 4998), (2, 1, 2, 1, 2500, 2500), (3, 2, 4, 1, 4999, 4999), (4, 3, 5, 1, 1500, 1500), (5, 4, 2, 1, 2500, 2500);",
};

function resetData() {
  db.exec("DELETE FROM order_items; DELETE FROM orders; DELETE FROM products; DELETE FROM customers;");
  db.exec(seed.customers);
  db.exec(seed.products);
  db.exec(seed.orders);
  db.exec(seed.items);
}

beforeEach(() => resetData());

test("POST /orders validates customer and items input", async () => {
  const missingCustomer = await request(app).post("/orders").send({ items: [{ product_id: 1, quantity: 1 }] });
  const invalidCustomer = await request(app).post("/orders").send({ customer_id: "abc", items: [{ product_id: 1, quantity: 1 }] });
  const missingCustomerRow = await request(app).post("/orders").send({ customer_id: 999, items: [{ product_id: 1, quantity: 1 }] });
  const missingItems = await request(app).post("/orders").send({ customer_id: 1 });
  const emptyItems = await request(app).post("/orders").send({ customer_id: 1, items: [] });

  expect(missingCustomer.body).toEqual({ error: "Customer id is required" });
  expect(invalidCustomer.body).toEqual({ error: "Invalid customer id" });
  expect(missingCustomerRow.status).toBe(404);
  expect(missingCustomerRow.body).toEqual({ error: "Customer not found" });
  expect(missingItems.body).toEqual({ error: "At least one item is required" });
  expect(emptyItems.body).toEqual({ error: "At least one item is required" });
});

test("POST /orders validates product ids, product state, quantities, stock, and duplicates", async () => {
  const invalidProduct = await request(app).post("/orders").send({ customer_id: 1, items: [{ product_id: "abc", quantity: 1 }] });
  const missingProduct = await request(app).post("/orders").send({ customer_id: 1, items: [{ product_id: 999, quantity: 1 }] });
  const inactive = await request(app).post("/orders").send({ customer_id: 1, items: [{ product_id: 3, quantity: 1 }] });
  const invalidQuantity = await request(app).post("/orders").send({ customer_id: 1, items: [{ product_id: 1, quantity: 0 }] });
  const insufficient = await request(app).post("/orders").send({ customer_id: 1, items: [{ product_id: 1, quantity: 999 }] });
  const duplicate = await request(app).post("/orders").send({
    customer_id: 1,
    items: [{ product_id: 1, quantity: 1 }, { product_id: 1, quantity: 2 }],
  });

  expect(invalidProduct.body).toEqual({ error: "Invalid product id" });
  expect(missingProduct.status).toBe(404);
  expect(missingProduct.body).toEqual({ error: "Product not found" });
  expect(inactive.body).toEqual({ error: "Product is inactive" });
  expect(invalidQuantity.body).toEqual({ error: "Invalid quantity" });
  expect(insufficient.body).toEqual({ error: "Insufficient stock" });
  expect(duplicate.body).toEqual({ error: "Duplicate product item" });
});

test("POST /orders creates an order from database prices, inserts items, and decrements stock", async () => {
  const res = await request(app).post("/orders").send({
    customer_id: 1,
    items: [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }],
  });

  expect(res.status).toBe(201);
  expect(res.body.order.id).toBe(5);
  expect(res.body.order.status).toBe("pending");
  expect(res.body.order.total_cents).toBe(7498);
  expect(res.body.order.items.map((item: { line_total_cents: number }) => item.line_total_cents)).toEqual([4998, 2500]);
  expect(res.body.order.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(res.body.order.updated_at).toBe(res.body.order.created_at);
  expect(db.get("SELECT stock FROM products WHERE id = ?", [1])).toEqual({ stock: 8 });
  expect(db.get("SELECT stock FROM products WHERE id = ?", [2])).toEqual({ stock: 19 });

  const fetched = await request(app).get("/orders/5");
  expect(fetched.body).toEqual(res.body);
});

test("POST /orders ignores client-submitted prices and keeps failed writes atomic", async () => {
  const created = await request(app).post("/orders").send({
    customer_id: 1,
    items: [{ product_id: 1, quantity: 1, unit_price_cents: 1 }],
  });
  const beforeOrders = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM orders");
  const beforeStock = db.get<{ stock: number }>("SELECT stock FROM products WHERE id = ?", [4]);
  const failed = await request(app).post("/orders").send({
    customer_id: 1,
    items: [{ product_id: 4, quantity: 1 }, { product_id: 2, quantity: 999 }],
  });

  expect(created.body.order.total_cents).toBe(2499);
  expect(failed.status).toBe(400);
  expect(failed.body).toEqual({ error: "Insufficient stock" });
  expect(db.get("SELECT COUNT(*) AS count FROM orders")).toEqual(beforeOrders);
  expect(db.get("SELECT stock FROM products WHERE id = ?", [4])).toEqual(beforeStock);
});
