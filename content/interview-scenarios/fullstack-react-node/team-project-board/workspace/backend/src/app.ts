import express from "express";
import { listMembers, listProjects, listTasksWithDetails, resetDatabase } from "./db";

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

app.get("/board", async (_req, res) => {
  // TODO (Step 1): fetch projects with listProjects(), members with
  // listMembers(), and tasks with listTasksWithDetails(), and respond with
  // { projects, members, tasks }. listTasksWithDetails() already joins in the
  // project name and assignee, and returns them in the documented order.
  res.json({ projects: [], members: [], tasks: [] });
});

// TODO (Step 2): support GET /board?project_id=<id> and
// GET /board?assignee_id=<id>, validating each filter (invalid id vs. missing
// project/member are different errors). Also add GET /board/summary (counts by
// status and priority, including zero, for the same filters) and POST /tasks to
// create a task — validate the project exists and is active, the assignee (if
// given) exists, the title, description, priority, and due date; a new task
// always starts in the todo status.

// TODO (Step 3): support PATCH /tasks/:id/status to move a task. Validate the id,
// that the task exists, that status is present and valid, and enforce the
// workflow: todo -> in_progress -> review -> done, with review -> in_progress as
// the only backward move. Everything else (including a no-op) is invalid.

export default app;
