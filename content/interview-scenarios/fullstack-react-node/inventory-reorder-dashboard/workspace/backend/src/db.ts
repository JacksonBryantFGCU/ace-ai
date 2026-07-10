import initSqlJs from "sql.js";

export type Category = "apparel" | "electronics" | "home" | "books";
export type ReorderStatus = "none" | "needed" | "ordered";

export const CATEGORIES: Category[] = ["apparel", "electronics", "home", "books"];
export const REORDER_STATUSES: ReorderStatus[] = ["none", "needed", "ordered"];

export interface ProductRow {
  id: number;
  name: string;
  sku: string;
  category: Category;
  stock: number;
  reorder_level: number;
  reorder_status: ReorderStatus;
  updated_at: string;
}

export interface InventorySummary {
  total_products: number;
  low_stock: number;
  ordered: number;
}

/**
 * Deterministic seed data. Covers every category (apparel, electronics, home,
 * books), every reorder status (none, needed, ordered), and stock levels that
 * are below, exactly at, and above the reorder level so filters and the
 * low-stock calculation are all exercised.
 */
const SEED_PRODUCTS = [
  {
    id: 1,
    name: "Wireless Mouse",
    sku: "ELEC-MOUSE-001",
    category: "electronics",
    stock: 8,
    reorder_level: 10,
    reorder_status: "needed",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    name: "Mechanical Keyboard",
    sku: "ELEC-KEYB-002",
    category: "electronics",
    stock: 25,
    reorder_level: 15,
    reorder_status: "none",
    updated_at: "2025-01-10T09:05:00.000Z",
  },
  {
    id: 3,
    name: "Cotton T-Shirt",
    sku: "APP-TSHIRT-003",
    category: "apparel",
    stock: 12,
    reorder_level: 12,
    reorder_status: "ordered",
    updated_at: "2025-01-10T09:10:00.000Z",
  },
  {
    id: 4,
    name: "Denim Jacket",
    sku: "APP-JACKET-004",
    category: "apparel",
    stock: 30,
    reorder_level: 10,
    reorder_status: "none",
    updated_at: "2025-01-10T09:15:00.000Z",
  },
  {
    id: 5,
    name: "Ceramic Mug",
    sku: "HOME-MUG-005",
    category: "home",
    stock: 4,
    reorder_level: 6,
    reorder_status: "needed",
    updated_at: "2025-01-10T09:20:00.000Z",
  },
  {
    id: 6,
    name: "Table Lamp",
    sku: "HOME-LAMP-006",
    category: "home",
    stock: 18,
    reorder_level: 8,
    reorder_status: "none",
    updated_at: "2025-01-10T09:25:00.000Z",
  },
  {
    id: 7,
    name: "Sci-Fi Novel",
    sku: "BOOK-SCIFI-007",
    category: "books",
    stock: 2,
    reorder_level: 5,
    reorder_status: "ordered",
    updated_at: "2025-01-10T09:30:00.000Z",
  },
  {
    id: 8,
    name: "Illustrated Cookbook",
    sku: "BOOK-COOK-008",
    category: "books",
    stock: 20,
    reorder_level: 5,
    reorder_status: "none",
    updated_at: "2025-01-10T09:35:00.000Z",
  },
] satisfies ProductRow[];

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
      CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        stock INTEGER NOT NULL,
        reorder_level INTEGER NOT NULL,
        reorder_status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const insert = seeded.prepare(`
      INSERT INTO products (id, name, sku, category, stock, reorder_level, reorder_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      seeded.run("BEGIN");
      for (const item of SEED_PRODUCTS) {
        insert.run([
          item.id,
          item.name,
          item.sku,
          item.category,
          item.stock,
          item.reorder_level,
          item.reorder_status,
          item.updated_at,
        ]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insert.free();
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

export interface ProductFilters {
  category?: Category;
  lowStock?: boolean;
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductRow[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.lowStock) {
    clauses.push("stock <= reorder_level");
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const statement = db.prepare(`SELECT * FROM products${where} ORDER BY id ASC`);
  if (params.length > 0) statement.bind(params);
  return rowsFromStatement<ProductRow>(statement);
}

export async function getProductById(id: number): Promise<ProductRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM products WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<ProductRow>(statement);
  return rows[0] ?? null;
}

export async function updateProduct(input: {
  id: number;
  stock: number;
  reorder_status: ReorderStatus;
  updated_at: string;
}): Promise<ProductRow | null> {
  const db = await getDatabase();
  db.run(
    "UPDATE products SET stock = ?, reorder_status = ?, updated_at = ? WHERE id = ?",
    [input.stock, input.reorder_status, input.updated_at, input.id],
  );
  return getProductById(input.id);
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const db = await getDatabase();
  const statement = db.prepare(`
    SELECT
      COUNT(*) AS total_products,
      SUM(CASE WHEN stock <= reorder_level THEN 1 ELSE 0 END) AS low_stock,
      SUM(CASE WHEN reorder_status = 'ordered' THEN 1 ELSE 0 END) AS ordered
    FROM products
  `);
  const [row] = rowsFromStatement<{
    total_products: number;
    low_stock: number | null;
    ordered: number | null;
  }>(statement);
  return {
    total_products: row?.total_products ?? 0,
    low_stock: row?.low_stock ?? 0,
    ordered: row?.ordered ?? 0,
  };
}
