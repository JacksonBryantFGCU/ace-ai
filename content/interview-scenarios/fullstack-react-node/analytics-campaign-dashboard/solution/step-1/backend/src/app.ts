import express from "express";
import { getCampaignDetail, listCampaignAnalytics, listChannels, resetDatabase } from "./db";

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
  const campaigns = await listCampaignAnalytics();
  res.json({ campaigns });
});

app.get("/campaign-options", async (_req, res) => {
  const channels = await listChannels();
  res.json({ channels });
});

app.get("/campaigns/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid campaign id" });
    return;
  }

  const detail = await getCampaignDetail(id);
  if (!detail) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(detail);
});

export default app;
