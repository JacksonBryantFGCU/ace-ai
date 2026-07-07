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

test("PATCH /tasks/:id/status rejects invalid ids and missing tasks", async () => {
  const invalid = await request(app).patch("/tasks/abc/status").send({ status: "done" });
  const missing = await request(app).patch("/tasks/999/status").send({ status: "done" });

  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid task id" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Task not found" });
});

test("PATCH /tasks/:id/status validates the request body", async () => {
  const missingStatus = await request(app).patch("/tasks/1/status").send({});
  const invalidStatus = await request(app).patch("/tasks/1/status").send({ status: "blocked" });

  expect(missingStatus.status).toBe(400);
  expect(missingStatus.body).toEqual({ error: "Status is required" });
  expect(invalidStatus.status).toBe(400);
  expect(invalidStatus.body).toEqual({ error: "Invalid status" });
});

test("PATCH /tasks/:id/status updates only the status and returns the updated task", async () => {
  const res = await request(app).patch("/tasks/1/status").send({ status: "done" });

  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    task: {
      id: 1,
      title: "Write project brief",
      status: "done",
      priority: 2,
      created_at: "2025-01-10T09:00:00.000Z",
    },
  });
  expect(db.get("SELECT status FROM tasks WHERE id = ?", [1])).toEqual({ status: "done" });
});

test("GET /tasks/summary returns counts for all statuses", async () => {
  const res = await request(app).get("/tasks/summary");

  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    summary: {
      todo: 2,
      in_progress: 1,
      done: 2,
    },
  });
});

test("GET /tasks/summary includes zero-count statuses and reflects updates", async () => {
  await request(app).patch("/tasks/1/status").send({ status: "done" });
  await request(app).patch("/tasks/4/status").send({ status: "done" });

  const res = await request(app).get("/tasks/summary");

  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    summary: {
      todo: 0,
      in_progress: 1,
      done: 4,
    },
  });
});

test("the completed API preserves filtering and sorting after updates", async () => {
  await request(app).patch("/tasks/1/status").send({ status: "done" });

  const doneByCreatedAt = await request(app).get("/tasks?status=done&sort=created_at");

  expect(doneByCreatedAt.status).toBe(200);
  expect(doneByCreatedAt.body.tasks.map((task: { id: number }) => task.id)).toEqual([5, 3, 1]);
});
