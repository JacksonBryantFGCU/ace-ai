import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement GET /notes and GET /notes/:id.
// TODO Step 2: implement POST /notes with validation and SQLite insertion.
// TODO Step 3: implement DELETE /notes/:id with 204, 404, and 400 responses.

export default app;
