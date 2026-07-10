import initSqlJs from "sql.js";
import { ORDER_STATUSES, SELLER_STATUSES, type OrderStatus, type SellerStatus } from "../../shared/marketplace";

export { ORDER_STATUSES, SELLER_STATUSES };
export type { OrderStatus, SellerStatus };

export interface CustomerRow {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface SellerRow {
  id: number;
  name: string;
  email: string;
  status: SellerStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: number;
  seller_id: number;
  name: string;
  sku: string;
  price_cents: number;
  inventory_count: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: number;
  customer_id: number;
  status: OrderStatus;
  subtotal_cents: number;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
}

export interface OrderCustomer {
  id: number;
  name: string;
  email: string;
}

export interface OrderSummary {
  id: number;
  customer: OrderCustomer;
  status: OrderStatus;
  subtotal_cents: number;
  item_count: number;
  seller_count: number;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
}

export interface OrderItemProduct {
  id: number;
  name: string;
  sku: string;
}

export interface OrderItemSeller {
  id: number;
  name: string;
}

export interface OrderItemDetail {
  id: number;
  product: OrderItemProduct;
  seller: OrderItemSeller;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface OrderDetail {
  order: OrderSummary;
  items: OrderItemDetail[];
}

export interface OrderSummaryMetrics {
  total_orders: number;
  pending: number;
  fulfilled: number;
  cancelled: number;
  gross_revenue_cents: number;
  pending_revenue_cents: number;
}

/**
 * Deterministic seed data. Three customers, three sellers (two active, one
 * suspended), six products (spanning active/inactive and zero/positive
 * inventory), and eight orders spanning pending/fulfilled/cancelled, single
 * and multi-item, and single and multi-seller. Order ids are NOT pre-sorted
 * by created_at, so the default ordering (created_at DESC, id ASC) is
 * meaningfully exercised.
 */
const SEED_CUSTOMERS = [
  { id: 1, name: "Alex Rivera", email: "alex@example.com", created_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Morgan Diaz", email: "morgan@example.com", created_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Priya Singh", email: "priya@example.com", created_at: "2025-01-01T09:00:00.000Z" },
] satisfies CustomerRow[];

const SEED_SELLERS = [
  {
    id: 1,
    name: "Tech Supply Co",
    email: "hello@techsupply.example.com",
    status: "active",
    created_at: "2025-01-01T09:00:00.000Z",
    updated_at: "2025-01-01T09:00:00.000Z",
  },
  {
    id: 2,
    name: "Home Essentials",
    email: "hello@homeessentials.example.com",
    status: "active",
    created_at: "2025-01-01T09:00:00.000Z",
    updated_at: "2025-01-01T09:00:00.000Z",
  },
  {
    id: 3,
    name: "Budget Traders",
    email: "hello@budgettraders.example.com",
    status: "suspended",
    created_at: "2025-01-01T09:00:00.000Z",
    updated_at: "2025-01-01T09:00:00.000Z",
  },
] satisfies SellerRow[];

const SEED_PRODUCTS = [
  {
    id: 1,
    seller_id: 1,
    name: "Wireless Keyboard",
    sku: "TECH-KEY-001",
    price_cents: 4500,
    inventory_count: 18,
    is_active: 1,
    created_at: "2025-01-02T09:00:00.000Z",
    updated_at: "2025-01-02T09:00:00.000Z",
  },
  {
    id: 2,
    seller_id: 1,
    name: "Wireless Mouse",
    sku: "TECH-MOU-002",
    price_cents: 2500,
    inventory_count: 0,
    is_active: 1,
    created_at: "2025-01-02T09:00:00.000Z",
    updated_at: "2025-01-02T09:00:00.000Z",
  },
  {
    id: 3,
    seller_id: 1,
    name: "USB-C Hub",
    sku: "TECH-HUB-003",
    price_cents: 3200,
    inventory_count: 12,
    is_active: 0,
    created_at: "2025-01-02T09:00:00.000Z",
    updated_at: "2025-01-02T09:00:00.000Z",
  },
  {
    id: 4,
    seller_id: 2,
    name: "Ceramic Mug",
    sku: "HOME-MUG-001",
    price_cents: 1200,
    inventory_count: 40,
    is_active: 1,
    created_at: "2025-01-02T09:00:00.000Z",
    updated_at: "2025-01-02T09:00:00.000Z",
  },
  {
    id: 5,
    seller_id: 2,
    name: "Throw Blanket",
    sku: "HOME-BLK-002",
    price_cents: 4800,
    inventory_count: 9,
    is_active: 1,
    created_at: "2025-01-02T09:00:00.000Z",
    updated_at: "2025-01-02T09:00:00.000Z",
  },
  {
    id: 6,
    seller_id: 3,
    name: "Discount Charger",
    sku: "BUD-CHG-001",
    price_cents: 1500,
    inventory_count: 25,
    is_active: 1,
    created_at: "2025-01-02T09:00:00.000Z",
    updated_at: "2025-01-02T09:00:00.000Z",
  },
] satisfies ProductRow[];

const SEED_ORDERS = [
  {
    id: 1,
    customer_id: 1,
    status: "pending",
    subtotal_cents: 10200,
    created_at: "2025-03-01T09:00:00.000Z",
    updated_at: "2025-03-01T09:00:00.000Z",
    fulfilled_at: null,
    cancelled_at: null,
  },
  {
    id: 2,
    customer_id: 2,
    status: "fulfilled",
    subtotal_cents: 4800,
    created_at: "2025-03-05T09:00:00.000Z",
    updated_at: "2025-03-06T09:00:00.000Z",
    fulfilled_at: "2025-03-06T09:00:00.000Z",
    cancelled_at: null,
  },
  {
    id: 3,
    customer_id: 3,
    status: "cancelled",
    subtotal_cents: 4500,
    created_at: "2025-03-03T09:00:00.000Z",
    updated_at: "2025-03-04T09:00:00.000Z",
    fulfilled_at: null,
    cancelled_at: "2025-03-04T09:00:00.000Z",
  },
  {
    id: 4,
    customer_id: 1,
    status: "pending",
    subtotal_cents: 14100,
    created_at: "2025-03-08T09:00:00.000Z",
    updated_at: "2025-03-08T09:00:00.000Z",
    fulfilled_at: null,
    cancelled_at: null,
  },
  {
    id: 5,
    customer_id: 2,
    status: "fulfilled",
    subtotal_cents: 12000,
    created_at: "2025-03-04T09:00:00.000Z",
    updated_at: "2025-03-05T09:00:00.000Z",
    fulfilled_at: "2025-03-05T09:00:00.000Z",
    cancelled_at: null,
  },
  {
    id: 6,
    customer_id: 3,
    status: "pending",
    subtotal_cents: 13500,
    created_at: "2025-03-07T09:00:00.000Z",
    updated_at: "2025-03-07T09:00:00.000Z",
    fulfilled_at: null,
    cancelled_at: null,
  },
  {
    id: 7,
    customer_id: 1,
    status: "cancelled",
    subtotal_cents: 6900,
    created_at: "2025-03-02T09:00:00.000Z",
    updated_at: "2025-03-03T09:00:00.000Z",
    fulfilled_at: null,
    cancelled_at: "2025-03-03T09:00:00.000Z",
  },
  {
    id: 8,
    customer_id: 2,
    status: "pending",
    subtotal_cents: 4800,
    created_at: "2025-03-06T09:00:00.000Z",
    updated_at: "2025-03-06T09:00:00.000Z",
    fulfilled_at: null,
    cancelled_at: null,
  },
] satisfies OrderRow[];

const SEED_ORDER_ITEMS = [
  { id: 1, order_id: 1, product_id: 1, seller_id: 1, quantity: 2, unit_price_cents: 4500, line_total_cents: 9000 },
  { id: 2, order_id: 1, product_id: 4, seller_id: 2, quantity: 1, unit_price_cents: 1200, line_total_cents: 1200 },
  { id: 3, order_id: 2, product_id: 5, seller_id: 2, quantity: 1, unit_price_cents: 4800, line_total_cents: 4800 },
  { id: 4, order_id: 3, product_id: 1, seller_id: 1, quantity: 1, unit_price_cents: 4500, line_total_cents: 4500 },
  { id: 5, order_id: 4, product_id: 1, seller_id: 1, quantity: 1, unit_price_cents: 4500, line_total_cents: 4500 },
  { id: 6, order_id: 4, product_id: 5, seller_id: 2, quantity: 2, unit_price_cents: 4800, line_total_cents: 9600 },
  { id: 7, order_id: 5, product_id: 4, seller_id: 2, quantity: 10, unit_price_cents: 1200, line_total_cents: 12000 },
  { id: 8, order_id: 6, product_id: 1, seller_id: 1, quantity: 3, unit_price_cents: 4500, line_total_cents: 13500 },
  { id: 9, order_id: 7, product_id: 4, seller_id: 2, quantity: 2, unit_price_cents: 1200, line_total_cents: 2400 },
  { id: 10, order_id: 7, product_id: 1, seller_id: 1, quantity: 1, unit_price_cents: 4500, line_total_cents: 4500 },
  { id: 11, order_id: 8, product_id: 5, seller_id: 2, quantity: 1, unit_price_cents: 4800, line_total_cents: 4800 },
];

let sqlModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let database: initSqlJs.Database | null = null;
let seededDatabaseBytes: Uint8Array | null = null;

async function getSqlModule() {
  sqlModule ??= await initSqlJs();
  return sqlModule;
}

function rowsFromStatement<T>(statement: initSqlJs.Statement): T[] {
  const rows: T[] = [];
  try {
    while (statement.step()) rows.push(statement.getAsObject() as T);
    return rows;
  } finally {
    statement.free();
  }
}

export async function resetDatabase() {
  const SQL = await getSqlModule();
  if (!seededDatabaseBytes) {
    const seeded = new SQL.Database();
    seeded.run(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE sellers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        seller_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        price_cents INTEGER NOT NULL,
        inventory_count INTEGER NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
      );

      CREATE TABLE orders (
        id INTEGER PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        subtotal_cents INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        fulfilled_at TEXT,
        cancelled_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );

      CREATE TABLE order_items (
        id INTEGER PRIMARY KEY,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        seller_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price_cents INTEGER NOT NULL,
        line_total_cents INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
      );
    `);

    const insertCustomer = seeded.prepare(
      "INSERT INTO customers (id, name, email, created_at) VALUES (?, ?, ?, ?)",
    );
    const insertSeller = seeded.prepare(
      "INSERT INTO sellers (id, name, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertProduct = seeded.prepare(`
      INSERT INTO products (id, seller_id, name, sku, price_cents, inventory_count, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertOrder = seeded.prepare(`
      INSERT INTO orders (id, customer_id, status, subtotal_cents, created_at, updated_at, fulfilled_at, cancelled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertOrderItem = seeded.prepare(`
      INSERT INTO order_items (id, order_id, product_id, seller_id, quantity, unit_price_cents, line_total_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      seeded.run("BEGIN");
      for (const customer of SEED_CUSTOMERS) {
        insertCustomer.run([customer.id, customer.name, customer.email, customer.created_at]);
      }
      for (const seller of SEED_SELLERS) {
        insertSeller.run([seller.id, seller.name, seller.email, seller.status, seller.created_at, seller.updated_at]);
      }
      for (const product of SEED_PRODUCTS) {
        insertProduct.run([
          product.id,
          product.seller_id,
          product.name,
          product.sku,
          product.price_cents,
          product.inventory_count,
          product.is_active,
          product.created_at,
          product.updated_at,
        ]);
      }
      for (const order of SEED_ORDERS) {
        insertOrder.run([
          order.id,
          order.customer_id,
          order.status,
          order.subtotal_cents,
          order.created_at,
          order.updated_at,
          order.fulfilled_at,
          order.cancelled_at,
        ]);
      }
      for (const item of SEED_ORDER_ITEMS) {
        insertOrderItem.run([
          item.id,
          item.order_id,
          item.product_id,
          item.seller_id,
          item.quantity,
          item.unit_price_cents,
          item.line_total_cents,
        ]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insertCustomer.free();
      insertSeller.free();
      insertProduct.free();
      insertOrder.free();
      insertOrderItem.free();
      seeded.close();
    }
  }

  database?.close();
  database = new SQL.Database(seededDatabaseBytes.slice());
}

export async function getDatabase() {
  if (!database) await resetDatabase();
  return database!;
}

export async function listCustomers(): Promise<CustomerRow[]> {
  const db = await getDatabase();
  return rowsFromStatement<CustomerRow>(db.prepare("SELECT * FROM customers ORDER BY id ASC"));
}

export async function listSellers(): Promise<SellerRow[]> {
  const db = await getDatabase();
  return rowsFromStatement<SellerRow>(db.prepare("SELECT * FROM sellers ORDER BY id ASC"));
}

export async function listActiveProductsFromActiveSellers(): Promise<ProductRow[]> {
  const db = await getDatabase();
  const statement = db.prepare(`
    SELECT p.* FROM products p
    JOIN sellers s ON p.seller_id = s.id
    WHERE p.is_active = 1 AND s.status = 'active'
    ORDER BY p.id ASC
  `);
  return rowsFromStatement<ProductRow>(statement);
}

export async function getCustomerById(id: number): Promise<CustomerRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM customers WHERE id = ?");
  statement.bind([id]);
  return rowsFromStatement<CustomerRow>(statement)[0] ?? null;
}

export async function getSellerById(id: number): Promise<SellerRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM sellers WHERE id = ?");
  statement.bind([id]);
  return rowsFromStatement<SellerRow>(statement)[0] ?? null;
}

export async function getProductById(id: number): Promise<ProductRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM products WHERE id = ?");
  statement.bind([id]);
  return rowsFromStatement<ProductRow>(statement)[0] ?? null;
}

export async function getOrderRowById(id: number): Promise<OrderRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM orders WHERE id = ?");
  statement.bind([id]);
  return rowsFromStatement<OrderRow>(statement)[0] ?? null;
}

interface OrderSummaryRow {
  id: number;
  status: OrderStatus;
  subtotal_cents: number;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  item_count: number;
  seller_count: number;
}

function toOrderSummary(row: OrderSummaryRow): OrderSummary {
  return {
    id: row.id,
    customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email },
    status: row.status,
    subtotal_cents: row.subtotal_cents,
    item_count: row.item_count,
    seller_count: row.seller_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    fulfilled_at: row.fulfilled_at,
    cancelled_at: row.cancelled_at,
  };
}

const ORDER_SUMMARY_SELECT = `
  SELECT
    o.id AS id, o.status AS status, o.subtotal_cents AS subtotal_cents,
    o.created_at AS created_at, o.updated_at AS updated_at,
    o.fulfilled_at AS fulfilled_at, o.cancelled_at AS cancelled_at,
    c.id AS customer_id, c.name AS customer_name, c.email AS customer_email,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
    (SELECT COUNT(DISTINCT oi.seller_id) FROM order_items oi WHERE oi.order_id = o.id) AS seller_count
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
`;

export interface OrderFilters {
  status?: OrderStatus;
  customerId?: number;
  sellerId?: number;
}

export async function listOrders(filters: OrderFilters = {}): Promise<OrderSummary[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.status !== undefined) {
    clauses.push("o.status = ?");
    params.push(filters.status);
  }
  if (filters.customerId !== undefined) {
    clauses.push("o.customer_id = ?");
    params.push(filters.customerId);
  }
  if (filters.sellerId !== undefined) {
    clauses.push("EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = ?)");
    params.push(filters.sellerId);
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const statement = db.prepare(`${ORDER_SUMMARY_SELECT}${where} ORDER BY o.created_at DESC, o.id ASC`);
  if (params.length > 0) statement.bind(params);
  return rowsFromStatement<OrderSummaryRow>(statement).map(toOrderSummary);
}

interface OrderItemDetailRow {
  id: number;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  seller_id: number;
  seller_name: string;
}

function toOrderItemDetail(row: OrderItemDetailRow): OrderItemDetail {
  return {
    id: row.id,
    product: { id: row.product_id, name: row.product_name, sku: row.product_sku },
    seller: { id: row.seller_id, name: row.seller_name },
    quantity: row.quantity,
    unit_price_cents: row.unit_price_cents,
    line_total_cents: row.line_total_cents,
  };
}

const ORDER_ITEM_DETAIL_SELECT = `
  SELECT
    oi.id AS id, oi.quantity AS quantity, oi.unit_price_cents AS unit_price_cents, oi.line_total_cents AS line_total_cents,
    p.id AS product_id, p.name AS product_name, p.sku AS product_sku,
    s.id AS seller_id, s.name AS seller_name
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  JOIN sellers s ON oi.seller_id = s.id
  WHERE oi.order_id = ?
  ORDER BY oi.id ASC
`;

export async function getOrderDetail(id: number): Promise<OrderDetail | null> {
  const db = await getDatabase();

  const summaryStatement = db.prepare(`${ORDER_SUMMARY_SELECT} WHERE o.id = ?`);
  summaryStatement.bind([id]);
  const summaryRow = rowsFromStatement<OrderSummaryRow>(summaryStatement)[0];
  if (!summaryRow) return null;

  const itemsStatement = db.prepare(ORDER_ITEM_DETAIL_SELECT);
  itemsStatement.bind([id]);
  const items = rowsFromStatement<OrderItemDetailRow>(itemsStatement).map(toOrderItemDetail);

  return { order: toOrderSummary(summaryRow), items };
}

export interface OrderOptions {
  customers: CustomerRow[];
  sellers: SellerRow[];
  products: ProductRow[];
}

export async function getOrderOptions(): Promise<OrderOptions> {
  const [customers, sellers, products] = await Promise.all([
    listCustomers(),
    listSellers(),
    listActiveProductsFromActiveSellers(),
  ]);
  return { customers, sellers, products };
}

export async function getOrderSummaryMetrics(): Promise<OrderSummaryMetrics> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT status, subtotal_cents FROM orders");
  const rows = rowsFromStatement<{ status: OrderStatus; subtotal_cents: number }>(statement);

