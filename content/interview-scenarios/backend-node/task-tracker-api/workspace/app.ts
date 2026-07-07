import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement GET /tasks with deterministic SQLite-backed ordering.
// TODO Step 2: add validated status filtering and sort query support to GET /tasks.
// TODO Step 3: implement PATCH /tasks/:id/status and GET /tasks/summary.

export default app;
