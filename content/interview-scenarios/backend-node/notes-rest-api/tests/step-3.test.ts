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

test("DELETE /notes/:id deletes an existing note and returns 204", async () => {
  const res = await request(app).delete("/notes/1");

  expect(res.status).toBe(204);
  expect(db.get("SELECT id FROM notes WHERE id = ?", [1])).toBeUndefined();

  const detail = await request(app).get("/notes/1");
  expect(detail.status).toBe(404);
  expect(detail.body).toEqual({ error: "Note not found" });
});

test("DELETE /notes/:id returns 404 when the note does not exist", async () => {
  const res = await request(app).delete("/notes/999");

  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: "Note not found" });
  expect(db.get("SELECT COUNT(*) AS count FROM notes")).toEqual({ count: 2 });
});

test("DELETE /notes/:id returns 400 for invalid ids", async () => {
  const res = await request(app).delete("/notes/not-a-number");

  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Invalid note id" });
  expect(db.get("SELECT COUNT(*) AS count FROM notes")).toEqual({ count: 2 });
});

test("the completed API still supports creating and listing notes after a delete", async () => {
  await request(app).delete("/notes/2");
  const created = await request(app).post("/notes").send({
    title: "Replacement note",
    content: "The API should keep working after deletes.",
  });
  const list = await request(app).get("/notes");

  expect(created.status).toBe(201);
  expect(list.status).toBe(200);
  expect(list.body).toHaveLength(2);
  expect(list.body[0].id).toBe(1);
  expect(list.body[1]).toEqual(created.body);
});
