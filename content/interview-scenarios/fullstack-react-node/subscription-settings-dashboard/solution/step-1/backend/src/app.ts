import express from "express";
import {
  CURRENT_CUSTOMER_ID,
  getCustomerById,
  getPlanById,
  getSubscriptionByCustomerId,
  listActivePlans,
  resetDatabase,
  type CustomerRow,
  type PlanRow,
  type SubscriptionRow,
} from "./db";

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
  const customer = await getCustomerById(CURRENT_CUSTOMER_ID);
  const subscription = await getSubscriptionByCustomerId(CURRENT_CUSTOMER_ID);
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

export default app;
