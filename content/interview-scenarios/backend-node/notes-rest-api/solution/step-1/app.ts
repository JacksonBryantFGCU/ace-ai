import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

function parseNoteId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
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

  const note = db.get("SELECT id, title, content, created_at FROM notes WHERE id = ?", [id]);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.status(200).json(note);
});

export default app;
