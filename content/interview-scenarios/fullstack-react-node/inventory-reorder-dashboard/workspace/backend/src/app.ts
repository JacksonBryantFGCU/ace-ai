import express from "express";
import { listProducts, resetDatabase, type ProductRow } from "./db";

// TODO (Step 1): attach a computed `needs_reorder` field to every product.
// needs_reorder = stock <= reorder_level. It is never stored in the database.
interface Product extends ProductRow {
  needs_reorder: boolean;
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
  // TODO (Step 1): fetch products with listProducts(), attach needs_reorder to each
  // one (see the Product interface above), and respond with { products: [...] }.
  const products = await listProducts();
  res.json({ products });
});

// TODO (Step 2): support GET /products?category=<category> and
// GET /products?low_stock=true|false, validating each filter and returning
// { error: "..." } with HTTP 400 for an invalid one. Also add
// GET /products/summary returning { summary: { total_products, low_stock, ordered } }.

// TODO (Step 3): support PATCH /products/:id to update stock and/or reorder_status.
// Validate the id, that the product exists, that only stock/reorder_status are sent,
// that stock is a non-negative integer, and that reorder_status is valid. Return the
// updated product (with needs_reorder recomputed).

export default app;
