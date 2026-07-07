import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const VALID_STATUSES = new Set(["todo", "in_progress", "done"]);
const SORT_COLUMNS: Record<string, string> = {
  priority: "priority",
  created_at: "created_at",
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  const tasks = db.all(
    `SELECT id, title, status, priority, created_at FROM tasks ${where} ORDER BY ${orderColumn}, id`,
    params,
  );

  res.status(200).json({ tasks });
});

export default app;
