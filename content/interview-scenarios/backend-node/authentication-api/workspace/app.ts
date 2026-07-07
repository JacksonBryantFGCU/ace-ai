import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement POST /auth/register with validation, password hashing, and session creation.
// TODO Step 2: implement POST /auth/login with password verification and new session tokens.
// TODO Step 3: implement GET /auth/me and POST /auth/logout using bearer token sessions.

export default app;
