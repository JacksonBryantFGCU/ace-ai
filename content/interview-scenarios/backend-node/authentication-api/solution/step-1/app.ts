import express from "express";
import { randomBytes, scryptSync } from "node:crypto";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
  };
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  db.run("INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)", [userId, token, nowIso()]);
  return token;
}

function findUserByEmail(email: string) {
  return db.get<UserRow>("SELECT id, email, password_hash, name, created_at FROM users WHERE email = ?", [email]);
}

app.post("/auth/register", (req, res) => {
  const body = req.body as { email?: unknown; password?: unknown; name?: unknown };
  const email = normalizeEmail(body.email);
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  if (typeof body.password !== "string") {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  if (body.password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  if (findUserByEmail(email)) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const result = db.run(
    "INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)",
    [email, hashPassword(body.password), name, nowIso()],
  );
  const user = db.get<UserRow>("SELECT id, email, password_hash, name, created_at FROM users WHERE id = ?", [
    result.lastInsertRowid,
  ])!;
  const token = createSession(user.id);

  res.status(201).json({ token, user: safeUser(user) });
});

export default app;
