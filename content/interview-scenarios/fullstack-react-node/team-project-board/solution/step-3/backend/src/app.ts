import express from "express";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_STATUS_TRANSITIONS,
  createTask,
  getBoardSummary,
  getMemberById,
  getProjectById,
  getTaskById,
  listMembers,
  listProjects,
  listTasksWithDetails,
  resetDatabase,
  updateTaskStatus,
  type TaskPriority,
  type TaskStatus,
} from "./db";

const VALID_PRIORITIES = new Set<TaskPriority>(TASK_PRIORITIES);
const VALID_STATUSES = new Set<TaskStatus>(TASK_STATUSES);
const DESCRIPTION_MAX_LENGTH = 500;

function parseId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parsePriority(value: unknown): TaskPriority | null {
  return typeof value === "string" && VALID_PRIORITIES.has(value as TaskPriority) ? (value as TaskPriority) : null;
}

function parseTaskStatus(value: unknown): TaskStatus | null {
  return typeof value === "string" && VALID_STATUSES.has(value as TaskStatus) ? (value as TaskStatus) : null;
}

function parseDueDate(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return { ok: false };
  return { ok: true, value };
}

async function resolveBoardFilters(
  query: Record<string, unknown>,
): Promise<{ ok: true; projectId?: number; assigneeId?: number } | { ok: false; status: number; error: string }> {
  const projectIdParam = query.project_id;
  let projectId: number | undefined;
  if (projectIdParam !== undefined) {
    if (Array.isArray(projectIdParam)) return { ok: false, status: 400, error: "Invalid project id" };
    const id = parseId(projectIdParam);
    if (!id) return { ok: false, status: 400, error: "Invalid project id" };
    const project = await getProjectById(id);
    if (!project) return { ok: false, status: 404, error: "Project not found" };
    projectId = id;
  }

  const assigneeIdParam = query.assignee_id;
  let assigneeId: number | undefined;
  if (assigneeIdParam !== undefined) {
    if (Array.isArray(assigneeIdParam)) return { ok: false, status: 400, error: "Invalid assignee id" };
    const id = parseId(assigneeIdParam);
    if (!id) return { ok: false, status: 400, error: "Invalid assignee id" };
    const member = await getMemberById(id);
    if (!member) return { ok: false, status: 404, error: "Member not found" };
    assigneeId = id;
  }

  return { ok: true, projectId, assigneeId };
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

app.get("/board", async (req, res) => {
  const filters = await resolveBoardFilters(req.query as Record<string, unknown>);
  if (!filters.ok) {
    res.status(filters.status).json({ error: filters.error });
    return;
  }

  const [projects, members, tasks] = await Promise.all([
    listProjects(),
    listMembers(),
    listTasksWithDetails({ projectId: filters.projectId, assigneeId: filters.assigneeId }),
  ]);
  res.json({ projects, members, tasks });
});

app.get("/board/summary", async (req, res) => {
  const filters = await resolveBoardFilters(req.query as Record<string, unknown>);
  if (!filters.ok) {
    res.status(filters.status).json({ error: filters.error });
    return;
  }

  const summary = await getBoardSummary({ projectId: filters.projectId, assigneeId: filters.assigneeId });
  res.json({ summary });
});

app.post("/tasks", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const projectId = parseId(body.project_id);
  if (!projectId) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const project = await getProjectById(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.status === "archived") {
    res.status(400).json({ error: "Project is archived" });
    return;
  }

  let assigneeId: number | null = null;
  if (body.assignee_id !== undefined && body.assignee_id !== null) {
    const parsed = parseId(body.assignee_id);
    if (!parsed) {
      res.status(400).json({ error: "Invalid assignee id" });
      return;
    }
    const member = await getMemberById(parsed);
    if (!member) {
      res.status(404).json({ error: "Assignee not found" });
      return;
    }
    assigneeId = parsed;
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
    res.status(400).json({ error: "Invalid description" });
    return;
  }
  const trimmedDescription = typeof body.description === "string" ? body.description.trim() : "";
  if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
    res.status(400).json({ error: "Description is too long" });
    return;
  }
  const description = trimmedDescription === "" ? null : trimmedDescription;

  const priority = parsePriority(body.priority);
  if (!priority) {
    res.status(400).json({ error: "Invalid priority" });
    return;
  }

  const dueDate = parseDueDate(body.due_date);
  if (!dueDate.ok) {
    res.status(400).json({ error: "Invalid due date" });
    return;
  }

  const task = await createTask({
    project_id: projectId,
    assignee_id: assigneeId,
    title,
    description,
    priority,
    due_date: dueDate.value,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({ task });
});

app.patch("/tasks/:id/status", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const existing = await getTaskById(id);
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body.status === undefined) {
    res.status(400).json({ error: "Status is required" });
    return;
  }

  const status = parseTaskStatus(body.status);
  if (!status) {
    res.status(400).json({ error: "Invalid task status" });
    return;
  }

  const allowedNextStatuses = TASK_STATUS_TRANSITIONS[existing.status];
  if (!allowedNextStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status transition" });
    return;
  }

  const task = await updateTaskStatus({ id, status, updated_at: new Date().toISOString() });
  res.json({ task });
});

export default app;
