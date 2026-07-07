import app from "../workspace/app";

const SEEDED_PRODUCTS = [
  {
    id: 1,
    name: "Wireless Mouse",
    category: "electronics",
    price_cents: 2499,
    stock: 18,
    is_active: true,
    created_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    name: "Cotton T-Shirt",
    category: "apparel",
    price_cents: 1999,
    stock: 42,
    is_active: true,
    created_at: "2025-01-09T12:00:00.000Z",
  },
  {
    id: 3,
    name: "Ceramic Mug",
    category: "home",
    price_cents: 1299,
    stock: 0,
    is_active: false,
    created_at: "2025-01-08T15:30:00.000Z",
  },
  {
    id: 4,
    name: "TypeScript Handbook",
    category: "books",
    price_cents: 3499,
    stock: 7,
    is_active: true,
    created_at: "2025-01-11T10:15:00.000Z",
  },
  {
    id: 5,
    name: "Bluetooth Speaker",
    category: "electronics",
    price_cents: 5999,
    stock: 5,
    is_active: true,
    created_at: "2025-01-07T08:45:00.000Z",
  },
  {
    id: 6,
    name: "Desk Organizer",
    category: "home",
    price_cents: 2199,
    stock: 14,
    is_active: true,
    created_at: "2025-01-12T16:20:00.000Z",
  },
];

test("GET /products returns all seeded products ordered by id", async () => {
  const res = await request(app).get("/products");

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ products: SEEDED_PRODUCTS });
});

test("GET /products returns a stable product response shape with boolean is_active", async () => {
  const res = await request(app).get("/products");

  expect(res.status).toBe(200);
  expect(Object.prototype.hasOwnProperty.call(res.body, "products")).toBe(true);
  expect(Array.isArray(res.body.products)).toBe(true);
  expect(res.body.products).toHaveLength(6);

  for (const product of res.body.products) {
    expect(Object.keys(product).sort()).toEqual([
      "category",
      "created_at",
      "id",
      "is_active",
      "name",
      "price_cents",
      "stock",
    ]);
    expect(typeof product.is_active).toBe("boolean");
  }
});

test("GET /products/:id returns one product by id", async () => {
  const res = await request(app).get("/products/1");

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ product: SEEDED_PRODUCTS[0] });
});

test("GET /products/:id rejects invalid ids", async () => {
  const res = await request(app).get("/products/abc");

  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Invalid product id" });
});

test("GET /products/:id returns 404 for missing products", async () => {
  const res = await request(app).get("/products/999");

  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: "Product not found" });
});
