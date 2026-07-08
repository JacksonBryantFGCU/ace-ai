import initSqlJs from "sql.js";

export type FeedbackStatus = "new" | "reviewing" | "resolved";

export interface FeedbackRow {
  id: number;
  customer_name: string;
  message: string;
  status: FeedbackStatus;
  response: string | null;
  created_at: string;
  updated_at: string;
}

const SEED_FEEDBACK = [
  {
    id: 1,
    customer_name: "Alex Rivera",
    message: "The dashboard is slow when I open weekly reports.",
    status: "new",
    response: null,
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    customer_name: "Sam Carter",
    message: "I cannot find the export button anymore.",
    status: "reviewing",
    response: "The product team is checking the new navigation.",
    created_at: "2025-01-10T10:00:00.000Z",
    updated_at: "2025-01-10T10:30:00.000Z",
  },
  {
    id: 3,
    customer_name: "Priya Shah",
    message: "The new onboarding checklist helped our team ship faster.",
    status: "resolved",
    response: "Thanks for the feedback. We shared this with the onboarding team.",
    created_at: "2025-01-11T09:00:00.000Z",
    updated_at: "2025-01-11T11:00:00.000Z",
  },
] satisfies FeedbackRow[];

let sqlModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let database: initSqlJs.Database | null = null;

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
  database = new SQL.Database();
  database.run(`
    CREATE TABLE feedback (
      id INTEGER PRIMARY KEY,
      customer_name TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      response TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const insert = database.prepare(`
    INSERT INTO feedback (id, customer_name, message, status, response, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  try {
    for (const item of SEED_FEEDBACK) {
      insert.run([
        item.id,
        item.customer_name,
        item.message,
        item.status,
        item.response,
        item.created_at,
        item.updated_at,
      ]);
    }
  } finally {
    insert.free();
  }
}

export async function getDatabase() {
  if (!database) await resetDatabase();
  return database!;
}

export async function listFeedback(status?: FeedbackStatus): Promise<FeedbackRow[]> {
  const db = await getDatabase();
  const statement = status
    ? db.prepare("SELECT * FROM feedback WHERE status = ? ORDER BY created_at ASC, id ASC")
    : db.prepare("SELECT * FROM feedback ORDER BY created_at ASC, id ASC");
  if (status) statement.bind([status]);
  return rowsFromStatement<FeedbackRow>(statement);
}

export async function getFeedbackById(id: number): Promise<FeedbackRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM feedback WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<FeedbackRow>(statement);
  return rows[0] ?? null;
}

export async function updateFeedback(input: {
  id: number;
  status: FeedbackStatus;
  response: string | null;
  updated_at: string;
}): Promise<FeedbackRow | null> {
  const db = await getDatabase();
  db.run(
    "UPDATE feedback SET status = ?, response = ?, updated_at = ? WHERE id = ?",
    [input.status, input.response, input.updated_at, input.id],
  );
  return getFeedbackById(input.id);
}
