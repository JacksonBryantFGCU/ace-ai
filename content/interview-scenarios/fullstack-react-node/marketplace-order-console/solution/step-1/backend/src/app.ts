import express from "express";
import { getOrderDetail, getOrderOptions, listOrders, resetDatabase } from "./db";

function parseId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
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

app.get("/orders", async (_req, res) => {
  const orders = await listOrders();
  res.json({ orders });
});

app.get("/order-options", async (_req, res) => {
  const options = await getOrderOptions();
  res.json(options);
});

app.get("/orders/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const detail = await getOrderDetail(id);
  if (!detail) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(detail);
});

export default app;
