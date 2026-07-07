import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

type ProductRow = {
  id: number;
  name: string;
  category: string;
  price_cents: number;
  stock: number;
  is_active: number;
  created_at: string;
};

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

app.get("/products", (_req, res) => {
  const rows = db.all<ProductRow>(
    "SELECT id, name, category, price_cents, stock, is_active, created_at FROM products ORDER BY id",
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

export default app;
