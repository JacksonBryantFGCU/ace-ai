import express from "express";
import { resetDatabase } from "./db";

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

app.get("/campaigns", async (_req, res) => {
  // TODO (Step 1): return { campaigns } using listCampaignAnalytics(). Support
  // the optional status, channel_id, start_date, and end_date filters in
  // Step 2 — for now this can ignore query parameters and return every
  // campaign with its full-history metrics.
  res.json({ campaigns: [] });
});

app.get("/campaign-options", async (_req, res) => {
  // TODO (Step 1): return { channels } using listChannels().
  res.json({ channels: [] });
});

app.get("/campaigns/:id", async (_req, res) => {
  // TODO (Step 1): validate the id, look up the campaign with its daily
  // metrics, and return { campaign, daily_metrics }. Respond 400
  // "Invalid campaign id" for a non-numeric id and 404 "Campaign not found"
  // when it doesn't exist.
  res.status(404).json({ error: "Campaign not found" });
});

// TODO (Step 2): add GET /campaigns/summary (aggregate dashboard KPIs across
// the same status/channel_id/start_date/end_date filters as GET /campaigns).

// TODO (Step 3): add PATCH /campaigns/:id to update budget_cents and/or
// status — reject unknown fields, validate the budget and status, enforce
// the status transition graph, and reject any update on a completed
// campaign.

export default app;
