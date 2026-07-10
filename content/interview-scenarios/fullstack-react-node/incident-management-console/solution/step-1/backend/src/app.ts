import express from "express";
import {
  getIncidentById,
  getResponderById,
  getServiceById,
  listActiveResponders,
  listIncidentEvents,
  listIncidents,
  listServices,
  resetDatabase,
  type IncidentEventRow,
  type IncidentRow,
  type ResponderRow,
  type ServiceRow,
} from "./db";

function toServiceJson(service: ServiceRow) {
  return { id: service.id, name: service.name, slug: service.slug, status: service.status };
}

function toResponderJson(responder: ResponderRow) {
  return { id: responder.id, name: responder.name, email: responder.email, role: responder.role };
}

function toIncidentJson(incident: IncidentRow, service: ServiceRow, assignedResponder: ResponderRow | null) {
  return {
    id: incident.id,
    service: toServiceJson(service),
    assigned_responder: assignedResponder ? toResponderJson(assignedResponder) : null,
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    started_at: incident.started_at,
    resolved_at: incident.resolved_at,
    created_at: incident.created_at,
    updated_at: incident.updated_at,
  };
}

function toEventJson(event: IncidentEventRow, responder: ResponderRow | null) {
  return {
    id: event.id,
    incident_id: event.incident_id,
    responder: responder ? toResponderJson(responder) : null,
    event_type: event.event_type,
    message: event.message,
    created_at: event.created_at,
  };
}

async function buildIncidentJson(incident: IncidentRow) {
  const service = await getServiceById(incident.service_id);
  const assignedResponder = incident.assigned_responder_id
    ? await getResponderById(incident.assigned_responder_id)
    : null;
  return toIncidentJson(incident, service!, assignedResponder);
}

async function buildEventJson(event: IncidentEventRow) {
  const responder = event.responder_id ? await getResponderById(event.responder_id) : null;
  return toEventJson(event, responder);
}

function parseId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
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

app.get("/incidents", async (_req, res) => {
  const incidents = await listIncidents();
  const payload = await Promise.all(incidents.map(buildIncidentJson));
  res.json({ incidents: payload });
});

app.get("/incident-options", async (_req, res) => {
  const [services, responders] = await Promise.all([listServices(), listActiveResponders()]);
  res.json({ services: services.map(toServiceJson), responders: responders.map(toResponderJson) });
});

app.get("/incidents/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid incident id" });
    return;
  }
  const incident = await getIncidentById(id);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const events = await listIncidentEvents(id);
  const eventsJson = await Promise.all(events.map(buildEventJson));
  res.json({ incident: await buildIncidentJson(incident), events: eventsJson });
});

// TODO (Step 2): support status/severity/service_id/assigned query filters on
// GET /incidents, GET /incidents/summary, PATCH /incidents/:id/assign, and
// POST /incidents/:id/events, as documented in scenario.md.

// TODO (Step 3): support PATCH /incidents/:id/status.

export default app;
