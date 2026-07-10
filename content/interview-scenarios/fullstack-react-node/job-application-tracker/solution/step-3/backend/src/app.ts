import express from "express";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  createApplication,
  getApplicationById,
  getApplicationSummary,
  listApplications,
  resetDatabase,
  updateApplication,
  type ApplicationSource,
  type ApplicationStatus,
} from "./db";

const VALID_STATUSES = new Set<ApplicationStatus>(APPLICATION_STATUSES);
const VALID_SOURCES = new Set<ApplicationSource>(APPLICATION_SOURCES);
const ALLOWED_UPDATE_FIELDS = new Set(["status", "notes"]);
const NOTES_MAX_LENGTH = 500;

function parseStatus(value: unknown): ApplicationStatus | null {
  return typeof value === "string" && VALID_STATUSES.has(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : null;
}

function parseSource(value: unknown): ApplicationSource | null {
  return typeof value === "string" && VALID_SOURCES.has(value as ApplicationSource)
    ? (value as ApplicationSource)
    : null;
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

app.get("/applications", async (req, res) => {
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

  const sourceParam = req.query.source;
  if (Array.isArray(sourceParam)) {
    res.status(400).json({ error: "Invalid source" });
    return;
  }
  const source = sourceParam === undefined ? undefined : parseSource(sourceParam);
  if (sourceParam !== undefined && !source) {
    res.status(400).json({ error: "Invalid source" });
    return;
  }

  const applications = await listApplications({ status, source });
  res.json({ applications });
});

app.get("/applications/summary", async (_req, res) => {
  const summary = await getApplicationSummary();
  res.json({ summary });
});

app.post("/applications", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (!company) {
    res.status(400).json({ error: "Company is required" });
    return;
  }

  const role = typeof body.role === "string" ? body.role.trim() : "";
  if (!role) {
    res.status(400).json({ error: "Role is required" });
    return;
  }

  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (!location) {
    res.status(400).json({ error: "Location is required" });
    return;
  }

  const status = body.status === undefined ? "draft" : parseStatus(body.status);
  if (!status) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const source = body.source === undefined ? "other" : parseSource(body.source);
  if (!source) {
    res.status(400).json({ error: "Invalid source" });
    return;
  }

  if (body.notes !== undefined && typeof body.notes !== "string") {
    res.status(400).json({ error: "Invalid notes" });
    return;
  }
  const trimmedNotes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (trimmedNotes.length > NOTES_MAX_LENGTH) {
    res.status(400).json({ error: "Notes are too long" });
    return;
  }
  const notes = trimmedNotes === "" ? null : trimmedNotes;

  const application = await createApplication({
    company,
    role,
    location,
    status,
    source,
    notes,
    applied_at: new Date().toISOString(),
  });

  res.status(201).json({ application });
});

app.patch("/applications/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid application id" });
    return;
  }

  const existing = await getApplicationById(id);
  if (!existing) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length === 0) {
    res.status(400).json({ error: "No update fields provided" });
    return;
  }
  if (keys.some((key) => !ALLOWED_UPDATE_FIELDS.has(key))) {
    res.status(400).json({ error: "Unknown update field" });
    return;
  }

  let status = existing.status;
  if (body.status !== undefined) {
    const parsedStatus = parseStatus(body.status);
    if (!parsedStatus) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    status = parsedStatus;
  }

  let notes = existing.notes;
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") {
      res.status(400).json({ error: "Invalid notes" });
      return;
    }
    const trimmedNotes = body.notes.trim();
    if (trimmedNotes.length > NOTES_MAX_LENGTH) {
      res.status(400).json({ error: "Notes are too long" });
      return;
    }
    notes = trimmedNotes === "" ? null : trimmedNotes;
  }

  const application = await updateApplication({ id, status, notes, updated_at: new Date().toISOString() });
  res.json({ application });
});

export default app;
