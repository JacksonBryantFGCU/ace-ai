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

test("GET /products keeps returning all products when no filters are provided", async () => {
  const res = await request(app).get("/products");

  expect(res.status).toBe(200);
  expect(res.body.products.map((product: { id: number }) => product.id)).toEqual([1, 2, 3, 4, 5, 6]);
});

test("GET /products filters by each valid category", async () => {
  const apparel = await request(app).get("/products?category=apparel");
  const electronics = await request(app).get("/products?category=electronics");
  const home = await request(app).get("/products?category=home");
  const books = await request(app).get("/products?category=books");

  expect(apparel.body.products.map((product: { id: number }) => product.id)).toEqual([2]);
  expect(electronics.body.products.map((product: { id: number }) => product.id)).toEqual([1, 5]);
  expect(home.body.products.map((product: { id: number }) => product.id)).toEqual([3, 6]);
  expect(books.body.products.map((product: { id: number }) => product.id)).toEqual([4]);
});

test("GET /products rejects invalid category filters", async () => {
  const res = await request(app).get("/products?category=toys");

  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Invalid category" });
});

test("GET /products filters by active=true and active=false", async () => {
  const active = await request(app).get("/products?active=true");
  const inactive = await request(app).get("/products?active=false");

  expect(active.status).toBe(200);
  expect(active.body.products.map((product: { id: number }) => product.id)).toEqual([1, 2, 4, 5, 6]);
  expect(active.body.products.every((product: { is_active: boolean }) => product.is_active === true)).toBe(true);
  expect(inactive.status).toBe(200);
  expect(inactive.body.products.map((product: { id: number }) => product.id)).toEqual([3]);
  expect(inactive.body.products[0].is_active).toBe(false);
});

test("GET /products rejects invalid active filters", async () => {
  const res = await request(app).get("/products?active=yes");

  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Invalid active filter" });
});

test("GET /products sorts by price, stock, and created_at deterministically", async () => {
  const byPrice = await request(app).get("/products?sort=price");
  const byStock = await request(app).get("/products?sort=stock");
  const byCreatedAt = await request(app).get("/products?sort=created_at");

  expect(byPrice.body.products.map((product: { id: number }) => product.id)).toEqual([3, 2, 6, 1, 4, 5]);
  expect(byStock.body.products.map((product: { id: number }) => product.id)).toEqual([3, 5, 4, 6, 1, 2]);
  expect(byCreatedAt.body.products.map((product: { id: number }) => product.id)).toEqual([5, 3, 2, 1, 4, 6]);
});

test("GET /products rejects invalid sort values", async () => {
  const res = await request(app).get("/products?sort=name");

  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Invalid sort" });
});

test("GET /products supports combined category, active, and sort filters", async () => {
  const res = await request(app).get("/products?category=electronics&active=true&sort=price");

  expect(res.status).toBe(200);
  expect(res.body.products.map((product: { id: number }) => product.id)).toEqual([1, 5]);
});
