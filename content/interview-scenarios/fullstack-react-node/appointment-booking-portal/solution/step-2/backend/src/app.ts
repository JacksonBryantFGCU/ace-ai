import express from "express";
import {
  APPOINTMENT_STATUSES,
  createAppointment,
  getServiceById,
  getStaffById,
  hasConflictingAppointment,
  listAppointmentsWithDetails,
  listServices,
  listStaff,
  resetDatabase,
  type AppointmentStatus,
} from "./db";

const VALID_STATUSES = new Set<AppointmentStatus>(APPOINTMENT_STATUSES);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const NOTES_MAX_LENGTH = 500;

function parseId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseAppointmentStatus(value: unknown): AppointmentStatus | null {
  return typeof value === "string" && VALID_STATUSES.has(value as AppointmentStatus)
    ? (value as AppointmentStatus)
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

app.get("/appointments", async (req, res) => {
  const staffIdParam = req.query.staff_id;
  let staffId: number | undefined;
  if (staffIdParam !== undefined) {
    if (Array.isArray(staffIdParam)) {
      res.status(400).json({ error: "Invalid staff id" });
      return;
    }
    const id = parseId(staffIdParam);
    if (!id) {
      res.status(400).json({ error: "Invalid staff id" });
      return;
    }
    const staff = await getStaffById(id);
    if (!staff) {
      res.status(404).json({ error: "Staff not found" });
      return;
    }
    staffId = id;
  }

  const statusParam = req.query.status;
  let status: AppointmentStatus | undefined;
  if (statusParam !== undefined) {
    if (Array.isArray(statusParam)) {
      res.status(400).json({ error: "Invalid appointment status" });
      return;
    }
    const parsed = parseAppointmentStatus(statusParam);
    if (!parsed) {
      res.status(400).json({ error: "Invalid appointment status" });
      return;
    }
    status = parsed;
  }

  const dateParam = req.query.date;
  let date: string | undefined;
  if (dateParam !== undefined) {
    if (Array.isArray(dateParam) || typeof dateParam !== "string" || !DATE_ONLY_RE.test(dateParam)) {
      res.status(400).json({ error: "Invalid date" });
      return;
    }
    date = dateParam;
  }

  const appointments = await listAppointmentsWithDetails({ staffId, status, date });
  res.json({ appointments });
});

app.get("/booking-options", async (_req, res) => {
  const [services, staff] = await Promise.all([listServices({ activeOnly: true }), listStaff({ activeOnly: true })]);
  res.json({ services, staff });
});

app.post("/appointments", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const serviceId = parseId(body.service_id);
  if (!serviceId) {
    res.status(400).json({ error: "Invalid service id" });
    return;
  }
  const service = await getServiceById(serviceId);
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  if (!service.is_active) {
    res.status(400).json({ error: "Service is inactive" });
    return;
  }

  const staffId = parseId(body.staff_id);
  if (!staffId) {
    res.status(400).json({ error: "Invalid staff id" });
    return;
  }
  const staff = await getStaffById(staffId);
  if (!staff) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }
  if (!staff.is_active) {
    res.status(400).json({ error: "Staff member is inactive" });
    return;
  }

  const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  if (!customerName) {
    res.status(400).json({ error: "Customer name is required" });
    return;
  }

  const customerEmail = typeof body.customer_email === "string" ? body.customer_email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(customerEmail)) {
    res.status(400).json({ error: "Invalid customer email" });
    return;
  }

  const startsAtRaw = body.starts_at;
  const startsAtTime = typeof startsAtRaw === "string" ? new Date(startsAtRaw).getTime() : NaN;
  if (typeof startsAtRaw !== "string" || Number.isNaN(startsAtTime)) {
    res.status(400).json({ error: "Invalid start time" });
    return;
  }
  const startsAt = new Date(startsAtTime).toISOString();
  const endsAt = new Date(startsAtTime + service.duration_minutes * 60_000).toISOString();

  const conflict = await hasConflictingAppointment(staffId, startsAt, endsAt);
  if (conflict) {
    res.status(400).json({ error: "Appointment conflicts with existing booking" });
    return;
  }

  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
    res.status(400).json({ error: "Invalid notes" });
    return;
  }
  const trimmedNotes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (trimmedNotes.length > NOTES_MAX_LENGTH) {
    res.status(400).json({ error: "Notes are too long" });
    return;
  }
  const notes = trimmedNotes === "" ? null : trimmedNotes;

  const appointment = await createAppointment({
    service_id: serviceId,
    staff_id: staffId,
    customer_name: customerName,
    customer_email: customerEmail,
    starts_at: startsAt,
    ends_at: endsAt,
    notes,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({ appointment });
});

export default app;
