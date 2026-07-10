import express from "express";
import { listAppointmentsWithDetails, listServices, listStaff, resetDatabase } from "./db";

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

app.get("/appointments", async (_req, res) => {
  // TODO (Step 1): fetch appointments with listAppointmentsWithDetails() and
  // respond with { appointments: [...] }. It already joins in the service and
  // staff details and returns them ordered by starts_at, then id.
  res.json({ appointments: [] });
});

app.get("/booking-options", async (_req, res) => {
  // TODO (Step 1): fetch only ACTIVE services and staff — pass { activeOnly: true }
  // to listServices() and listStaff() — and respond with
  // { services: [...], staff: [...] }.
  res.json({ services: [], staff: [] });
});

// TODO (Step 2): support GET /appointments?staff_id=<id>, ?status=<status>, and
// ?date=<YYYY-MM-DD> (validating each, and allowing them to combine). Also add
// POST /appointments to create a scheduled appointment — validate the service
// exists and is active, the staff member exists and is active, customer name and
// email, and starts_at; compute ends_at from the service's duration_minutes; and
// reject a booking that overlaps an existing scheduled/completed appointment for
// the same staff member (hasConflictingAppointment in ./db; cancelled
// appointments never block).

// TODO (Step 3): support PATCH /appointments/:id/status to finalize an
// appointment. Only a "scheduled" appointment can change, and only to
// "completed" or "cancelled" — an already-finalized appointment cannot change
// again.

export default app;
