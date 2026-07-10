import express from "express";
import {
  BILLING_CYCLES,
  CURRENT_CUSTOMER_ID,
  getCustomerById,
  getPlanById,
  getSubscriptionByCustomerId,
  listActivePlans,
  resetDatabase,
  setCancelAtPeriodEnd,
  updateSubscriptionFields,
  type BillingCycle,
  type CustomerRow,
  type PlanRow,
  type SubscriptionRow,
} from "./db";

const VALID_BILLING_CYCLES = new Set<BillingCycle>(BILLING_CYCLES);
const ALLOWED_UPDATE_FIELDS = new Set(["plan_id", "billing_cycle", "seats"]);
const MIN_SEATS = 1;
const MAX_SEATS = 100;

function toCustomerJson(customer: CustomerRow) {
  return { id: customer.id, name: customer.name, email: customer.email };
}

function toPlanJson(plan: PlanRow) {
  return {
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    price_cents: plan.price_cents,
    seats_included: plan.seats_included,
  };
}

function toSubscriptionJson(subscription: SubscriptionRow) {
  return {
    id: subscription.id,
    status: subscription.status,
    billing_cycle: subscription.billing_cycle,
    seats: subscription.seats,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_end: subscription.current_period_end,
    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
  };
}

function parseId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function loadCurrentCustomerAndSubscription() {
  const customer = await getCustomerById(CURRENT_CUSTOMER_ID);
  const subscription = await getSubscriptionByCustomerId(CURRENT_CUSTOMER_ID);
  return { customer, subscription };
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

app.get("/subscription", async (_req, res) => {
  const { customer, subscription } = await loadCurrentCustomerAndSubscription();
  if (!customer || !subscription) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  const plan = await getPlanById(subscription.plan_id);
  res.json({
    customer: toCustomerJson(customer),
    subscription: toSubscriptionJson(subscription),
    plan: plan ? toPlanJson(plan) : null,
  });
});

app.get("/plans", async (_req, res) => {
  const plans = await listActivePlans();
  res.json({ plans: plans.map(toPlanJson) });
});

app.patch("/subscription", async (req, res) => {
  const { customer, subscription } = await loadCurrentCustomerAndSubscription();
  if (!customer || !subscription) {
    res.status(404).json({ error: "Subscription not found" });
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

  if (subscription.status === "cancelled") {
    res.status(400).json({ error: "Subscription cannot be changed" });
    return;
  }
  if (subscription.status === "past_due" && body.plan_id !== undefined) {
    res.status(400).json({ error: "Subscription cannot be changed" });
    return;
  }

  let plan: PlanRow | null = null;
  if (body.plan_id !== undefined) {
    const planId = parseId(body.plan_id);
    if (!planId) {
      res.status(400).json({ error: "Invalid plan id" });
      return;
    }
    plan = await getPlanById(planId);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    if (!plan.is_active) {
      res.status(400).json({ error: "Plan is inactive" });
      return;
    }
  } else {
    plan = await getPlanById(subscription.plan_id);
  }

  let billingCycle = subscription.billing_cycle;
  if (body.billing_cycle !== undefined) {
    if (typeof body.billing_cycle !== "string" || !VALID_BILLING_CYCLES.has(body.billing_cycle as BillingCycle)) {
      res.status(400).json({ error: "Invalid billing cycle" });
      return;
    }
    billingCycle = body.billing_cycle as BillingCycle;
  }

  let seats = subscription.seats;
  if (body.seats !== undefined) {
    if (typeof body.seats !== "number" || !Number.isInteger(body.seats) || body.seats < MIN_SEATS || body.seats > MAX_SEATS) {
      res.status(400).json({ error: "Invalid seats" });
      return;
    }
    seats = body.seats;
  }

  if (plan && seats < plan.seats_included) {
    res.status(400).json({ error: "Seat count is below plan minimum" });
    return;
  }

  const updated = await updateSubscriptionFields({
    id: subscription.id,
    plan_id: plan ? plan.id : subscription.plan_id,
    billing_cycle: billingCycle,
    seats,
    updated_at: new Date().toISOString(),
  });

  res.json({
    customer: toCustomerJson(customer),
    subscription: toSubscriptionJson(updated!),
    plan: plan ? toPlanJson(plan) : null,
  });
});

app.post("/subscription/cancel", async (_req, res) => {
  const { customer, subscription } = await loadCurrentCustomerAndSubscription();
  if (!customer || !subscription) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  if (subscription.status === "cancelled") {
    res.status(400).json({ error: "Subscription is already cancelled" });
    return;
  }
  if (subscription.cancel_at_period_end) {
    res.status(400).json({ error: "Cancellation is already scheduled" });
    return;
  }

  const updated = await setCancelAtPeriodEnd({
    id: subscription.id,
    cancel_at_period_end: true,
    updated_at: new Date().toISOString(),
  });
  const plan = await getPlanById(updated!.plan_id);
  res.json({
    customer: toCustomerJson(customer),
    subscription: toSubscriptionJson(updated!),
    plan: plan ? toPlanJson(plan) : null,
  });
});

app.post("/subscription/reactivate", async (_req, res) => {
  const { customer, subscription } = await loadCurrentCustomerAndSubscription();
  if (!customer || !subscription) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  if (subscription.status === "cancelled") {
    res.status(400).json({ error: "Subscription is already cancelled" });
    return;
  }
  if (!subscription.cancel_at_period_end) {
    res.status(400).json({ error: "Subscription is not scheduled for cancellation" });
    return;
  }

  const updated = await setCancelAtPeriodEnd({
    id: subscription.id,
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  });
  const plan = await getPlanById(updated!.plan_id);
  res.json({
    customer: toCustomerJson(customer),
    subscription: toSubscriptionJson(updated!),
    plan: plan ? toPlanJson(plan) : null,
  });
});

export default app;
