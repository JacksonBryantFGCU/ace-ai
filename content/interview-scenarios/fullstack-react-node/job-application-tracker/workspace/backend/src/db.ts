import initSqlJs from "sql.js";

export type ApplicationStatus = "draft" | "applied" | "interviewing" | "offer" | "rejected";
export type ApplicationSource = "company_site" | "linkedin" | "referral" | "other";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "draft",
  "applied",
  "interviewing",
  "offer",
  "rejected",
];
export const APPLICATION_SOURCES: ApplicationSource[] = ["company_site", "linkedin", "referral", "other"];

export interface ApplicationRow {
  id: number;
  company: string;
  role: string;
  location: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  notes: string | null;
  applied_at: string;
  updated_at: string;
}

export type ApplicationSummary = Record<ApplicationStatus, number> & { total: number };

/**
 * Deterministic seed data. Covers every status (including one with zero
 * applications — "offer" — so summary zero-fill is meaningfully exercised),
 * every source, remote and in-person locations, and applications both with
 * and without notes. Ids are NOT in applied_at order, so the default
 * ordering (applied_at DESC, id ASC) is meaningfully exercised.
 */
const SEED_APPLICATIONS = [
  {
    id: 1,
    company: "Amazon",
    role: "SDE Intern",
    location: "Seattle",
    status: "draft",
    source: "company_site",
    notes: "Need to finish application.",
    applied_at: "2025-01-03T09:00:00.000Z",
    updated_at: "2025-01-03T09:00:00.000Z",
  },
  {
    id: 2,
    company: "Stripe",
    role: "Frontend Engineer Intern",
    location: "Remote",
    status: "applied",
    source: "company_site",
    notes: "Submitted through careers page.",
    applied_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 3,
    company: "Meta",
    role: "Product Intern",
    location: "Remote",
    status: "rejected",
    source: "linkedin",
    notes: null,
    applied_at: "2025-01-06T09:00:00.000Z",
    updated_at: "2025-01-06T09:00:00.000Z",
  },
  {
    id: 4,
    company: "Google",
    role: "SWE Intern",
    location: "Mountain View",
    status: "interviewing",
    source: "referral",
    notes: "Phone screen done.",
    applied_at: "2025-01-08T09:00:00.000Z",
    updated_at: "2025-01-08T09:00:00.000Z",
  },
  {
    id: 5,
    company: "Notion",
    role: "Frontend Intern",
    location: "New York",
    status: "applied",
    source: "referral",
    notes: "Referred by Alex.",
    applied_at: "2025-01-05T09:00:00.000Z",
    updated_at: "2025-01-05T09:00:00.000Z",
  },
  {
    id: 6,
    company: "Airbnb",
    role: "Backend Engineer Intern",
    location: "San Francisco",
    status: "rejected",
    source: "company_site",
    notes: "Not moving forward.",
    applied_at: "2025-01-07T09:00:00.000Z",
    updated_at: "2025-01-07T09:00:00.000Z",
  },
  {
    id: 7,
    company: "Linear",
    role: "Software Engineer Intern",
    location: "Remote",
    status: "draft",
    source: "linkedin",
    notes: null,
    applied_at: "2025-01-09T09:00:00.000Z",
    updated_at: "2025-01-09T09:00:00.000Z",
  },
  {
    id: 8,
    company: "Figma",
    role: "Design Engineer Intern",
    location: "Remote",
    status: "interviewing",
    source: "other",
    notes: null,
    applied_at: "2025-01-04T09:00:00.000Z",
    updated_at: "2025-01-04T09:00:00.000Z",
  },
] satisfies ApplicationRow[];

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
      CREATE TABLE applications (
        id INTEGER PRIMARY KEY,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL,
        source TEXT NOT NULL,
        notes TEXT,
        applied_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const insert = seeded.prepare(`
      INSERT INTO applications (id, company, role, location, status, source, notes, applied_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      seeded.run("BEGIN");
      for (const application of SEED_APPLICATIONS) {
        insert.run([
          application.id,
          application.company,
          application.role,
          application.location,
          application.status,
          application.source,
          application.notes,
          application.applied_at,
          application.updated_at,
        ]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insert.free();
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

export interface ApplicationFilters {
  status?: ApplicationStatus;
  source?: ApplicationSource;
}

export async function listApplications(filters: ApplicationFilters = {}): Promise<ApplicationRow[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const statement = db.prepare(`SELECT * FROM applications${where} ORDER BY applied_at DESC, id ASC`);
  if (params.length > 0) statement.bind(params);
  return rowsFromStatement<ApplicationRow>(statement);
}

export async function getApplicationById(id: number): Promise<ApplicationRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM applications WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<ApplicationRow>(statement);
  return rows[0] ?? null;
}

export async function createApplication(input: {
  company: string;
  role: string;
  location: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  notes: string | null;
  applied_at: string;
}): Promise<ApplicationRow> {
  const db = await getDatabase();
  db.run(
    `INSERT INTO applications (company, role, location, status, source, notes, applied_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.company,
      input.role,
      input.location,
      input.status,
      input.source,
      input.notes,
      input.applied_at,
      input.applied_at,
    ],
  );
  const statement = db.prepare("SELECT * FROM applications WHERE id = last_insert_rowid()");
  const rows = rowsFromStatement<ApplicationRow>(statement);
  return rows[0]!;
}

export async function updateApplication(input: {
  id: number;
  status: ApplicationStatus;
  notes: string | null;
  updated_at: string;
}): Promise<ApplicationRow | null> {
  const db = await getDatabase();
  db.run("UPDATE applications SET status = ?, notes = ?, updated_at = ? WHERE id = ?", [
    input.status,
    input.notes,
    input.updated_at,
    input.id,
  ]);
  return getApplicationById(input.id);
}

export async function getApplicationSummary(): Promise<ApplicationSummary> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT status, COUNT(*) AS count FROM applications GROUP BY status");
  const rows = rowsFromStatement<{ status: ApplicationStatus; count: number }>(statement);
  const counts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0])) as Record<
    ApplicationStatus,
    number
  >;
  let total = 0;
  for (const row of rows) {
    counts[row.status] = row.count;
    total += row.count;
  }
  return { ...counts, total };
}
