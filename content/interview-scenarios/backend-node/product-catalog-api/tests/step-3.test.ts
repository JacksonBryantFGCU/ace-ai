import app from "../workspace/app";
import { db } from "../workspace/db";

function resetProducts() {
  db.exec("DELETE FROM products;");
  db.run(
    "INSERT INTO products (id, name, category, price_cents, stock, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [1, "Wireless Mouse", "electronics", 2499, 18, 1, "2025-01-10T09:00:00.000Z"],
  );
  db.run(
    "INSERT INTO products (id, name, category, price_cents, stock, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [2, "Cotton T-Shirt", "apparel", 1999, 42, 1, "2025-01-09T12:00:00.000Z"],
  );
  db.run(
    "INSERT INTO products (id, name, category, price_cents, stock, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [3, "Ceramic Mug", "home", 1299, 0, 0, "2025-01-08T15:30:00.000Z"],
  );
  db.run(
    "INSERT INTO products (id, name, category, price_cents, stock, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [4, "TypeScript Handbook", "books", 3499, 7, 1, "2025-01-11T10:15:00.000Z"],
  );
  db.run(
    "INSERT INTO products (id, name, category, price_cents, stock, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [5, "Bluetooth Speaker", "electronics", 5999, 5, 1, "2025-01-07T08:45:00.000Z"],
  );
  db.run(
    "INSERT INTO products (id, name, category, price_cents, stock, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [6, "Desk Organizer", "home", 2199, 14, 1, "2025-01-12T16:20:00.000Z"],
  );
}

beforeEach(() => {
  resetProducts();
});

test("POST /products validates name, category, price, stock, and is_active", async () => {
  const missingName = await request(app).post("/products").send({
    category: "home",
    price_cents: 3999,
    stock: 12,
    is_active: true,
  });
  const emptyName = await request(app).post("/products").send({
    name: "   ",
    category: "home",
    price_cents: 3999,
    stock: 12,
    is_active: true,
  });
  const invalidCategory = await request(app).post("/products").send({
    name: "Desk Lamp",
    category: "toys",
    price_cents: 3999,
    stock: 12,
    is_active: true,
  });
  const invalidPrice = await request(app).post("/products").send({
    name: "Desk Lamp",
    category: "home",
    price_cents: -1,
    stock: 12,
    is_active: true,
  });
  const invalidStock = await request(app).post("/products").send({
    name: "Desk Lamp",
    category: "home",
    price_cents: 3999,
    stock: -1,
    is_active: true,
  });
  const invalidActive = await request(app).post("/products").send({
    name: "Desk Lamp",
    category: "home",
    price_cents: 3999,
    stock: 12,
    is_active: "yes",
  });

  expect(missingName.status).toBe(400);
  expect(missingName.body).toEqual({ error: "Name is required" });
  expect(emptyName.status).toBe(400);
  expect(emptyName.body).toEqual({ error: "Name is required" });
  expect(invalidCategory.status).toBe(400);
  expect(invalidCategory.body).toEqual({ error: "Invalid category" });
  expect(invalidPrice.status).toBe(400);
  expect(invalidPrice.body).toEqual({ error: "Invalid price" });
  expect(invalidStock.status).toBe(400);
  expect(invalidStock.body).toEqual({ error: "Invalid stock" });
  expect(invalidActive.status).toBe(400);
  expect(invalidActive.body).toEqual({ error: "Invalid active value" });
  expect(db.get("SELECT COUNT(*) AS count FROM products")).toEqual({ count: 6 });
});

test("POST /products creates a valid product, trims the name, and returns boolean is_active", async () => {
  const res = await request(app).post("/products").send({
    name: "  Desk Lamp  ",
    category: "home",
    price_cents: 3999,
    stock: 12,
    is_active: false,
  });

  expect(res.status).toBe(201);
  expect(res.body.product).toMatchObject({
    id: 7,
    name: "Desk Lamp",
    category: "home",
    price_cents: 3999,
    stock: 12,
    is_active: false,
  });
  expect(res.body.product.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(db.get("SELECT is_active FROM products WHERE id = ?", [7])).toEqual({ is_active: 0 });
});

test("POST /products defaults omitted is_active to true", async () => {
  const res = await request(app).post("/products").send({
    name: "Reading Light",
    category: "home",
    price_cents: 2999,
    stock: 9,
  });

  expect(res.status).toBe(201);
  expect(res.body.product.is_active).toBe(true);
  expect(db.get("SELECT is_active FROM products WHERE id = ?", [7])).toEqual({ is_active: 1 });
});

test("created products can be fetched by id and appear in the product list", async () => {
  const created = await request(app).post("/products").send({
    name: "Desk Lamp",
    category: "home",
    price_cents: 3999,
    stock: 12,
    is_active: true,
  });

  const detail = await request(app).get(`/products/${created.body.product.id}`);
  const list = await request(app).get("/products");

  expect(detail.status).toBe(200);
  expect(detail.body).toEqual({ product: created.body.product });
  expect(list.status).toBe(200);
  expect(list.body.products).toHaveLength(7);
  expect(list.body.products[6]).toEqual(created.body.product);
});

test("created products participate in filters and sorting", async () => {
  const created = await request(app).post("/products").send({
    name: "Budget Notebook",
    category: "books",
    price_cents: 799,
    stock: 30,
    is_active: true,
  });

  const filtered = await request(app).get("/products?category=books&active=true&sort=price");

  expect(created.status).toBe(201);
  expect(filtered.status).toBe(200);
  expect(filtered.body.products.map((product: { id: number }) => product.id)).toEqual([7, 4]);
});

test("previous list, detail, filter, and sort behavior still works after creation", async () => {
  await request(app).post("/products").send({
    name: "Desk Lamp",
    category: "home",
    price_cents: 3999,
    stock: 12,
    is_active: true,
  });

  const detail = await request(app).get("/products/1");
  const inactive = await request(app).get("/products?active=false");
  const byPrice = await request(app).get("/products?sort=price");

  expect(detail.body.product.name).toBe("Wireless Mouse");
  expect(inactive.body.products.map((product: { id: number }) => product.id)).toEqual([3]);
  expect(byPrice.body.products.map((product: { id: number }) => product.id)).toEqual([3, 2, 6, 1, 4, 7, 5]);
});