  const metrics: OrderSummaryMetrics = {
    total_orders: rows.length,
    pending: 0,
    fulfilled: 0,
    cancelled: 0,
    gross_revenue_cents: 0,
    pending_revenue_cents: 0,
  };

  for (const row of rows) {
    if (row.status === "pending") {
      metrics.pending += 1;
      metrics.pending_revenue_cents += row.subtotal_cents;
    } else if (row.status === "fulfilled") {
      metrics.fulfilled += 1;
      metrics.gross_revenue_cents += row.subtotal_cents;
    } else if (row.status === "cancelled") {
      metrics.cancelled += 1;
    }
  }

  return metrics;
}

export interface CreateOrderItemInput {
  product_id: number;
  seller_id: number;
  quantity: number;
  unit_price_cents: number;
}

export interface CreateOrderInput {
  customer_id: number;
  items: CreateOrderItemInput[];
  created_at: string;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderDetail> {
  const db = await getDatabase();
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);

  db.run("BEGIN");
  try {
    db.run(
      `INSERT INTO orders (customer_id, status, subtotal_cents, created_at, updated_at, fulfilled_at, cancelled_at)
       VALUES (?, 'pending', ?, ?, ?, NULL, NULL)`,
      [input.customer_id, subtotal, input.created_at, input.created_at],
    );

    const idStatement = db.prepare("SELECT last_insert_rowid() AS id");
    idStatement.step();
    const orderId = (idStatement.getAsObject() as { id: number }).id;
    idStatement.free();

    for (const item of input.items) {
      const lineTotal = item.quantity * item.unit_price_cents;
      db.run(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price_cents, line_total_cents)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.seller_id, item.quantity, item.unit_price_cents, lineTotal],
      );
      db.run(`UPDATE products SET inventory_count = inventory_count - ?, updated_at = ? WHERE id = ?`, [
        item.quantity,
        input.created_at,
        item.product_id,
      ]);
    }

    db.run("COMMIT");
    return (await getOrderDetail(orderId))!;
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

export async function fulfillOrder(id: number, updatedAt: string): Promise<OrderDetail | null> {
  const db = await getDatabase();
  db.run("BEGIN");
  try {
    db.run("UPDATE orders SET status = 'fulfilled', fulfilled_at = ?, updated_at = ? WHERE id = ?", [
      updatedAt,
      updatedAt,
      id,
    ]);
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
  return getOrderDetail(id);
}

export async function cancelOrder(id: number, updatedAt: string): Promise<OrderDetail | null> {
  const db = await getDatabase();
  db.run("BEGIN");
  try {
    const itemsStatement = db.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
    itemsStatement.bind([id]);
    const items = rowsFromStatement<{ product_id: number; quantity: number }>(itemsStatement);

    for (const item of items) {
      db.run("UPDATE products SET inventory_count = inventory_count + ?, updated_at = ? WHERE id = ?", [
        item.quantity,
        updatedAt,
        item.product_id,
      ]);
    }

    db.run("UPDATE orders SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?", [
      updatedAt,
      updatedAt,
      id,
    ]);
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
  return getOrderDetail(id);
}
