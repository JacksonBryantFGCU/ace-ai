import express from "express";
import { getFeedbackById, listFeedback, resetDatabase, updateFeedback, type FeedbackStatus } from "./db";

const VALID_STATUSES = new Set<FeedbackStatus>(["new", "reviewing", "resolved"]);

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function parseId(value: string): number | null {
  const id = Number(value);
  return isPositiveInteger(id) ? id : null;
}

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

app.patch("/feedback/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid feedback id" });
    return;
  }

  const existing = await getFeedbackById(id);
  if (!existing) {
    res.status(404).json({ error: "Feedback not found" });
    return;
  }

  const status = parseStatus(req.body?.status);
  if (!status) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  if (req.body.response !== undefined && typeof req.body.response !== "string") {
    res.status(400).json({ error: "Invalid response" });
    return;
  }

  const response = req.body.response === undefined ? existing.response : req.body.response.trim();
  if (typeof response === "string" && response.length > 500) {
    res.status(400).json({ error: "Response is too long" });
    return;
  }

  const normalizedResponse = response === "" ? null : response;
  if (status === "resolved" && !normalizedResponse) {
    res.status(400).json({ error: "Response is required for resolved feedback" });
    return;
  }

  const feedback = await updateFeedback({
    id,
    status,
    response: normalizedResponse,
    updated_at: new Date().toISOString(),
  });

  res.json({ feedback });
});

export default app;
