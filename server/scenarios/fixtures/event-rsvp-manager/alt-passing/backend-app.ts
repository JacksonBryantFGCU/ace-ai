// ALT-PASSING fixture backend for event-rsvp-manager step 2 (filter-and-create-rsvp).
//
// Behaviorally equivalent to solution/step-2/backend/src/app.ts (same routes,
// same JSON response shapes, same status codes and error strings) but
// organized differently: a router + centralized `ApiError` / error-handling
// middleware instead of manual `res.status().json()` calls inline in each
// handler, plus differently named helpers and a Map-based status allowlist
// instead of a Set.

import express, { type NextFunction, type Request, type Response, Router } from "express";
import {
  EVENT_STATUSES,
  countActiveRsvpForEmail,
  createRsvp,
  getEventWithCountsById,
  listEvents,
  listRsvpsForEvent,
  resetDatabase,
  type EventStatus,
  type EventWithCounts,
} from "./db";

/** Thrown by route handlers; caught by the trailing error middleware. */
class ApiError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const EVENT_STATUS_ALLOWLIST = new Map(EVENT_STATUSES.map((status) => [status, true]));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Attach the computed capacity fields. Neither is stored in the database. */
function withCapacityFields(row: EventWithCounts) {
  const spotsRemaining = row.capacity - row.going_count;
  return {
    ...row,
    spots_remaining: spotsRemaining > 0 ? spotsRemaining : 0,
    is_full: row.going_count >= row.capacity,
  };
}

function toPositiveInt(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function coerceEventStatus(raw: unknown): EventStatus | null {
  if (typeof raw !== "string") return null;
  return EVENT_STATUS_ALLOWLIST.has(raw as EventStatus) ? (raw as EventStatus) : null;
}

function requireEventId(req: Request): number {
  const id = toPositiveInt(req.params.id ?? "");
  if (id === null) throw new ApiError(400, "Invalid event id");
  return id;
}

async function requireEvent(id: number): Promise<EventWithCounts> {
  const event = await getEventWithCountsById(id);
  if (!event) throw new ApiError(404, "Event not found");
  return event;
}

function readEventQueryFilters(req: Request): { status?: EventStatus; availability?: "open" | "full" } {
  const statusParam = req.query.status;
  let status: EventStatus | undefined;
  if (statusParam !== undefined) {
    if (Array.isArray(statusParam)) throw new ApiError(400, "Invalid event status");
    const parsed = coerceEventStatus(statusParam);
    if (!parsed) throw new ApiError(400, "Invalid event status");
    status = parsed;
  }

  const availabilityParam = req.query.availability;
  let availability: "open" | "full" | undefined;
  if (availabilityParam !== undefined) {
    if (Array.isArray(availabilityParam) || (availabilityParam !== "open" && availabilityParam !== "full")) {
      throw new ApiError(400, "Invalid availability filter");
    }
    availability = availabilityParam;
  }

  return { status, availability };
}

function readAttendeeFields(req: Request): { attendee_name: string; attendee_email: string } {
  const nameField = req.body?.attendee_name;
  const attendeeName = typeof nameField === "string" ? nameField.trim() : "";
  if (!attendeeName) throw new ApiError(400, "Attendee name is required");

  const emailField = req.body?.attendee_email;
  const attendeeEmail = typeof emailField === "string" ? emailField.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(attendeeEmail)) throw new ApiError(400, "Invalid attendee email");

  return { attendee_name: attendeeName, attendee_email: attendeeEmail };
}

/** Wrap an async handler so a thrown ApiError (or unexpected error) reaches `next`. */
function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.post(
  "/__test/reset",
  asyncRoute(async (_req, res) => {
    if (process.env.NODE_ENV !== "test") {
      throw new ApiError(404, "Not found");
    }
    await resetDatabase();
    res.json({ ok: true });
  }),
);

router.get(
  "/events",
  asyncRoute(async (req, res) => {
    const filters = readEventQueryFilters(req);
    const rows = await listEvents(filters);
    res.json({ events: rows.map(withCapacityFields) });
  }),
);

router.get(
  "/events/:id",
  asyncRoute(async (req, res) => {
    const id = requireEventId(req);
    const event = await requireEvent(id);
    const rsvps = await listRsvpsForEvent(id);
    res.json({ event: { ...withCapacityFields(event), rsvps } });
  }),
);

router.post(
  "/events/:id/rsvps",
  asyncRoute(async (req, res) => {
    const id = requireEventId(req);
    const event = await requireEvent(id);

    if (event.status !== "scheduled") {
      throw new ApiError(400, "Event is not accepting RSVPs");
    }

    const attendee = readAttendeeFields(req);

    const activeCount = await countActiveRsvpForEmail(id, attendee.attendee_email);
    if (activeCount > 0) {
      throw new ApiError(409, "Attendee already RSVP'd");
    }

    const hasCapacity = event.going_count < event.capacity;
    const rsvp = await createRsvp({
      event_id: id,
      attendee_name: attendee.attendee_name,
      attendee_email: attendee.attendee_email,
      status: hasCapacity ? "going" : "waitlisted",
      created_at: new Date().toISOString(),
    });

    const refreshedEvent = await requireEvent(id);
    res.status(201).json({ rsvp, event: withCapacityFields(refreshedEvent) });
  }),
);

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

app.use(router);

// Centralized error handler: every ApiError thrown above lands here instead of
// each route formatting its own error response inline.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

export default app;
