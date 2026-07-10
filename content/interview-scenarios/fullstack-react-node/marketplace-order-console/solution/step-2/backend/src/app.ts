import express from "express";
import {
  ORDER_STATUSES,
  createOrder,
  getCustomerById,
  getOrderDetail,
  getOrderOptions,
  getOrderSummaryMetrics,
  getProductById,
  getSellerById,
  listOrders,
  resetDatabase,
  type OrderStatus,
} from "./db";

const VALID_STATUSES = new Set<OrderStatus>(ORDER_STATUSES);

function parseId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseStatus(value: unknown): OrderStatus | null {
  return typeof value === "string" && VALID_STATUSES.has(value as OrderStatus) ? (value as OrderStatus) : null;
}

async function resolveOrderFilters(query: Record<string, unknown>): Promise<
  | { ok: true; status?: OrderStatus; customerId?: number; sellerId?: number }
  | { ok: false; status: number; error: string }
> {
  let status: OrderStatus | undefined;
  if (query.status !== undefined) {
    if (Array.isArray(query.status)) return { ok: false, status: 400, error: "Invalid order status" };
    const parsed = parseStatus(query.status);
    if (!parsed) return { ok: false, status: 400, error: "Invalid order status" };
    status = parsed;
  }

  let customerId: number | undefined;
  if (query.customer_id !== undefined) {
    if (Array.isArray(query.customer_id)) return { ok: false, status: 400, error: "Invalid customer id" };
    const id = parseId(query.customer_id);
    if (!id) return { ok: false, status: 400, error: "Invalid customer id" };
    const customer = await getCustomerById(id);
    if (!customer) return { ok: false, status: 404, error: "Customer not found" };
    customerId = id;
  }

  let sellerId: number | undefined;
  if (query.seller_id !== undefined) {
    if (Array.isArray(query.seller_id)) return { ok: false, status: 400, error: "Invalid seller id" };
    const id = parseId(query.seller_id);
    if (!id) return { ok: false, status: 400, error: "Invalid seller id" };
    const seller = await getSellerById(id);
    if (!seller) return { ok: false, status: 404, error: "Seller not found" };
    sellerId = id;
  }

  return { ok: true, status, customerId, sellerId };
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

app.get("/orders", async (req, res) => {
  const filters = await resolveOrderFilters(req.query as Record<string, unknown>);
  if (!filters.ok) {
    res.status(filters.status).json({ error: filters.error });
    return;
  }

  const orders = await listOrders({
    status: filters.status,
    customerId: filters.customerId,
    sellerId: filters.sellerId,
  });
  res.json({ orders });
});

app.get("/orders/summary", async (_req, res) => {
  const summary = await getOrderSummaryMetrics();
  res.json({ summary });
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

app.post("/orders", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const customerId = parseId(body.customer_id);
  if (!customerId) {
    res.status(400).json({ error: "Invalid customer id" });
    return;
  }
  const customer = await getCustomerById(customerId);
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ error: "Items are required" });
    return;
  }

  const seenProductIds = new Set<number>();
  const resolvedItems: Array<{ product_id: number; seller_id: number; quantity: number; unit_price_cents: number }> =
    [];

  for (const rawItem of body.items) {
    const item = (rawItem ?? {}) as Record<string, unknown>;

    const productId = parseId(item.product_id);
    if (!productId) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }

    if (seenProductIds.has(productId)) {
      res.status(400).json({ error: "Duplicate product in order" });
      return;
    }
    seenProductIds.add(productId);

    const product = await getProductById(productId);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (product.is_active !== 1) {
      res.status(400).json({ error: "Product is inactive" });
      return;
    }

    const seller = await getSellerById(product.seller_id);
    if (!seller || seller.status === "suspended") {
      res.status(400).json({ error: "Seller is suspended" });
      return;
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({ error: "Invalid quantity" });
      return;
    }

    if (quantity > product.inventory_count) {
      res.status(400).json({ error: "Insufficient inventory" });
      return;
    }

    resolvedItems.push({
      product_id: productId,
      seller_id: product.seller_id,
      quantity,
      unit_price_cents: product.price_cents,
    });
  }

  const detail = await createOrder({
    customer_id: customerId,
    items: resolvedItems,
    created_at: new Date().toISOString(),
  });

  res.status(201).json(detail);
});

export default app;
