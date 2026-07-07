import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const VALID_CATEGORIES = new Set(["apparel", "electronics", "home", "books"]);
const SORT_COLUMNS: Record<string, string> = {
  price: "price_cents",
  stock: "stock",
  created_at: "created_at",
};

type ProductRow = {
  id: number;
  name: string;
  category: string;
  price_cents: number;
  stock: number;
  is_active: number;
  created_at: string;
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toProduct(row: ProductRow) {
  return {
    ...row,
    is_active: row.is_active === 1,
  };
}

function parseProductId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function findProduct(id: number) {
  const row = db.get<ProductRow>(
    "SELECT id, name, category, price_cents, stock, is_active, created_at FROM products WHERE id = ?",
    [id],
  );
  return row ? toProduct(row) : null;
}

function nowIso() {
  return new Date().toISOString();
}

app.get("/products", (req, res) => {
  const category = queryValue(req.query.category);
  const active = queryValue(req.query.active);
  const sort = queryValue(req.query.sort);

  if (category && !VALID_CATEGORIES.has(category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  if (active && active !== "true" && active !== "false") {
    res.status(400).json({ error: "Invalid active filter" });
    return;
  }

  if (sort && !SORT_COLUMNS[sort]) {
    res.status(400).json({ error: "Invalid sort" });
    return;
  }

  const where: string[] = [];
  const params: unknown[] = [];

  if (category) {
    where.push("category = ?");
    params.push(category);
  }

  if (active) {
    where.push("is_active = ?");
    params.push(active === "true" ? 1 : 0);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderColumn = sort ? SORT_COLUMNS[sort] : "id";
  const rows = db.all<ProductRow>(
    `SELECT id, name, category, price_cents, stock, is_active, created_at FROM products ${whereClause} ORDER BY ${orderColumn}, id`,
    params,
  );

  res.status(200).json({ products: rows.map(toProduct) });
});

app.get("/products/:id", (req, res) => {
  const id = parseProductId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const product = findProduct(id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.status(200).json({ product });
});

app.post("/products", (req, res) => {
  const body = req.body as {
    name?: unknown;
    category?: unknown;
    price_cents?: unknown;
    stock?: unknown;
    is_active?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  if (typeof body.category !== "string" || !VALID_CATEGORIES.has(body.category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  if (!Number.isInteger(body.price_cents) || body.price_cents < 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }

  if (!Number.isInteger(body.stock) || body.stock < 0) {
    res.status(400).json({ error: "Invalid stock" });
    return;
  }

  if (body.is_active !== undefined && typeof body.is_active !== "boolean") {
    res.status(400).json({ error: "Invalid active value" });
    return;
  }

  const isActive = body.is_active ?? true;
  const createdAt = nowIso();
  const result = db.run(
    "INSERT INTO products (name, category, price_cents, stock, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [name, body.category, body.price_cents, body.stock, isActive ? 1 : 0, createdAt],
  );

  res.status(201).json({ product: findProduct(result.lastInsertRowid) });
});

export default app;
