import app from "../workspace/app";

const SEEDED_TASKS = [
  {
    id: 1,
    title: "Write project brief",
    status: "todo",
    priority: 2,
    created_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    title: "Review pull request",
    status: "in_progress",
    priority: 1,
    created_at: "2025-01-10T10:30:00.000Z",
  },
  {
    id: 3,
    title: "Publish release notes",
    status: "done",
    priority: 3,
    created_at: "2025-01-09T16:45:00.000Z",
  },
  {
    id: 4,
    title: "Plan sprint retro",
    status: "todo",
    priority: 1,
    created_at: "2025-01-11T13:15:00.000Z",
  },
  {
    id: 5,
    title: "Archive completed tickets",
    status: "done",
    priority: 2,
    created_at: "2025-01-08T08:20:00.000Z",
  },
];

test("GET /tasks returns all seeded tasks ordered by id", async () => {
  const res = await request(app).get("/tasks");

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ tasks: SEEDED_TASKS });
});

test("GET /tasks returns a stable JSON response shape", async () => {
  const res = await request(app).get("/tasks");

  expect(res.status).toBe(200);
  expect(Object.prototype.hasOwnProperty.call(res.body, "tasks")).toBe(true);
  expect(Array.isArray(res.body.tasks)).toBe(true);
  expect(res.body.tasks).toHaveLength(5);
});

test("task objects include the required fields", async () => {
  const res = await request(app).get("/tasks");

  for (const task of res.body.tasks) {
    expect(Object.keys(task).sort()).toEqual(["created_at", "id", "priority", "status", "title"]);
    expect(typeof task.id).toBe("number");
    expect(typeof task.title).toBe("string");
    expect(typeof task.status).toBe("string");
    expect(typeof task.priority).toBe("number");
    expect(typeof task.created_at).toBe("string");
  }
});
