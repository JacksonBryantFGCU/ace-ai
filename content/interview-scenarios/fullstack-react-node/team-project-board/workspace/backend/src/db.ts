import initSqlJs from "sql.js";

export type MemberRole = "designer" | "engineer" | "manager";
export type ProjectStatus = "active" | "archived";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export const MEMBER_ROLES: MemberRole[] = ["designer", "engineer", "manager"];
export const PROJECT_STATUSES: ProjectStatus[] = ["active", "archived"];
export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

/** Allowed forward/backward task status transitions. Anything not listed (including a no-op) is invalid. */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["review"],
  review: ["done", "in_progress"],
  done: [],
};

export interface MemberRow {
  id: number;
  name: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

export interface ProjectRow {
  id: number;
  name: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: number;
  project_id: number;
  assignee_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: number;
  name: string;
  email: string;
}

export interface TaskWithDetails {
  id: number;
  project_id: number;
  project_name: string;
  assignee: TaskAssignee | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardSummary {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
}

/**
 * Deterministic seed data. Two active projects and one archived project;
 * four members across every role; tasks covering every status, every
 * priority, assigned and unassigned, and with and without due dates. Task
 * ids are NOT pre-sorted by the board's display order (status, then
 * priority, then due date, then id), so the default ordering is
 * meaningfully exercised rather than trivially satisfied by id order.
 */
const SEED_MEMBERS = [
  { id: 1, name: "Alex Rivera", email: "alex@example.com", role: "designer", created_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Sam Carter", email: "sam@example.com", role: "engineer", created_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Jordan Lee", email: "jordan@example.com", role: "manager", created_at: "2025-01-01T09:00:00.000Z" },
  { id: 4, name: "Casey Kim", email: "casey@example.com", role: "engineer", created_at: "2025-01-01T09:00:00.000Z" },
] satisfies MemberRow[];

const SEED_PROJECTS = [
  {
    id: 1,
    name: "Mobile Redesign",
    status: "active",
    created_at: "2025-01-01T09:00:00.000Z",
    updated_at: "2025-01-01T09:00:00.000Z",
  },
  {
    id: 2,
    name: "API Platform",
    status: "active",
    created_at: "2025-01-01T09:00:00.000Z",
    updated_at: "2025-01-01T09:00:00.000Z",
  },
  {
    id: 3,
    name: "Legacy Migration",
    status: "archived",
    created_at: "2025-01-01T09:00:00.000Z",
    updated_at: "2025-01-01T09:00:00.000Z",
  },
] satisfies ProjectRow[];

const SEED_TASKS = [
  {
    id: 1,
    project_id: 1,
    assignee_id: 1,
    title: "Design onboarding screen",
    description: "Create first-pass mobile onboarding design.",
    status: "todo",
    priority: "high",
    due_date: "2025-02-01T00:00:00.000Z",
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    project_id: 1,
    assignee_id: 2,
    title: "Implement settings route",
    description: "Add backend route and connect UI.",
    status: "in_progress",
    priority: "medium",
    due_date: "2025-02-10T00:00:00.000Z",
    created_at: "2025-01-09T09:00:00.000Z",
    updated_at: "2025-01-09T09:00:00.000Z",
  },
  {
    id: 3,
    project_id: 1,
    assignee_id: null,
    title: "Write onboarding copy",
    description: null,
    status: "todo",
    priority: "low",
    due_date: null,
    created_at: "2025-01-08T09:00:00.000Z",
    updated_at: "2025-01-08T09:00:00.000Z",
  },
  {
    id: 4,
    project_id: 2,
    assignee_id: 3,
    title: "Define rate limit policy",
    description: "Draft policy doc for review.",
    status: "review",
    priority: "high",
    due_date: "2025-01-25T00:00:00.000Z",
    created_at: "2025-01-07T09:00:00.000Z",
    updated_at: "2025-01-07T09:00:00.000Z",
  },
  {
    id: 5,
    project_id: 2,
    assignee_id: 4,
    title: "Add pagination to list endpoint",
    description: "Cursor-based pagination.",
    status: "done",
    priority: "medium",
    due_date: "2025-01-15T00:00:00.000Z",
    created_at: "2025-01-06T09:00:00.000Z",
    updated_at: "2025-01-06T09:00:00.000Z",
  },
  {
    id: 6,
    project_id: 2,
    assignee_id: 2,
    title: "Fix flaky auth test",
    description: null,
    status: "done",
    priority: "low",
    due_date: null,
    created_at: "2025-01-05T09:00:00.000Z",
    updated_at: "2025-01-05T09:00:00.000Z",
  },
  {
    id: 7,
    project_id: 1,
    assignee_id: null,
    title: "Audit accessibility on nav",
    description: "Check color contrast and focus states.",
    status: "in_progress",
    priority: "high",
    due_date: "2025-02-05T00:00:00.000Z",
    created_at: "2025-01-04T09:00:00.000Z",
    updated_at: "2025-01-04T09:00:00.000Z",
  },
  {
    id: 8,
    project_id: 3,
    assignee_id: 1,
    title: "Archive old dashboards",
    description: "Final cleanup before shutdown.",
    status: "done",
    priority: "low",
    due_date: null,
    created_at: "2025-01-03T09:00:00.000Z",
    updated_at: "2025-01-03T09:00:00.000Z",
  },
] satisfies TaskRow[];

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
      CREATE TABLE members (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE projects (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL,
        assignee_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        due_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (assignee_id) REFERENCES members(id)
      );
    `);

    const insertMember = seeded.prepare(
      "INSERT INTO members (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    const insertProject = seeded.prepare(
      "INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    );
    const insertTask = seeded.prepare(`
      INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      seeded.run("BEGIN");
      for (const member of SEED_MEMBERS) {
        insertMember.run([member.id, member.name, member.email, member.role, member.created_at]);
      }
      for (const project of SEED_PROJECTS) {
        insertProject.run([project.id, project.name, project.status, project.created_at, project.updated_at]);
      }
      for (const task of SEED_TASKS) {
        insertTask.run([
          task.id,
          task.project_id,
          task.assignee_id,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.due_date,
          task.created_at,
          task.updated_at,
        ]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insertMember.free();
      insertProject.free();
      insertTask.free();
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

export async function listProjects(): Promise<ProjectRow[]> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM projects ORDER BY id ASC");
  return rowsFromStatement<ProjectRow>(statement);
}

export async function listMembers(): Promise<MemberRow[]> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM members ORDER BY id ASC");
  return rowsFromStatement<MemberRow>(statement);
}

export async function getProjectById(id: number): Promise<ProjectRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM projects WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<ProjectRow>(statement);
  return rows[0] ?? null;
}

export async function getMemberById(id: number): Promise<MemberRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM members WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<MemberRow>(statement);
  return rows[0] ?? null;
}

export async function getTaskById(id: number): Promise<TaskRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM tasks WHERE id = ?");
  statement.bind([id]);
  const rows = rowsFromStatement<TaskRow>(statement);
  return rows[0] ?? null;
}

