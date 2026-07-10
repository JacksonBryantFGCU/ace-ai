import express from "express";
import { listProducts, resetDatabase, type ProductRow } from "./db";

interface Product extends ProductRow {
  needs_reorder: boolean;
}

/** Attach the computed `needs_reorder` field. It is never stored in the database. */
function toProduct(row: ProductRow): Product {
  return { ...row, needs_reorder: row.stock <= row.reorder_level };
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

app.get("/products", async (_req, res) => {
  const products = (await listProducts()).map(toProduct);
  res.json({ products });
});

export default app;
