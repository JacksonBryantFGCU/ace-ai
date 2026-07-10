import initSqlJs from "sql.js";

export type EventStatus = "scheduled" | "cancelled" | "completed";
export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export const EVENT_STATUSES: EventStatus[] = ["scheduled", "cancelled", "completed"];
export const RSVP_STATUSES: RsvpStatus[] = ["going", "waitlisted", "cancelled"];

export interface EventRow {
  id: number;
  title: string;
  location: string;
  starts_at: string;
  capacity: number;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface EventWithCounts extends EventRow {
  going_count: number;
  waitlisted_count: number;
}

export interface RsvpRow {
  id: number;
  event_id: number;
  attendee_name: string;
  attendee_email: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Deterministic seed data. Covers scheduled/cancelled/completed events, an
 * event with open capacity, an event at capacity, an event with no RSVPs, and
 * RSVPs across every status (going, waitlisted, cancelled). Event ids are NOT
 * in chronological (starts_at) order, so ordering behavior is meaningfully
 * exercised rather than trivially satisfied by id order.
 */
const SEED_EVENTS = [
  {
    id: 1,
    title: "React Meetup",
    location: "FGCU Tech Lab",
    starts_at: "2025-02-10T18:00:00.000Z",
    capacity: 5,
    status: "scheduled",
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    title: "Design Workshop",
    location: "Community Center",
    starts_at: "2025-02-12T17:00:00.000Z",
    capacity: 2,
    status: "scheduled",
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 3,
    title: "Volunteer Cleanup",
    location: "Riverside Park",
    starts_at: "2025-02-05T09:00:00.000Z",
    capacity: 20,
    status: "cancelled",
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 4,
    title: "Book Club",
    location: "Downtown Library",
    starts_at: "2025-01-05T18:00:00.000Z",
    capacity: 10,
    status: "completed",
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
] satisfies EventRow[];

const SEED_RSVPS = [
  // Event 1 (React Meetup, capacity 5): open — 2 going, 0 waitlisted, 1 cancelled.
  { id: 1, event_id: 1, attendee_name: "Alex Rivera", attendee_email: "alex@example.com", status: "going", created_at: "2025-01-10T09:00:00.000Z", updated_at: "2025-01-10T09:00:00.000Z" },
  { id: 2, event_id: 1, attendee_name: "Sam Carter", attendee_email: "sam@example.com", status: "going", created_at: "2025-01-10T09:05:00.000Z", updated_at: "2025-01-10T09:05:00.000Z" },
  { id: 3, event_id: 1, attendee_name: "Priya Shah", attendee_email: "priya@example.com", status: "cancelled", created_at: "2025-01-10T09:10:00.000Z", updated_at: "2025-01-10T09:10:00.000Z" },
  // Event 2 (Design Workshop, capacity 2): full — 2 going, 1 waitlisted.
  { id: 4, event_id: 2, attendee_name: "Jordan Lee", attendee_email: "jordan@example.com", status: "going", created_at: "2025-01-10T09:15:00.000Z", updated_at: "2025-01-10T09:15:00.000Z" },
  { id: 5, event_id: 2, attendee_name: "Morgan Diaz", attendee_email: "morgan@example.com", status: "going", created_at: "2025-01-10T09:20:00.000Z", updated_at: "2025-01-10T09:20:00.000Z" },
  { id: 6, event_id: 2, attendee_name: "Casey Kim", attendee_email: "casey@example.com", status: "waitlisted", created_at: "2025-01-10T09:25:00.000Z", updated_at: "2025-01-10T09:25:00.000Z" },
  // Event 3 (Volunteer Cleanup): no RSVPs.
  // Event 4 (Book Club, capacity 10): completed — 1 going, 1 cancelled.
  { id: 7, event_id: 4, attendee_name: "Taylor Brooks", attendee_email: "taylor@example.com", status: "going", created_at: "2025-01-01T09:00:00.000Z", updated_at: "2025-01-01T09:00:00.000Z" },
  { id: 8, event_id: 4, attendee_name: "Riley Chen", attendee_email: "riley@example.com", status: "cancelled", created_at: "2025-01-01T09:05:00.000Z", updated_at: "2025-01-01T09:05:00.000Z" },
] satisfies RsvpRow[];

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
      CREATE TABLE events (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE rsvps (
        id INTEGER PRIMARY KEY,
        event_id INTEGER NOT NULL,
        attendee_name TEXT NOT NULL,
        attendee_email TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id)
      );
    `);

    const insertEvent = seeded.prepare(`
      INSERT INTO events (id, title, location, starts_at, capacity, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertRsvp = seeded.prepare(`
      INSERT INTO rsvps (id, event_id, attendee_name, attendee_email, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      seeded.run("BEGIN");
      for (const event of SEED_EVENTS) {
        insertEvent.run([
          event.id,
          event.title,
          event.location,
          event.starts_at,
          event.capacity,
          event.status,
          event.created_at,
          event.updated_at,
        ]);
      }
      for (const rsvp of SEED_RSVPS) {
        insertRsvp.run([
          rsvp.id,
          rsvp.event_id,
          rsvp.attendee_name,
          rsvp.attendee_email,
          rsvp.status,
          rsvp.created_at,
          rsvp.updated_at,
        ]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insertEvent.free();
      insertRsvp.free();
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

const EVENT_WITH_COUNTS_SELECT = `
  SELECT e.*,
    (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS going_count,
    (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'waitlisted') AS waitlisted_count
  FROM events e
`;

export interface EventFilters {
  status?: EventStatus;
  /** Applied in-memory after the query, since it depends on the computed going_count/capacity. */
  availability?: "open" | "full";
}

export async function listEvents(filters: EventFilters = {}): Promise<EventWithCounts[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.status) {
    clauses.push("e.status = ?");
    params.push(filters.status);
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const statement = db.prepare(`${EVENT_WITH_COUNTS_SELECT}${where} ORDER BY e.starts_at ASC, e.id ASC`);
  if (params.length > 0) statement.bind(params);
  const rows = rowsFromStatement<EventWithCounts>(statement);

  if (!filters.availability) return rows;
  return rows.filter((row) =>
    filters.availability === "full" ? row.going_count >= row.capacity : row.going_count < row.capacity,
  );
}

export async function getEventWithCountsById(id: number): Promise<EventWithCounts | null> {
  const db = await getDatabase();
  const statement = db.prepare(`${EVENT_WITH_COUNTS_SELECT} WHERE e.id = ?`);
  statement.bind([id]);
  const rows = rowsFromStatement<EventWithCounts>(statement);
  return rows[0] ?? null;
}

export async function listRsvpsForEvent(eventId: number): Promise<RsvpRow[]> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM rsvps WHERE event_id = ? ORDER BY created_at ASC, id ASC");
  statement.bind([eventId]);
  return rowsFromStatement<RsvpRow>(statement);
}

export async function getRsvpById(id: number): Promise<RsvpRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM rsvps WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<RsvpRow>(statement);
  return rows[0] ?? null;
}

/** Count non-cancelled RSVPs for this event/email pair (used for the duplicate-RSVP rule). */
export async function countActiveRsvpForEmail(eventId: number, email: string): Promise<number> {
  const db = await getDatabase();
  const statement = db.prepare(
    "SELECT COUNT(*) AS count FROM rsvps WHERE event_id = ? AND attendee_email = ? AND status != 'cancelled'",
  );
  statement.bind([eventId, email]);
  const rows = rowsFromStatement<{ count: number }>(statement);
  return rows[0]?.count ?? 0;
}

export async function createRsvp(input: {
  event_id: number;
  attendee_name: string;
  attendee_email: string;
  status: RsvpStatus;
  created_at: string;
}): Promise<RsvpRow> {
  const db = await getDatabase();
  db.run(
    "INSERT INTO rsvps (event_id, attendee_name, attendee_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [input.event_id, input.attendee_name, input.attendee_email, input.status, input.created_at, input.created_at],
  );
  const statement = db.prepare("SELECT * FROM rsvps WHERE id = last_insert_rowid()");
  const rows = rowsFromStatement<RsvpRow>(statement);
  return rows[0]!;
}

export async function updateRsvpStatus(input: {
  id: number;
  status: RsvpStatus;
  updated_at: string;
}): Promise<RsvpRow | null> {
  const db = await getDatabase();
  db.run("UPDATE rsvps SET status = ?, updated_at = ? WHERE id = ?", [input.status, input.updated_at, input.id]);
  return getRsvpById(input.id);
}
