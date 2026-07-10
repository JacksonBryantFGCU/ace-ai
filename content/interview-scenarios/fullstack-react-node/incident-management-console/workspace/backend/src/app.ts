import express from "express";
import { resetDatabase } from "./db";

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

app.get("/incidents", async (_req, res) => {
  // TODO (Step 1): return every incident, via listIncidents() from ./db, each
  // joined with its service and assigned responder (assigned_responder is
  // null when unassigned), as { incidents: [...] } using the documented
  // response shape. Default ordering (severity, then status, then
  // started_at desc, then id asc) is already applied by listIncidents.
  res.json({ incidents: [] });
});

app.get("/incident-options", async (_req, res) => {
  // TODO (Step 1): return { services: [...], responders: [...] } using
  // listServices() (all services) and listActiveResponders() (active only)
  // from ./db, each ordered by id ascending.
  res.json({ services: [], responders: [] });
});

app.get("/incidents/:id", async (_req, res) => {
  // TODO (Step 1): parse the incident id, load it via getIncidentById(),
  // 404 with { error: "Incident not found" } if missing (400
  // { error: "Invalid incident id" } if the id itself isn't a positive
  // integer), and respond with { incident: {...}, events: [...] } where
  // events come from listIncidentEvents() (already ordered by created_at
  // then id).
  res.status(404).json({ error: "Incident not found" });
});

// TODO (Step 2): support status/severity/service_id/assigned query filters on
// GET /incidents, GET /incidents/summary, PATCH /incidents/:id/assign, and
// POST /incidents/:id/events, as documented in scenario.md.

// TODO (Step 3): support PATCH /incidents/:id/status, enforcing the allowed
// status transitions and resolution rules documented in scenario.md.

export default app;
