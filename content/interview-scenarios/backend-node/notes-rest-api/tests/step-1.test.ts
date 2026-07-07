import app from "../workspace/app";

test("GET /notes returns all seeded notes ordered by id", async () => {
  const res = await request(app).get("/notes");

  expect(res.status).toBe(200);
  expect(res.body).toEqual([
    {
      id: 1,
      title: "Release checklist",
      content: "Confirm database migrations and API smoke tests before deploy.",
      created_at: "2026-01-10T09:00:00.000Z",
    },
    {
      id: 2,
      title: "Interview prep",
      content: "Review REST status codes and SQLite parameterized queries.",
      created_at: "2026-01-11T14:30:00.000Z",
    },
  ]);
});

test("GET /notes/:id returns one note", async () => {
  const res = await request(app).get("/notes/2");

  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    id: 2,
    title: "Interview prep",
    content: "Review REST status codes and SQLite parameterized queries.",
    created_at: "2026-01-11T14:30:00.000Z",
  });
});

test("GET /notes/:id returns 404 for a missing note", async () => {
  const res = await request(app).get("/notes/999");

  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: "Note not found" });
});
