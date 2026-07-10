import express from "express";
import { getEventWithCountsById, listEvents, listRsvpsForEvent, resetDatabase, type EventWithCounts } from "./db";

interface EventSummary extends EventWithCounts {
  spots_remaining: number;
  is_full: boolean;
}

/** Attach the computed capacity fields. Neither is stored in the database. */
function toEventSummary(row: EventWithCounts): EventSummary {
  return {
    ...row,
    spots_remaining: Math.max(row.capacity - row.going_count, 0),
    is_full: row.going_count >= row.capacity,
  };
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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

app.get("/events", async (_req, res) => {
  const events = (await listEvents()).map(toEventSummary);
  res.json({ events });
});

app.get("/events/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const event = await getEventWithCountsById(id);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const rsvps = await listRsvpsForEvent(id);
  res.json({ event: { ...toEventSummary(event), rsvps } });
});

export default app;
