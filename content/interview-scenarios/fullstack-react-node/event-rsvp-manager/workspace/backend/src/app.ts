import express from "express";
import { getEventWithCountsById, listEvents, listRsvpsForEvent, resetDatabase, type EventWithCounts } from "./db";

// TODO (Step 1): attach computed capacity fields to every event.
// spots_remaining = max(capacity - going_count, 0); is_full = going_count >= capacity.
// Neither is stored in the database.
interface EventSummary extends EventWithCounts {
  spots_remaining: number;
  is_full: boolean;
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
  // TODO (Step 1): fetch events with listEvents(), attach spots_remaining and
  // is_full to each one (see the EventSummary interface above), and respond
  // with { events: [...] }.
  const events = await listEvents();
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

  // TODO (Step 1): attach spots_remaining/is_full to `event`, fetch its RSVPs
  // with listRsvpsForEvent(id), and respond with { event: { ...event, rsvps } }.
  res.json({ event });
});

// TODO (Step 2): support GET /events?status=<status> and
// GET /events?availability=open|full, validating each filter. Also add
// POST /events/:id/rsvps to create an RSVP — validate the event exists and is
// scheduled, the attendee name and email, and reject a duplicate active RSVP for
// the same event/email; default the new RSVP to going or waitlisted based on
// capacity.

// TODO (Step 3): support PATCH /rsvps/:id to update an RSVP's status. Validate the
// id, that the RSVP exists, that only status is sent, that the status is valid,
// and reject moving to "going" when the event has no spots remaining.

export default app;
