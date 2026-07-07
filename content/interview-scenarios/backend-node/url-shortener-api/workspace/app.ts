import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement POST /links, GET /links, and GET /links/:shortCode.
// TODO Step 2: implement GET /r/:shortCode and PATCH /links/:shortCode.
// TODO Step 3: implement GET /links/:shortCode/analytics.

export default app;
