import express from "express";
import { resetDatabase } from "./db";

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
  // TODO (Step 1): load the current customer (CURRENT_CUSTOMER_ID from ./db),
  // their subscription (getSubscriptionByCustomerId), and that subscription's
  // plan (getPlanById). Respond with { customer, subscription, plan } using
  // the documented response shape (subscription.cancel_at_period_end is a
  // boolean in the response, even though it's stored as 0/1). If no
  // subscription exists, respond 404 { error: "Subscription not found" }.
  res.status(404).json({ error: "Subscription not found" });
});

app.get("/plans", async (_req, res) => {
  // TODO (Step 1): return only active plans, via listActivePlans(), ordered
  // by price_cents ascending then id ascending, as { plans: [...] }.
  res.json({ plans: [] });
});

// TODO (Step 2): support PATCH /subscription to update plan_id, billing_cycle,
// and/or seats on the current customer's subscription. Reject unknown fields
// and empty bodies, validate each provided field, enforce that cancelled
// subscriptions can't be changed at all and past_due subscriptions can't
// change plan, and enforce that seats can never fall below the resulting
// plan's seats_included.

// TODO (Step 3): support POST /subscription/cancel and
// POST /subscription/reactivate to schedule/clear cancellation on the current
// customer's subscription, each rejecting the cases documented in
// scenario.md.

export default app;