interface TaskDetailRow {
  id: number;
  project_id: number;
  project_name: string;
  assignee_id: number | null;
  assignee_name: string | null;
  assignee_email: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

function toTaskWithDetails(row: TaskDetailRow): TaskWithDetails {
  return {
    id: row.id,
    project_id: row.project_id,
    project_name: row.project_name,
    assignee:
      row.assignee_id !== null
        ? { id: row.assignee_id, name: row.assignee_name!, email: row.assignee_email! }
        : null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const TASK_DETAIL_SELECT = `
  SELECT
    t.id AS id, t.project_id AS project_id, p.name AS project_name,
    t.assignee_id AS assignee_id, m.name AS assignee_name, m.email AS assignee_email,
    t.title AS title, t.description AS description, t.status AS status, t.priority AS priority,
    t.due_date AS due_date, t.created_at AS created_at, t.updated_at AS updated_at
  FROM tasks t
  JOIN projects p ON t.project_id = p.id
  LEFT JOIN members m ON t.assignee_id = m.id
`;

const TASK_ORDER_BY = `
  ORDER BY
    CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'review' THEN 2 WHEN 'done' THEN 3 ELSE 4 END,
    CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
    t.due_date IS NULL,
    t.due_date ASC,
    t.id ASC
`;

export interface TaskFilters {
  projectId?: number;
  assigneeId?: number;
}

export async function listTasksWithDetails(filters: TaskFilters = {}): Promise<TaskWithDetails[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: number[] = [];

  if (filters.projectId !== undefined) {
    clauses.push("t.project_id = ?");
    params.push(filters.projectId);
  }
  if (filters.assigneeId !== undefined) {
    clauses.push("t.assignee_id = ?");
    params.push(filters.assigneeId);
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const statement = db.prepare(`${TASK_DETAIL_SELECT}${where}${TASK_ORDER_BY}`);
  if (params.length > 0) statement.bind(params);
  return rowsFromStatement<TaskDetailRow>(statement).map(toTaskWithDetails);
}

export async function getTaskWithDetailsById(id: number): Promise<TaskWithDetails | null> {
  const db = await getDatabase();
  const statement = db.prepare(`${TASK_DETAIL_SELECT} WHERE t.id = ?`);
  statement.bind([id]);
  const rows = rowsFromStatement<TaskDetailRow>(statement);
  return rows[0] ? toTaskWithDetails(rows[0]) : null;
}

export async function createTask(input: {
  project_id: number;
  assignee_id: number | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
}): Promise<TaskWithDetails> {
  const db = await getDatabase();
  db.run(
    `INSERT INTO tasks (project_id, assignee_id, title, description, status, priority, due_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'todo', ?, ?, ?, ?)`,
    [
      input.project_id,
      input.assignee_id,
      input.title,
      input.description,
      input.priority,
      input.due_date,
      input.created_at,
      input.created_at,
    ],
  );
  const statement = db.prepare(`${TASK_DETAIL_SELECT} WHERE t.id = last_insert_rowid()`);
  const rows = rowsFromStatement<TaskDetailRow>(statement);
  return toTaskWithDetails(rows[0]!);
}

export async function updateTaskStatus(input: {
  id: number;
  status: TaskStatus;
  updated_at: string;
}): Promise<TaskWithDetails | null> {
  const db = await getDatabase();
  db.run("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?", [input.status, input.updated_at, input.id]);
  return getTaskWithDetailsById(input.id);
}

export async function getBoardSummary(filters: TaskFilters = {}): Promise<BoardSummary> {
  const tasks = await listTasksWithDetails(filters);
  const byStatus = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0])) as Record<TaskStatus, number>;
  const byPriority = Object.fromEntries(TASK_PRIORITIES.map((priority) => [priority, 0])) as Record<
    TaskPriority,
    number
  >;
  for (const task of tasks) {
    byStatus[task.status] += 1;
    byPriority[task.priority] += 1;
  }
  return { total: tasks.length, by_status: byStatus, by_priority: byPriority };
}
