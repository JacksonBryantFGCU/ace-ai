import express from "express";
import {
  CATEGORIES,
  getInventorySummary,
  listProducts,
  resetDatabase,
  type Category,
  type ProductRow,
} from "./db";

interface Product extends ProductRow {
  needs_reorder: boolean;
}

/** Attach the computed `needs_reorder` field. It is never stored in the database. */
function toProduct(row: ProductRow): Product {
  return { ...row, needs_reorder: row.stock <= row.reorder_level };
}

const VALID_CATEGORIES = new Set<Category>(CATEGORIES);

function parseCategory(value: unknown): Category | null {
  return typeof value === "string" && VALID_CATEGORIES.has(value as Category)
    ? (value as Category)
    : null;
}

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,PATCH,OPTIONS");
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

app.get("/products", async (req, res) => {
  const categoryParam = req.query.category;
  if (Array.isArray(categoryParam)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }
  const category = categoryParam === undefined ? undefined : parseCategory(categoryParam);
  if (categoryParam !== undefined && !category) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  const lowStockParam = req.query.low_stock;
  if (Array.isArray(lowStockParam)) {
    res.status(400).json({ error: "Invalid low stock filter" });
    return;
  }
  let lowStock: boolean | undefined;
  if (lowStockParam !== undefined) {
    if (lowStockParam !== "true" && lowStockParam !== "false") {
      res.status(400).json({ error: "Invalid low stock filter" });
      return;
    }
    lowStock = lowStockParam === "true";
  }

  const products = (await listProducts({ category, lowStock })).map(toProduct);
  res.json({ products });
});

app.get("/products/summary", async (_req, res) => {
  const summary = await getInventorySummary();
  res.json({ summary });
});

export default app;
