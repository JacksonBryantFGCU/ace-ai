import app from "../workspace/app";
import { db } from "../workspace/db";

function resetTasks() {
  db.exec("DELETE FROM tasks;");
  db.run(
    "INSERT INTO tasks (id, title, status, priority, created_at) VALUES (?, ?, ?, ?, ?)",
    [1, "Write project brief", "todo", 2, "2025-01-10T09:00:00.000Z"],
  );
  db.run(
    "INSERT INTO tasks (id, title, status, priority, created_at) VALUES (?, ?, ?, ?, ?)",
    [2, "Review pull request", "in_progress", 1, "2025-01-10T10:30:00.000Z"],
  );
  db.run(
    "INSERT INTO tasks (id, title, status, priority, created_at) VALUES (?, ?, ?, ?, ?)",
    [3, "Publish release notes", "done", 3, "2025-01-09T16:45:00.000Z"],
  );
  db.run(
    "INSERT INTO tasks (id, title, status, priority, created_at) VALUES (?, ?, ?, ?, ?)",
    [4, "Plan sprint retro", "todo", 1, "2025-01-11T13:15:00.000Z"],
  );
  db.run(
    "INSERT INTO tasks (id, title, status, priority, created_at) VALUES (?, ?, ?, ?, ?)",
    [5, "Archive completed tickets", "done", 2, "2025-01-08T08:20:00.000Z"],
  );
}

beforeEach(() => {
  resetTasks();
});

test("GET /tasks keeps returning all tasks when no filters are provided", async () => {
  const res = await request(app).get("/tasks");

  expect(res.status).toBe(200);
  expect(res.body.tasks.map((task: { id: number }) => task.id)).toEqual([1, 2, 3, 4, 5]);
});

test("GET /tasks filters by each valid status", async () => {
  const todo = await request(app).get("/tasks?status=todo");
  const inProgress = await request(app).get("/tasks?status=in_progress");
  const done = await request(app).get("/tasks?status=done");

  expect(todo.status).toBe(200);
  expect(todo.body.tasks.map((task: { id: number }) => task.id)).toEqual([1, 4]);
  expect(inProgress.status).toBe(200);
  expect(inProgress.body.tasks.map((task: { id: number }) => task.id)).toEqual([2]);
  expect(done.status).toBe(200);
  expect(done.body.tasks.map((task: { id: number }) => task.id)).toEqual([3, 5]);
});

test("GET /tasks rejects invalid status filters", async () => {
  const res = await request(app).get("/tasks?status=blocked");

  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Invalid status" });
});

test("GET /tasks sorts by priority and created_at deterministically", async () => {
  const byPriority = await request(app).get("/tasks?sort=priority");
  const byCreatedAt = await request(app).get("/tasks?sort=created_at");

  expect(byPriority.status).toBe(200);
  expect(byPriority.body.tasks.map((task: { id: number }) => task.id)).toEqual([2, 4, 1, 5, 3]);
  expect(byCreatedAt.status).toBe(200);
  expect(byCreatedAt.body.tasks.map((task: { id: number }) => task.id)).toEqual([5, 3, 1, 2, 4]);
});

test("GET /tasks rejects invalid sort values", async () => {
  const res = await request(app).get("/tasks?sort=title");

  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Invalid sort" });
});

test("GET /tasks supports combined status filtering and sorting", async () => {
  const res = await request(app).get("/tasks?status=todo&sort=priority");

  expect(res.status).toBe(200);
  expect(res.body.tasks.map((task: { id: number }) => task.id)).toEqual([4, 1]);
});
