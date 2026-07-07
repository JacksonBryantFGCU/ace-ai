import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const VALID_STATUSES = new Set(["todo", "in_progress", "done"]);
const SORT_COLUMNS: Record<string, string> = {
  priority: "priority",
  created_at: "created_at",
};

type Task = {
  id: number;
  title: string;
  status: string;
  priority: number;
  created_at: string;
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTaskId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function findTask(id: number) {
  return db.get<Task>("SELECT id, title, status, priority, created_at FROM tasks WHERE id = ?", [id]);
}

app.get("/tasks", (req, res) => {
  const status = queryValue(req.query.status);
  const sort = queryValue(req.query.sort);

  if (status && !VALID_STATUSES.has(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  if (sort && !SORT_COLUMNS[sort]) {
    res.status(400).json({ error: "Invalid sort" });
    return;
  }

  const params: unknown[] = [];
  const where = status ? "WHERE status = ?" : "";
  if (status) params.push(status);

  const orderColumn = sort ? SORT_COLUMNS[sort] : "id";
  const tasks = db.all<Task>(
    `SELECT id, title, status, priority, created_at FROM tasks ${where} ORDER BY ${orderColumn}, id`,
    params,
  );

  res.status(200).json({ tasks });
});

app.get("/tasks/summary", (_req, res) => {
  const rows = db.all<{ status: string; count: number }>(
    "SELECT status, COUNT(*) AS count FROM tasks GROUP BY status",
  );
  const summary = { todo: 0, in_progress: 0, done: 0 };

  for (const row of rows) {
    if (row.status === "todo" || row.status === "in_progress" || row.status === "done") {
      summary[row.status] = row.count;
    }
  }

  res.status(200).json({ summary });
});

app.patch("/tasks/:id/status", (req, res) => {
  const id = parseTaskId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const body = req.body as { status?: unknown };
  if (body.status === undefined) {
    res.status(400).json({ error: "Status is required" });
    return;
  }

  if (typeof body.status !== "string" || !VALID_STATUSES.has(body.status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  if (!findTask(id)) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  db.run("UPDATE tasks SET status = ? WHERE id = ?", [body.status, id]);
  res.status(200).json({ task: findTask(id) });
});

export default app;
