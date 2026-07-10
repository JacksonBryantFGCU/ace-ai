import express from "express";
import {
  EVENT_STATUSES,
  RSVP_STATUSES,
  countActiveRsvpForEmail,
  createRsvp,
  getEventWithCountsById,
  getRsvpById,
  listEvents,
  listRsvpsForEvent,
  resetDatabase,
  updateRsvpStatus,
  type EventStatus,
  type EventWithCounts,
  type RsvpStatus,
} from "./db";

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

const VALID_EVENT_STATUSES = new Set<EventStatus>(EVENT_STATUSES);
const VALID_RSVP_STATUSES = new Set<RsvpStatus>(RSVP_STATUSES);
const ALLOWED_RSVP_UPDATE_FIELDS = new Set(["status"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseEventStatus(value: unknown): EventStatus | null {
  return typeof value === "string" && VALID_EVENT_STATUSES.has(value as EventStatus)
    ? (value as EventStatus)
    : null;
}

function parseRsvpStatus(value: unknown): RsvpStatus | null {
  return typeof value === "string" && VALID_RSVP_STATUSES.has(value as RsvpStatus)
    ? (value as RsvpStatus)
    : null;
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

app.get("/events", async (req, res) => {
  const statusParam = req.query.status;
  if (Array.isArray(statusParam)) {
    res.status(400).json({ error: "Invalid event status" });
    return;
  }
  const status = statusParam === undefined ? undefined : parseEventStatus(statusParam);
  if (statusParam !== undefined && !status) {
    res.status(400).json({ error: "Invalid event status" });
    return;
  }

  const availabilityParam = req.query.availability;
  if (Array.isArray(availabilityParam)) {
    res.status(400).json({ error: "Invalid availability filter" });
    return;
  }
  let availability: "open" | "full" | undefined;
  if (availabilityParam !== undefined) {
    if (availabilityParam !== "open" && availabilityParam !== "full") {
      res.status(400).json({ error: "Invalid availability filter" });
      return;
    }
    availability = availabilityParam;
  }

  const events = (await listEvents({ status, availability })).map(toEventSummary);
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

app.post("/events/:id/rsvps", async (req, res) => {
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

  if (event.status !== "scheduled") {
    res.status(400).json({ error: "Event is not accepting RSVPs" });
    return;
  }

  const rawName = req.body?.attendee_name;
  const attendeeName = typeof rawName === "string" ? rawName.trim() : "";
  if (!attendeeName) {
    res.status(400).json({ error: "Attendee name is required" });
    return;
  }

  const rawEmail = req.body?.attendee_email;
  const attendeeEmail = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(attendeeEmail)) {
    res.status(400).json({ error: "Invalid attendee email" });
    return;
  }

  const activeCount = await countActiveRsvpForEmail(id, attendeeEmail);
  if (activeCount > 0) {
    res.status(409).json({ error: "Attendee already RSVP'd" });
    return;
  }

  const status = event.going_count < event.capacity ? "going" : "waitlisted";
  const rsvp = await createRsvp({
    event_id: id,
    attendee_name: attendeeName,
    attendee_email: attendeeEmail,
    status,
    created_at: new Date().toISOString(),
  });

  const updatedEvent = await getEventWithCountsById(id);
  res.status(201).json({ rsvp, event: toEventSummary(updatedEvent!) });
});

app.patch("/rsvps/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid RSVP id" });
    return;
  }

  const existing = await getRsvpById(id);
  if (!existing) {
    res.status(404).json({ error: "RSVP not found" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length === 0) {
    res.status(400).json({ error: "No update fields provided" });
    return;
  }
  if (keys.some((key) => !ALLOWED_RSVP_UPDATE_FIELDS.has(key))) {
    res.status(400).json({ error: "Unknown update field" });
    return;
  }

  const status = parseRsvpStatus(body.status);
  if (!status) {
    res.status(400).json({ error: "Invalid RSVP status" });
    return;
  }

  if (status === "going" && existing.status !== "going") {
    const event = await getEventWithCountsById(existing.event_id);
    const spotsRemaining = Math.max((event?.capacity ?? 0) - (event?.going_count ?? 0), 0);
    if (spotsRemaining <= 0) {
      res.status(400).json({ error: "Event is full" });
      return;
    }
  }

  const rsvp = await updateRsvpStatus({ id, status, updated_at: new Date().toISOString() });
  const updatedEvent = await getEventWithCountsById(rsvp!.event_id);
  res.json({ rsvp, event: toEventSummary(updatedEvent!) });
});

export default app;
