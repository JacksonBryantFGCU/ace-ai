import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

function parseNoteId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function nowIso() {
  return new Date().toISOString();
}

function findNote(id: number) {
  return db.get("SELECT id, title, content, created_at FROM notes WHERE id = ?", [id]);
}

app.get("/notes", (_req, res) => {
  const notes = db.all("SELECT id, title, content, created_at FROM notes ORDER BY id");
  res.status(200).json(notes);
});

app.get("/notes/:id", (req, res) => {
  const id = parseNoteId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid note id" });
    return;
  }

  const note = findNote(id);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.status(200).json(note);
});

app.post("/notes", (req, res) => {
  const body = req.body as { title?: unknown; content?: unknown };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }

  const result = db.run(
    "INSERT INTO notes (title, content, created_at) VALUES (?, ?, ?)",
    [title, content, nowIso()],
  );
  const note = findNote(result.lastInsertRowid);

  res.status(201).json(note);
});

app.delete("/notes/:id", (req, res) => {
  const id = parseNoteId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid note id" });
    return;
  }

  if (!findNote(id)) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  db.run("DELETE FROM notes WHERE id = ?", [id]);
  res.status(204).end();
});

export default app;
