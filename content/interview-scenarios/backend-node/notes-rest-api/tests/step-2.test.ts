import app from "../workspace/app";
import { db } from "../workspace/db";

function resetNotes() {
  db.exec("DELETE FROM notes;");
  db.run(
    "INSERT INTO notes (id, title, content, created_at) VALUES (?, ?, ?, ?)",
    [
      1,
      "Release checklist",
      "Confirm database migrations and API smoke tests before deploy.",
      "2026-01-10T09:00:00.000Z",
    ],
  );
  db.run(
    "INSERT INTO notes (id, title, content, created_at) VALUES (?, ?, ?, ?)",
    [
      2,
      "Interview prep",
      "Review REST status codes and SQLite parameterized queries.",
      "2026-01-11T14:30:00.000Z",
    ],
  );
}

beforeEach(() => {
  resetNotes();
});

test("POST /notes rejects invalid request bodies", async () => {
  const missingTitle = await request(app).post("/notes").send({ content: "Missing title" });
  const blankContent = await request(app).post("/notes").send({ title: "Blank content", content: "   " });

  expect(missingTitle.status).toBe(400);
  expect(missingTitle.body).toEqual({ error: "title and content are required" });
  expect(blankContent.status).toBe(400);
  expect(blankContent.body).toEqual({ error: "title and content are required" });
  expect(db.get("SELECT COUNT(*) AS count FROM notes")).toEqual({ count: 2 });
});

test("POST /notes inserts a note and returns the created row", async () => {
  const res = await request(app).post("/notes").send({
    title: "  New API note  ",
    content: "  Persist me in SQLite.  ",
  });

  expect(res.status).toBe(201);
  expect(res.body.id).toBe(3);
  expect(res.body.title).toBe("New API note");
  expect(res.body.content).toBe("Persist me in SQLite.");
  expect(res.body.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  const row = db.get("SELECT id, title, content, created_at FROM notes WHERE id = ?", [3]);
  expect(row).toEqual(res.body);
});

test("created notes are visible through GET /notes and GET /notes/:id", async () => {
  const created = await request(app).post("/notes").send({
    title: "Read after write",
    content: "The read endpoints should reflect database inserts.",
  });

  const list = await request(app).get("/notes");
  const detail = await request(app).get(`/notes/${created.body.id}`);

  expect(list.status).toBe(200);
  expect(list.body).toHaveLength(3);
  expect(list.body[2]).toEqual(created.body);
  expect(detail.status).toBe(200);
  expect(detail.body).toEqual(created.body);
});
