import initSqlJs from "sql.js";

export type ServiceStatus = "operational" | "degraded" | "down";
export type ResponderRole = "engineer" | "manager" | "support";
export type IncidentSeverity = "sev1" | "sev2" | "sev3";
export type IncidentStatus = "open" | "investigating" | "monitoring" | "resolved";
export type IncidentEventType = "created" | "assigned" | "status_changed" | "update" | "resolved";

export const SERVICE_STATUSES: ServiceStatus[] = ["operational", "degraded", "down"];
export const RESPONDER_ROLES: ResponderRole[] = ["engineer", "manager", "support"];
export const INCIDENT_SEVERITIES: IncidentSeverity[] = ["sev1", "sev2", "sev3"];
export const INCIDENT_STATUSES: IncidentStatus[] = ["open", "investigating", "monitoring", "resolved"];
export const INCIDENT_EVENT_TYPES: IncidentEventType[] = [
  "created",
  "assigned",
  "status_changed",
  "update",
  "resolved",
];

export interface ServiceRow {
  id: number;
  name: string;
  slug: string;
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
}

export interface ResponderRow {
  id: number;
  name: string;
  email: string;
  role: ResponderRole;
  is_active: number;
  created_at: string;
}

export interface IncidentRow {
  id: number;
  service_id: number;
  assigned_responder_id: number | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentEventRow {
  id: number;
  incident_id: number;
  responder_id: number | null;
  event_type: IncidentEventType;
  message: string;
  created_at: string;
}

/**
 * Deterministic seed data. Six incidents cover every status/severity value at
 * least once, an assigned and an unassigned incident, one resolved incident
 * with `resolved_at` set, and several incidents with multi-event timelines.
 * Casey Kim (responder 4) is inactive and exists only to test the
 * active-responder rules — nothing seeds them as assigned.
 */
const SEED_SERVICES = [
  { id: 1, name: "API Gateway", slug: "api-gateway", status: "degraded", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Payments Service", slug: "payments-service", status: "operational", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Auth Service", slug: "auth-service", status: "down", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
  { id: 4, name: "Notifications Service", slug: "notifications-service", status: "operational", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
] satisfies ServiceRow[];

const SEED_RESPONDERS = [
  { id: 1, name: "Alex Rivera", email: "alex@example.com", role: "engineer", is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Jordan Lee", email: "jordan@example.com", role: "manager", is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Sam Carter", email: "sam@example.com", role: "support", is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 4, name: "Casey Kim", email: "casey@example.com", role: "engineer", is_active: 0, created_at: "2025-01-01T09:00:00.000Z" },
] satisfies ResponderRow[];

const SEED_INCIDENTS = [
  {
    id: 1,
    service_id: 1,
    assigned_responder_id: 1,
    title: "Elevated API latency",
    description: "Requests to the API Gateway are timing out.",
    severity: "sev2",
    status: "investigating",
    started_at: "2025-02-10T15:00:00.000Z",
    resolved_at: null,
    created_at: "2025-02-10T15:05:00.000Z",
    updated_at: "2025-02-10T15:30:00.000Z",
  },
  {
    id: 2,
    service_id: 3,
    assigned_responder_id: null,
    title: "Auth service full outage",
    description: "Users cannot authenticate; all login requests fail.",
    severity: "sev1",
    status: "open",
    started_at: "2025-02-11T09:00:00.000Z",
    resolved_at: null,
    created_at: "2025-02-11T09:02:00.000Z",
    updated_at: "2025-02-11T09:02:00.000Z",
  },
  {
    id: 3,
    service_id: 2,
    assigned_responder_id: 2,
    title: "Payment webhook delays",
    description: "Stripe webhook events are queuing with a multi-minute delay.",
    severity: "sev3",
    status: "monitoring",
    started_at: "2025-02-08T12:00:00.000Z",
    resolved_at: null,
    created_at: "2025-02-08T12:10:00.000Z",
    updated_at: "2025-02-08T14:00:00.000Z",
  },
  {
    id: 4,
    service_id: 4,
    assigned_responder_id: 3,
    title: "Push notifications delayed",
    description: "Push notification delivery is lagging by 10+ minutes.",
    severity: "sev3",
    status: "resolved",
    started_at: "2025-02-05T08:00:00.000Z",
    resolved_at: "2025-02-05T10:30:00.000Z",
    created_at: "2025-02-05T08:05:00.000Z",
    updated_at: "2025-02-05T10:30:00.000Z",
  },
  {
    id: 5,
    service_id: 1,
    assigned_responder_id: null,
    title: "Gateway config drift alert",
    description: "Automated config drift check flagged the API Gateway.",
    severity: "sev3",
    status: "open",
    started_at: "2025-02-12T07:00:00.000Z",
    resolved_at: null,
    created_at: "2025-02-12T07:01:00.000Z",
    updated_at: "2025-02-12T07:01:00.000Z",
  },
  {
    id: 6,
    service_id: 2,
    assigned_responder_id: 1,
    title: "Duplicate charge spike",
    description: "Multiple customers report duplicate charges in the last hour.",
    severity: "sev1",
    status: "investigating",
    started_at: "2025-02-12T18:00:00.000Z",
    resolved_at: null,
    created_at: "2025-02-12T18:03:00.000Z",
    updated_at: "2025-02-12T18:15:00.000Z",
  },
] satisfies IncidentRow[];

const SEED_INCIDENT_EVENTS = [
  { id: 1, incident_id: 1, responder_id: null, event_type: "created", message: "Incident opened for Elevated API latency.", created_at: "2025-02-10T15:05:00.000Z" },
  { id: 2, incident_id: 1, responder_id: 1, event_type: "assigned", message: "Assigned to Alex Rivera.", created_at: "2025-02-10T15:10:00.000Z" },
  { id: 3, incident_id: 1, responder_id: 1, event_type: "update", message: "Restarted API worker pool.", created_at: "2025-02-10T15:30:00.000Z" },

  { id: 4, incident_id: 2, responder_id: null, event_type: "created", message: "Incident opened for Auth service full outage.", created_at: "2025-02-11T09:02:00.000Z" },

  { id: 5, incident_id: 3, responder_id: null, event_type: "created", message: "Incident opened for Payment webhook delays.", created_at: "2025-02-08T12:10:00.000Z" },
  { id: 6, incident_id: 3, responder_id: 2, event_type: "assigned", message: "Assigned to Jordan Lee.", created_at: "2025-02-08T12:15:00.000Z" },
  { id: 7, incident_id: 3, responder_id: 2, event_type: "status_changed", message: "Status changed to investigating.", created_at: "2025-02-08T13:00:00.000Z" },
  { id: 8, incident_id: 3, responder_id: 2, event_type: "status_changed", message: "Status changed to monitoring.", created_at: "2025-02-08T14:00:00.000Z" },

  { id: 9, incident_id: 4, responder_id: null, event_type: "created", message: "Incident opened for Push notifications delayed.", created_at: "2025-02-05T08:05:00.000Z" },
  { id: 10, incident_id: 4, responder_id: 3, event_type: "assigned", message: "Assigned to Sam Carter.", created_at: "2025-02-05T08:10:00.000Z" },
  { id: 11, incident_id: 4, responder_id: 3, event_type: "status_changed", message: "Status changed to investigating.", created_at: "2025-02-05T09:00:00.000Z" },
  { id: 12, incident_id: 4, responder_id: 3, event_type: "resolved", message: "Incident resolved.", created_at: "2025-02-05T10:30:00.000Z" },

  { id: 13, incident_id: 5, responder_id: null, event_type: "created", message: "Incident opened for Gateway config drift alert.", created_at: "2025-02-12T07:01:00.000Z" },

  { id: 14, incident_id: 6, responder_id: null, event_type: "created", message: "Incident opened for Duplicate charge spike.", created_at: "2025-02-12T18:03:00.000Z" },
  { id: 15, incident_id: 6, responder_id: 1, event_type: "assigned", message: "Assigned to Alex Rivera.", created_at: "2025-02-12T18:15:00.000Z" },
] satisfies IncidentEventRow[];

let sqlModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let database: initSqlJs.Database | null = null;
let seededDatabaseBytes: Uint8Array | null = null;

async function getSqlModule() {
  sqlModule ??= await initSqlJs();
  return sqlModule;
}

function rowsFromStatement<T>(statement: initSqlJs.Statement): T[] {
  const rows: T[] = [];
  try {
    while (statement.step()) rows.push(statement.getAsObject() as T);
    return rows;
  } finally {
    statement.free();
  }
}

export async function resetDatabase() {
  const SQL = await getSqlModule();
  if (!seededDatabaseBytes) {
    const seeded = new SQL.Database();
    seeded.run(`
      CREATE TABLE services (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE responders (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE incidents (
        id INTEGER PRIMARY KEY,
        service_id INTEGER NOT NULL,
        assigned_responder_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        resolved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (assigned_responder_id) REFERENCES responders(id)
      );

      CREATE TABLE incident_events (
        id INTEGER PRIMARY KEY,
        incident_id INTEGER NOT NULL,
        responder_id INTEGER,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (incident_id) REFERENCES incidents(id),
        FOREIGN KEY (responder_id) REFERENCES responders(id)
      );
    `);

    const insertService = seeded.prepare(
      "INSERT INTO services (id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertResponder = seeded.prepare(`
      INSERT INTO responders (id, name, email, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertIncident = seeded.prepare(`
      INSERT INTO incidents (id, service_id, assigned_responder_id, title, description, severity, status, started_at, resolved_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertIncidentEvent = seeded.prepare(`
      INSERT INTO incident_events (id, incident_id, responder_id, event_type, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      seeded.run("BEGIN");
      for (const service of SEED_SERVICES) {
        insertService.run([service.id, service.name, service.slug, service.status, service.created_at, service.updated_at]);
      }
      for (const responder of SEED_RESPONDERS) {
        insertResponder.run([responder.id, responder.name, responder.email, responder.role, responder.is_active, responder.created_at]);
      }
      for (const incident of SEED_INCIDENTS) {
        insertIncident.run([
          incident.id,
          incident.service_id,
          incident.assigned_responder_id,
          incident.title,
          incident.description,
          incident.severity,
          incident.status,
          incident.started_at,
          incident.resolved_at,
          incident.created_at,
          incident.updated_at,
        ]);
      }
      for (const event of SEED_INCIDENT_EVENTS) {
        insertIncidentEvent.run([event.id, event.incident_id, event.responder_id, event.event_type, event.message, event.created_at]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insertService.free();
      insertResponder.free();
      insertIncident.free();
      insertIncidentEvent.free();
      seeded.close();
    }
  }

  database?.close();
  database = new SQL.Database(seededDatabaseBytes.slice());
}

export async function getDatabase() {
  if (!database) await resetDatabase();
  return database!;
}

export async function getServiceById(id: number): Promise<ServiceRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM services WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<ServiceRow>(statement);
  return rows[0] ?? null;
}

export async function listServices(): Promise<ServiceRow[]> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM services ORDER BY id ASC");
  return rowsFromStatement<ServiceRow>(statement);
}

export async function listActiveResponders(): Promise<ResponderRow[]> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM responders WHERE is_active = 1 ORDER BY id ASC");
  return rowsFromStatement<ResponderRow>(statement);
}

export async function getResponderById(id: number): Promise<ResponderRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM responders WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<ResponderRow>(statement);
  return rows[0] ?? null;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  serviceId?: number;
  assigned?: boolean;
}

const SEVERITY_RANK: Record<IncidentSeverity, number> = { sev1: 0, sev2: 1, sev3: 2 };
const STATUS_RANK: Record<IncidentStatus, number> = { open: 0, investigating: 1, monitoring: 2, resolved: 3 };

export async function listIncidents(filters: IncidentFilters = {}): Promise<IncidentRow[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.severity) {
    clauses.push("severity = ?");
    params.push(filters.severity);
  }
  if (filters.serviceId !== undefined) {
    clauses.push("service_id = ?");
    params.push(filters.serviceId);
  }
  if (filters.assigned !== undefined) {
    clauses.push(filters.assigned ? "assigned_responder_id IS NOT NULL" : "assigned_responder_id IS NULL");
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const statement = db.prepare(`SELECT * FROM incidents ${where}`);
  statement.bind(params as (string | number)[]);
  const rows = rowsFromStatement<IncidentRow>(statement);

  return rows.sort((a, b) => {
    const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severityDiff !== 0) return severityDiff;
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;
    const startedDiff = new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    if (startedDiff !== 0) return startedDiff;
    return a.id - b.id;
  });
}

export async function getIncidentById(id: number): Promise<IncidentRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM incidents WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<IncidentRow>(statement);
  return rows[0] ?? null;
}

export async function listIncidentEvents(incidentId: number): Promise<IncidentEventRow[]> {
  const db = await getDatabase();
  const statement = db.prepare(
    "SELECT * FROM incident_events WHERE incident_id = ? ORDER BY created_at ASC, id ASC",
  );
  statement.bind([incidentId]);
  return rowsFromStatement<IncidentEventRow>(statement);
}

export async function createIncidentEvent(input: {
  incidentId: number;
  responderId: number | null;
  eventType: IncidentEventType;
  message: string;
  createdAt: string;
}): Promise<IncidentEventRow> {
  const db = await getDatabase();
  db.run(
    "INSERT INTO incident_events (incident_id, responder_id, event_type, message, created_at) VALUES (?, ?, ?, ?, ?)",
    [input.incidentId, input.responderId, input.eventType, input.message, input.createdAt],
  );
  const statement = db.prepare("SELECT * FROM incident_events ORDER BY id DESC LIMIT 1");
  const rows = rowsFromStatement<IncidentEventRow>(statement);
  return rows[0]!;
}

export async function assignResponder(input: {
  id: number;
  responderId: number;
  updatedAt: string;
}): Promise<IncidentRow | null> {
  const db = await getDatabase();
  db.run("UPDATE incidents SET assigned_responder_id = ?, updated_at = ? WHERE id = ?", [
    input.responderId,
    input.updatedAt,
    input.id,
  ]);
  return getIncidentById(input.id);
}

export async function touchIncidentUpdatedAt(id: number, updatedAt: string): Promise<IncidentRow | null> {
  const db = await getDatabase();
  db.run("UPDATE incidents SET updated_at = ? WHERE id = ?", [updatedAt, id]);
  return getIncidentById(id);
}

export async function setIncidentStatus(input: {
  id: number;
  status: IncidentStatus;
  resolvedAt: string | null;
  updatedAt: string;
}): Promise<IncidentRow | null> {
  const db = await getDatabase();
  db.run("UPDATE incidents SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?", [
    input.status,
    input.resolvedAt,
    input.updatedAt,
    input.id,
  ]);
  return getIncidentById(input.id);
}

export async function countIncidentsByStatus(): Promise<Record<IncidentStatus, number>> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT status, COUNT(*) as count FROM incidents GROUP BY status");
  const rows = rowsFromStatement<{ status: IncidentStatus; count: number }>(statement);
  const counts: Record<IncidentStatus, number> = { open: 0, investigating: 0, monitoring: 0, resolved: 0 };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

export async function countIncidentsBySeverity(): Promise<Record<IncidentSeverity, number>> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT severity, COUNT(*) as count FROM incidents GROUP BY severity");
  const rows = rowsFromStatement<{ severity: IncidentSeverity; count: number }>(statement);
  const counts: Record<IncidentSeverity, number> = { sev1: 0, sev2: 0, sev3: 0 };
  for (const row of rows) counts[row.severity] = row.count;
  return counts;
}

export async function countTotalIncidents(): Promise<number> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT COUNT(*) as count FROM incidents");
  const rows = rowsFromStatement<{ count: number }>(statement);
  return rows[0]?.count ?? 0;
}

export async function countUnassignedUnresolvedIncidents(): Promise<number> {
  const db = await getDatabase();
  const statement = db.prepare(
    "SELECT COUNT(*) as count FROM incidents WHERE assigned_responder_id IS NULL AND status != 'resolved'",
  );
  const rows = rowsFromStatement<{ count: number }>(statement);
  return rows[0]?.count ?? 0;
}
