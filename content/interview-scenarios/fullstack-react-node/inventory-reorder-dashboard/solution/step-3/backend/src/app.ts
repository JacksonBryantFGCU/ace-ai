import express from "express";
import {
  CATEGORIES,
  REORDER_STATUSES,
  getInventorySummary,
  getProductById,
  listProducts,
  resetDatabase,
  updateProduct,
  type Category,
  type ProductRow,
  type ReorderStatus,
} from "./db";

interface Product extends ProductRow {
  needs_reorder: boolean;
}

/** Attach the computed `needs_reorder` field. It is never stored in the database. */
function toProduct(row: ProductRow): Product {
  return { ...row, needs_reorder: row.stock <= row.reorder_level };
}

const VALID_CATEGORIES = new Set<Category>(CATEGORIES);
const VALID_REORDER_STATUSES = new Set<ReorderStatus>(REORDER_STATUSES);
const ALLOWED_UPDATE_FIELDS = new Set(["stock", "reorder_status"]);

function parseCategory(value: unknown): Category | null {
  return typeof value === "string" && VALID_CATEGORIES.has(value as Category)
    ? (value as Category)
    : null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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

app.patch("/products/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const existing = await getProductById(id);
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length === 0) {
    res.status(400).json({ error: "No update fields provided" });
    return;
  }
  if (keys.some((key) => !ALLOWED_UPDATE_FIELDS.has(key))) {
    res.status(400).json({ error: "Unknown update field" });
    return;
  }

  let stock = existing.stock;
  if (body.stock !== undefined) {
    if (!isNonNegativeInteger(body.stock)) {
      res.status(400).json({ error: "Invalid stock" });
      return;
    }
    stock = body.stock;
  }

  let reorderStatus = existing.reorder_status;
  if (body.reorder_status !== undefined) {
    if (
      typeof body.reorder_status !== "string" ||
      !VALID_REORDER_STATUSES.has(body.reorder_status as ReorderStatus)
    ) {
      res.status(400).json({ error: "Invalid reorder status" });
      return;
    }
    reorderStatus = body.reorder_status as ReorderStatus;
  }

  const product = await updateProduct({
    id,
    stock,
    reorder_status: reorderStatus,
    updated_at: new Date().toISOString(),
  });

  res.json({ product: toProduct(product!) });
});

export default app;
