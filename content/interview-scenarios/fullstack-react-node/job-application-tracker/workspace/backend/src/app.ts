import express from "express";
import { listApplications, resetDatabase } from "./db";

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/__test/reset", async (_req, res) => {
  if (process.env.NODE_ENV !== "test") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await resetDatabase();
  res.json({ ok: true });
});

app.get("/applications", async (_req, res) => {
  // TODO (Step 1): fetch applications with listApplications() and respond with
  // { applications: [...] }. listApplications() already returns them ordered by
  // applied_at descending.
  res.json({ applications: [] });
});

// TODO (Step 2): support GET /applications?status=<status> and
// GET /applications?source=<source>, validating each filter. Also add
// GET /applications/summary returning counts for every status (including zero),
// and POST /applications to create an application — validate company/role/location
// are present, default status to draft and source to other when omitted, trim and
// cap notes at 500 characters (empty becomes null).

// TODO (Step 3): support PATCH /applications/:id to update status and/or notes.
// Validate the id, that the application exists, that only status/notes are sent,
// the status value, and the notes rules from step 2. Return the updated
// application.

export default app;
