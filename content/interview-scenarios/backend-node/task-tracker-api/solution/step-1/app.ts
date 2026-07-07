import express from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

app.get("/tasks", (_req, res) => {
  const tasks = db.all("SELECT id, title, status, priority, created_at FROM tasks ORDER BY id");
  res.status(200).json({ tasks });
});

export default app;
