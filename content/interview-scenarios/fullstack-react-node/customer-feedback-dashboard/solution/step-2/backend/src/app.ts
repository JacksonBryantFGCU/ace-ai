import express from "express";
import { listFeedback, resetDatabase, type FeedbackStatus } from "./db";

const VALID_STATUSES = new Set<FeedbackStatus>(["new", "reviewing", "resolved"]);

function parseStatus(value: unknown): FeedbackStatus | null {
  return typeof value === "string" && VALID_STATUSES.has(value as FeedbackStatus)
    ? (value as FeedbackStatus)
    : null;
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

app.get("/feedback", async (req, res) => {
  const statusParam = req.query.status;
  if (Array.isArray(statusParam)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const status = statusParam === undefined ? undefined : parseStatus(statusParam);
  if (statusParam !== undefined && !status) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const feedback = await listFeedback(status);
  res.json({ feedback });
});

export default app;
