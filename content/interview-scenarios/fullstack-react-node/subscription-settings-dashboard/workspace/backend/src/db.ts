import initSqlJs from "sql.js";

export type PlanTier = "starter" | "pro" | "business";
export type SubscriptionStatus = "active" | "past_due" | "cancelled";
export type BillingCycle = "monthly" | "annual";

export const PLAN_TIERS: PlanTier[] = ["starter", "pro", "business"];
export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["active", "past_due", "cancelled"];
export const BILLING_CYCLES: BillingCycle[] = ["monthly", "annual"];

/** This scenario has no auth/session layer, so every request acts on this fixed customer. */
export const CURRENT_CUSTOMER_ID = 1;

export interface CustomerRow {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface PlanRow {
  id: number;
  name: string;
  tier: PlanTier;
  price_cents: number;
  seats_included: number;
  is_active: number;
  created_at: string;
}

export interface SubscriptionRow {
  id: number;
  customer_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  seats: number;
  cancel_at_period_end: number;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

/**
 * Deterministic seed data. Customer 1 (Alex Rivera) is the current customer
 * every endpoint operates on and drives the primary walkthrough: an active
 * Pro subscription, monthly billing, no scheduled cancellation. Customers
 * 2-4 exist only to give the tables realistic shape — past_due and cancelled
 * statuses, annual billing, a scheduled cancellation, and a subscription
 * pinned to an inactive plan — none of which any endpoint can reach, since
 * there's no customer switching in this scenario.
 */
const SEED_CUSTOMERS = [
  { id: 1, name: "Alex Rivera", email: "alex@example.com", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Jordan Lee", email: "jordan@example.com", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Sam Carter", email: "sam@example.com", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
  { id: 4, name: "Casey Kim", email: "casey@example.com", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
] satisfies CustomerRow[];

const SEED_PLANS = [
  { id: 1, name: "Starter", tier: "starter", price_cents: 900, seats_included: 1, is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Pro", tier: "pro", price_cents: 4900, seats_included: 5, is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Business", tier: "business", price_cents: 14900, seats_included: 20, is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  // Inactive: hidden from GET /plans, and rejected as a PATCH /subscription target.
  { id: 4, name: "Legacy Starter", tier: "starter", price_cents: 500, seats_included: 1, is_active: 0, created_at: "2025-01-01T09:00:00.000Z" },
] satisfies PlanRow[];

const SEED_SUBSCRIPTIONS = [
  {
    id: 1,
    customer_id: 1,
    plan_id: 2,
    status: "active",
    billing_cycle: "monthly",
    seats: 5,
    cancel_at_period_end: 0,
    current_period_end: "2025-03-01T00:00:00.000Z",
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    customer_id: 2,
    plan_id: 3,
    status: "past_due",
    billing_cycle: "annual",
    seats: 20,
    cancel_at_period_end: 0,
    current_period_end: "2025-02-15T00:00:00.000Z",
    created_at: "2025-01-05T09:00:00.000Z",
    updated_at: "2025-01-05T09:00:00.000Z",
  },
  {
    id: 3,
    customer_id: 3,
    plan_id: 1,
    status: "cancelled",
    billing_cycle: "monthly",
    seats: 1,
    cancel_at_period_end: 1,
    current_period_end: "2025-01-20T00:00:00.000Z",
    created_at: "2025-01-02T09:00:00.000Z",
    updated_at: "2025-01-02T09:00:00.000Z",
  },
  {
    id: 4,
    customer_id: 4,
    plan_id: 4,
    status: "active",
    billing_cycle: "annual",
    seats: 1,
    cancel_at_period_end: 1,
    current_period_end: "2025-04-01T00:00:00.000Z",
    created_at: "2025-01-03T09:00:00.000Z",
    updated_at: "2025-01-03T09:00:00.000Z",
  },
] satisfies SubscriptionRow[];

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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE plans (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        tier TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        seats_included INTEGER NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE subscriptions (
        id INTEGER PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        seats INTEGER NOT NULL,
        cancel_at_period_end INTEGER NOT NULL,
        current_period_end TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (plan_id) REFERENCES plans(id)
      );
    `);

    const insertCustomer = seeded.prepare(
      "INSERT INTO customers (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    );
    const insertPlan = seeded.prepare(`
      INSERT INTO plans (id, name, tier, price_cents, seats_included, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSubscription = seeded.prepare(`
      INSERT INTO subscriptions (id, customer_id, plan_id, status, billing_cycle, seats, cancel_at_period_end, current_period_end, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      seeded.run("BEGIN");
      for (const customer of SEED_CUSTOMERS) {
        insertCustomer.run([customer.id, customer.name, customer.email, customer.created_at, customer.updated_at]);
      }
      for (const plan of SEED_PLANS) {
        insertPlan.run([
          plan.id,
          plan.name,
          plan.tier,
          plan.price_cents,
          plan.seats_included,
          plan.is_active,
          plan.created_at,
        ]);
      }
      for (const subscription of SEED_SUBSCRIPTIONS) {
        insertSubscription.run([
          subscription.id,
          subscription.customer_id,
          subscription.plan_id,
          subscription.status,
          subscription.billing_cycle,
          subscription.seats,
          subscription.cancel_at_period_end,
          subscription.current_period_end,
          subscription.created_at,
          subscription.updated_at,
        ]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insertCustomer.free();
      insertPlan.free();
      insertSubscription.free();
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

export async function getCustomerById(id: number): Promise<CustomerRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM customers WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<CustomerRow>(statement);
  return rows[0] ?? null;
}

export async function listActivePlans(): Promise<PlanRow[]> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM plans WHERE is_active = 1 ORDER BY price_cents ASC, id ASC");
  return rowsFromStatement<PlanRow>(statement);
}

export async function getPlanById(id: number): Promise<PlanRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM plans WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<PlanRow>(statement);
  return rows[0] ?? null;
}

export async function getSubscriptionByCustomerId(customerId: number): Promise<SubscriptionRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM subscriptions WHERE customer_id = ?");
  statement.bind([customerId]);
  const rows = rowsFromStatement<SubscriptionRow>(statement);
  return rows[0] ?? null;
}

export async function updateSubscriptionFields(input: {
  id: number;
  plan_id: number;
  billing_cycle: BillingCycle;
  seats: number;
  updated_at: string;
}): Promise<SubscriptionRow | null> {
  const db = await getDatabase();
  db.run(
    "UPDATE subscriptions SET plan_id = ?, billing_cycle = ?, seats = ?, updated_at = ? WHERE id = ?",
    [input.plan_id, input.billing_cycle, input.seats, input.updated_at, input.id],
  );
  const statement = db.prepare("SELECT * FROM subscriptions WHERE id = ?");
  statement.bind([input.id]);
  const rows = rowsFromStatement<SubscriptionRow>(statement);
  return rows[0] ?? null;
}

export async function setCancelAtPeriodEnd(input: {
  id: number;
  cancel_at_period_end: boolean;
  updated_at: string;
}): Promise<SubscriptionRow | null> {
  const db = await getDatabase();
  db.run("UPDATE subscriptions SET cancel_at_period_end = ?, updated_at = ? WHERE id = ?", [
    input.cancel_at_period_end ? 1 : 0,
    input.updated_at,
    input.id,
  ]);
  const statement = db.prepare("SELECT * FROM subscriptions WHERE id = ?");
  statement.bind([input.id]);
  const rows = rowsFromStatement<SubscriptionRow>(statement);
  return rows[0] ?? null;
}
