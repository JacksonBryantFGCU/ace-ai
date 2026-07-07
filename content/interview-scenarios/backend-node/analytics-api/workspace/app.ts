import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement POST /events with validation, JSON properties, and idempotency.
// TODO Step 2: implement GET /analytics/events and GET /analytics/daily-active-users.
// TODO Step 3: implement GET /analytics/funnel.

export default app;
