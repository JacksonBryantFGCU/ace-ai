import express from "express";
import type { Request, Response } from "express";
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

type SessionUserRow = UserRow & {
  token: string;
  revoked_at: string | null;
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

function verifyPassword(password: string, stored: string) {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  return scryptSync(password, salt, 32).toString("hex") === expected;
}

function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  db.run("INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)", [userId, token, nowIso()]);
  return token;
}

function findUserByEmail(email: string) {
  return db.get<UserRow>("SELECT id, email, password_hash, name, created_at FROM users WHERE email = ?", [email]);
}

function bearerToken(req: Request) {
  const header = req.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token ? token : null;
}

function currentUser(req: Request, res: Response) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const session = db.get<SessionUserRow>(
    `SELECT users.id, users.email, users.password_hash, users.name, users.created_at, sessions.token, sessions.revoked_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
    [token],
  );

  if (!session || session.revoked_at) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  return session;
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
  res.status(201).json({ token: createSession(user.id), user: safeUser(user) });
});

app.post("/auth/login", (req, res) => {
  const body = req.body as { email?: unknown; password?: unknown };
  const email = normalizeEmail(body.email);

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  if (typeof body.password !== "string") {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.status(200).json({ token: createSession(user.id), user: safeUser(user) });
});

app.get("/auth/me", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  res.status(200).json({ user: safeUser(user) });
});

app.post("/auth/logout", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;

  db.run("UPDATE sessions SET revoked_at = ? WHERE token = ?", [nowIso(), user.token]);
  res.status(200).json({ message: "Logged out" });
});

export default app;
