import express from "express";
import {
  assignResponder,
  countIncidentsBySeverity,
  countIncidentsByStatus,
  countTotalIncidents,
  countUnassignedUnresolvedIncidents,
  createIncidentEvent,
  getIncidentById,
  getResponderById,
  getServiceById,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  listActiveResponders,
  listIncidentEvents,
  listIncidents,
  listServices,
  resetDatabase,
  touchIncidentUpdatedAt,
  type IncidentEventRow,
  type IncidentFilters,
  type IncidentRow,
  type IncidentSeverity,
  type IncidentStatus,
  type ResponderRow,
  type ServiceRow,
} from "./db";

const MAX_MESSAGE_LENGTH = 500;

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

app.get("/incidents", async (req, res) => {
  const filters: IncidentFilters = {};

  if (req.query.status !== undefined) {
    const status = String(req.query.status);
    if (!INCIDENT_STATUSES.includes(status as IncidentStatus)) {
      res.status(400).json({ error: "Invalid incident status" });
      return;
    }
    filters.status = status as IncidentStatus;
  }

  if (req.query.severity !== undefined) {
    const severity = String(req.query.severity);
    if (!INCIDENT_SEVERITIES.includes(severity as IncidentSeverity)) {
      res.status(400).json({ error: "Invalid severity" });
      return;
    }
    filters.severity = severity as IncidentSeverity;
  }

  if (req.query.service_id !== undefined) {
    const serviceId = parseId(req.query.service_id);
    if (!serviceId) {
      res.status(400).json({ error: "Invalid service id" });
      return;
    }
    const service = await getServiceById(serviceId);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    filters.serviceId = serviceId;
  }

  if (req.query.assigned !== undefined) {
    const assigned = String(req.query.assigned);
    if (assigned !== "true" && assigned !== "false") {
      res.status(400).json({ error: "Invalid assigned filter" });
      return;
    }
    filters.assigned = assigned === "true";
  }

  const incidents = await listIncidents(filters);
  const payload = await Promise.all(incidents.map(buildIncidentJson));
  res.json({ incidents: payload });
});

app.get("/incidents/summary", async (_req, res) => {
  const [total, byStatus, bySeverity, unassigned] = await Promise.all([
    countTotalIncidents(),
    countIncidentsByStatus(),
    countIncidentsBySeverity(),
    countUnassignedUnresolvedIncidents(),
  ]);
  res.json({
    summary: {
      total,
      open: byStatus.open,
      investigating: byStatus.investigating,
      monitoring: byStatus.monitoring,
      resolved: byStatus.resolved,
      sev1: bySeverity.sev1,
      sev2: bySeverity.sev2,
      sev3: bySeverity.sev3,
      unassigned,
    },
  });
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

app.patch("/incidents/:id/assign", async (req, res) => {
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
  if (incident.status === "resolved") {
    res.status(400).json({ error: "Incident is resolved" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const responderId = parseId(body.responder_id);
  if (!responderId) {
    res.status(400).json({ error: "Invalid responder id" });
    return;
  }
  const responder = await getResponderById(responderId);
  if (!responder) {
    res.status(404).json({ error: "Responder not found" });
    return;
  }
  if (!responder.is_active) {
    res.status(400).json({ error: "Responder is inactive" });
    return;
  }
  if (incident.assigned_responder_id === responder.id) {
    res.status(400).json({ error: "Responder is already assigned" });
    return;
  }

  const now = new Date().toISOString();
  const updated = await assignResponder({ id, responderId: responder.id, updatedAt: now });
  const event = await createIncidentEvent({
    incidentId: id,
    responderId: responder.id,
    eventType: "assigned",
    message: `Assigned to ${responder.name}.`,
    createdAt: now,
  });

  res.json({ incident: await buildIncidentJson(updated!), event: await buildEventJson(event) });
});

app.post("/incidents/:id/events", async (req, res) => {
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
  if (incident.status === "resolved") {
    res.status(400).json({ error: "Incident is resolved" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const responderId = parseId(body.responder_id);
  if (!responderId) {
    res.status(400).json({ error: "Invalid responder id" });
    return;
  }
  const responder = await getResponderById(responderId);
  if (!responder) {
    res.status(404).json({ error: "Responder not found" });
    return;
  }
  if (!responder.is_active) {
    res.status(400).json({ error: "Responder is inactive" });
    return;
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: "Message is too long" });
    return;
  }

  const now = new Date().toISOString();
  const event = await createIncidentEvent({
    incidentId: id,
    responderId: responder.id,
    eventType: "update",
    message,
    createdAt: now,
  });
  const updated = await touchIncidentUpdatedAt(id, now);

  res.status(201).json({ event: await buildEventJson(event), incident: await buildIncidentJson(updated!) });
});

// TODO (Step 3): support PATCH /incidents/:id/status to enforce the allowed
// status transitions, resolve incidents (setting resolved_at and creating a
// resolved event), and create status_changed events for non-resolving
// transitions, as documented in scenario.md.

export default app;
