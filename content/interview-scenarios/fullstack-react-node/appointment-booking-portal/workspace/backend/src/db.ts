import initSqlJs from "sql.js";

export type StaffRole = "stylist" | "consultant" | "trainer" | "therapist";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export const STAFF_ROLES: StaffRole[] = ["stylist", "consultant", "trainer", "therapist"];
export const APPOINTMENT_STATUSES: AppointmentStatus[] = ["scheduled", "completed", "cancelled"];

export interface ServiceRow {
  id: number;
  name: string;
  duration_minutes: number;
  price_cents: number;
  is_active: number;
  created_at: string;
}

export interface StaffRow {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  is_active: number;
  created_at: string;
}

export interface AppointmentRow {
  id: number;
  service_id: number;
  staff_id: number;
  customer_name: string;
  customer_email: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentService {
  id: number;
  name: string;
  duration_minutes: number;
  price_cents: number;
}

export interface AppointmentStaffMember {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
}

export interface AppointmentWithDetails {
  id: number;
  service: AppointmentService;
  staff: AppointmentStaffMember;
  customer_name: string;
  customer_email: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Deterministic seed data. Two inactive records (one service, one staff member)
 * so "active only" filtering is meaningfully exercised; every appointment status;
 * appointments spread across five different days; appointment ids 1 and 6 share
 * the exact same staff member and start/end time (id 6 is cancelled, id 1 is
 * scheduled) so the "cancelled appointments don't block time" rule — and the
 * starts_at/id ordering tiebreak — are both exercised by the seed itself.
 */
const SEED_SERVICES = [
  { id: 1, name: "Initial Consultation", duration_minutes: 60, price_cents: 7500, is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Haircut & Style", duration_minutes: 45, price_cents: 6000, is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Personal Training Session", duration_minutes: 60, price_cents: 9000, is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 4, name: "Legacy Package", duration_minutes: 30, price_cents: 3000, is_active: 0, created_at: "2025-01-01T09:00:00.000Z" },
] satisfies ServiceRow[];

const SEED_STAFF = [
  { id: 1, name: "Alex Rivera", email: "alex@example.com", role: "consultant", is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Priya Shah", email: "priya@example.com", role: "stylist", is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Jordan Lee", email: "jordan@example.com", role: "trainer", is_active: 1, created_at: "2025-01-01T09:00:00.000Z" },
  { id: 4, name: "Nina Torres", email: "nina@example.com", role: "therapist", is_active: 0, created_at: "2025-01-01T09:00:00.000Z" },
] satisfies StaffRow[];

const SEED_APPOINTMENTS = [
  { id: 1, service_id: 1, staff_id: 1, customer_name: "Morgan Diaz", customer_email: "morgan@example.com", starts_at: "2025-02-10T15:00:00.000Z", ends_at: "2025-02-10T16:00:00.000Z", status: "scheduled", notes: "First visit.", created_at: "2025-01-10T09:00:00.000Z", updated_at: "2025-01-10T09:00:00.000Z" },
  { id: 2, service_id: 2, staff_id: 2, customer_name: "Taylor Brooks", customer_email: "taylor@example.com", starts_at: "2025-02-10T17:00:00.000Z", ends_at: "2025-02-10T17:45:00.000Z", status: "scheduled", notes: null, created_at: "2025-01-10T09:05:00.000Z", updated_at: "2025-01-10T09:05:00.000Z" },
  { id: 3, service_id: 3, staff_id: 3, customer_name: "Riley Chen", customer_email: "riley@example.com", starts_at: "2025-02-11T14:00:00.000Z", ends_at: "2025-02-11T15:00:00.000Z", status: "completed", notes: "Great session.", created_at: "2025-01-09T09:00:00.000Z", updated_at: "2025-01-09T09:00:00.000Z" },
  { id: 4, service_id: 1, staff_id: 1, customer_name: "Jamie Fox", customer_email: "jamie@example.com", starts_at: "2025-02-08T13:00:00.000Z", ends_at: "2025-02-08T14:00:00.000Z", status: "completed", notes: null, created_at: "2025-01-08T09:00:00.000Z", updated_at: "2025-01-08T09:00:00.000Z" },
  { id: 5, service_id: 2, staff_id: 2, customer_name: "Drew Bailey", customer_email: "drew@example.com", starts_at: "2025-02-11T16:00:00.000Z", ends_at: "2025-02-11T16:45:00.000Z", status: "cancelled", notes: "Rescheduling needed.", created_at: "2025-01-09T09:10:00.000Z", updated_at: "2025-01-09T09:10:00.000Z" },
  { id: 6, service_id: 3, staff_id: 1, customer_name: "Avery Kim", customer_email: "avery@example.com", starts_at: "2025-02-10T15:00:00.000Z", ends_at: "2025-02-10T16:00:00.000Z", status: "cancelled", notes: null, created_at: "2025-01-10T09:15:00.000Z", updated_at: "2025-01-10T09:15:00.000Z" },
  { id: 7, service_id: 1, staff_id: 3, customer_name: "Reese Cole", customer_email: "reese@example.com", starts_at: "2025-02-12T18:00:00.000Z", ends_at: "2025-02-12T19:00:00.000Z", status: "scheduled", notes: "Referred by a friend.", created_at: "2025-01-11T09:00:00.000Z", updated_at: "2025-01-11T09:00:00.000Z" },
  { id: 8, service_id: 2, staff_id: 1, customer_name: "Skyler Vance", customer_email: "skyler@example.com", starts_at: "2025-02-09T12:00:00.000Z", ends_at: "2025-02-09T12:45:00.000Z", status: "scheduled", notes: null, created_at: "2025-01-07T09:00:00.000Z", updated_at: "2025-01-07T09:00:00.000Z" },
] satisfies AppointmentRow[];

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
        duration_minutes INTEGER NOT NULL,
        price_cents INTEGER NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE staff (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE appointments (
        id INTEGER PRIMARY KEY,
        service_id INTEGER NOT NULL,
        staff_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      );
    `);

    const insertService = seeded.prepare(
      "INSERT INTO services (id, name, duration_minutes, price_cents, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertStaff = seeded.prepare(
      "INSERT INTO staff (id, name, email, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertAppointment = seeded.prepare(`
      INSERT INTO appointments (id, service_id, staff_id, customer_name, customer_email, starts_at, ends_at, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      seeded.run("BEGIN");
      for (const service of SEED_SERVICES) {
        insertService.run([
          service.id,
          service.name,
          service.duration_minutes,
          service.price_cents,
          service.is_active,
          service.created_at,
        ]);
      }
      for (const member of SEED_STAFF) {
        insertStaff.run([member.id, member.name, member.email, member.role, member.is_active, member.created_at]);
      }
      for (const appointment of SEED_APPOINTMENTS) {
        insertAppointment.run([
          appointment.id,
          appointment.service_id,
          appointment.staff_id,
          appointment.customer_name,
          appointment.customer_email,
          appointment.starts_at,
          appointment.ends_at,
          appointment.status,
          appointment.notes,
          appointment.created_at,
          appointment.updated_at,
        ]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insertService.free();
      insertStaff.free();
      insertAppointment.free();
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

export async function listServices(options: { activeOnly?: boolean } = {}): Promise<ServiceRow[]> {
  const db = await getDatabase();
  const where = options.activeOnly ? " WHERE is_active = 1" : "";
  const statement = db.prepare(`SELECT * FROM services${where} ORDER BY id ASC`);
  return rowsFromStatement<ServiceRow>(statement);
}

export async function listStaff(options: { activeOnly?: boolean } = {}): Promise<StaffRow[]> {
  const db = await getDatabase();
  const where = options.activeOnly ? " WHERE is_active = 1" : "";
  const statement = db.prepare(`SELECT * FROM staff${where} ORDER BY id ASC`);
  return rowsFromStatement<StaffRow>(statement);
}

export async function getServiceById(id: number): Promise<ServiceRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM services WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<ServiceRow>(statement);
  return rows[0] ?? null;
}

export async function getStaffById(id: number): Promise<StaffRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM staff WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<StaffRow>(statement);
  return rows[0] ?? null;
}

export async function getAppointmentById(id: number): Promise<AppointmentRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM appointments WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<AppointmentRow>(statement);
  return rows[0] ?? null;
}

interface AppointmentDetailRow {
  id: number;
  service_id: number;
  service_name: string;
  service_duration_minutes: number;
  service_price_cents: number;
  staff_id: number;
  staff_name: string;
  staff_email: string;
  staff_role: StaffRole;
  customer_name: string;
  customer_email: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toAppointmentWithDetails(row: AppointmentDetailRow): AppointmentWithDetails {
  return {
    id: row.id,
    service: {
      id: row.service_id,
      name: row.service_name,
      duration_minutes: row.service_duration_minutes,
      price_cents: row.service_price_cents,
    },
    staff: {
      id: row.staff_id,
      name: row.staff_name,
      email: row.staff_email,
      role: row.staff_role,
    },
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const APPOINTMENT_DETAIL_SELECT = `
  SELECT
    a.id AS id,
    a.service_id AS service_id, s.name AS service_name,
    s.duration_minutes AS service_duration_minutes, s.price_cents AS service_price_cents,
    a.staff_id AS staff_id, m.name AS staff_name, m.email AS staff_email, m.role AS staff_role,
    a.customer_name AS customer_name, a.customer_email AS customer_email,
    a.starts_at AS starts_at, a.ends_at AS ends_at, a.status AS status, a.notes AS notes,
    a.created_at AS created_at, a.updated_at AS updated_at
  FROM appointments a
  JOIN services s ON a.service_id = s.id
  JOIN staff m ON a.staff_id = m.id
`;

export interface AppointmentFilters {
  staffId?: number;
  status?: AppointmentStatus;
  date?: string;
}

export async function listAppointmentsWithDetails(filters: AppointmentFilters = {}): Promise<AppointmentWithDetails[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters.staffId !== undefined) {
    clauses.push("a.staff_id = ?");
    params.push(String(filters.staffId));
  }
  if (filters.status) {
    clauses.push("a.status = ?");
    params.push(filters.status);
  }
  if (filters.date) {
    clauses.push("date(a.starts_at) = ?");
    params.push(filters.date);
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const statement = db.prepare(`${APPOINTMENT_DETAIL_SELECT}${where} ORDER BY a.starts_at ASC, a.id ASC`);
  if (params.length > 0) statement.bind(params);
  return rowsFromStatement<AppointmentDetailRow>(statement).map(toAppointmentWithDetails);
}

export async function getAppointmentWithDetailsById(id: number): Promise<AppointmentWithDetails | null> {
  const db = await getDatabase();
  const statement = db.prepare(`${APPOINTMENT_DETAIL_SELECT} WHERE a.id = ?`);
  statement.bind([id]);
  const rows = rowsFromStatement<AppointmentDetailRow>(statement);
  return rows[0] ? toAppointmentWithDetails(rows[0]) : null;
}

/** True if staffId has a non-cancelled appointment overlapping [startsAt, endsAt). */
export async function hasConflictingAppointment(
  staffId: number,
  startsAt: string,
  endsAt: string,
): Promise<boolean> {
  const db = await getDatabase();
  const statement = db.prepare(`
    SELECT COUNT(*) AS count FROM appointments
    WHERE staff_id = ?
      AND status != 'cancelled'
      AND starts_at < ?
      AND ends_at > ?
  `);
  statement.bind([staffId, endsAt, startsAt]);
  const rows = rowsFromStatement<{ count: number }>(statement);
  return (rows[0]?.count ?? 0) > 0;
}

export async function createAppointment(input: {
  service_id: number;
  staff_id: number;
  customer_name: string;
  customer_email: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  created_at: string;
}): Promise<AppointmentWithDetails> {
  const db = await getDatabase();
  db.run(
    `INSERT INTO appointments (service_id, staff_id, customer_name, customer_email, starts_at, ends_at, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
    [
      input.service_id,
      input.staff_id,
      input.customer_name,
      input.customer_email,
      input.starts_at,
      input.ends_at,
      input.notes,
      input.created_at,
      input.created_at,
    ],
  );
  const statement = db.prepare(`${APPOINTMENT_DETAIL_SELECT} WHERE a.id = last_insert_rowid()`);
  const rows = rowsFromStatement<AppointmentDetailRow>(statement);
  return toAppointmentWithDetails(rows[0]!);
}

export async function updateAppointmentStatus(input: {
  id: number;
  status: AppointmentStatus;
  updated_at: string;
}): Promise<AppointmentWithDetails | null> {
  const db = await getDatabase();
  db.run("UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?", [
    input.status,
    input.updated_at,
    input.id,
  ]);
  return getAppointmentWithDetailsById(input.id);
}
