import app from "../workspace/app";
import { db } from "../workspace/db";

const SEED_HASH = "scrypt$seed-alex-rivera$aae708bd047278400d68a281d4406602cd58c48cb057f077cb538e0f61d10da0";

function resetAuth() {
  db.exec("DELETE FROM sessions;");
  db.exec("DELETE FROM users;");
  db.run(
    "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)",
    [1, "alex@example.com", SEED_HASH, "Alex Rivera", "2025-01-10T09:00:00.000Z"],
  );
}

beforeEach(() => {
  resetAuth();
});

test("POST /auth/register validates required fields and email format", async () => {
  const missingEmail = await request(app).post("/auth/register").send({
    password: "Password123!",
    name: "Sam Carter",
  });
  const invalidEmail = await request(app).post("/auth/register").send({
    email: "not-an-email",
    password: "Password123!",
    name: "Sam Carter",
  });
  const missingPassword = await request(app).post("/auth/register").send({
    email: "sam@example.com",
    name: "Sam Carter",
  });
  const weakPassword = await request(app).post("/auth/register").send({
    email: "sam@example.com",
    password: "short",
    name: "Sam Carter",
  });

  expect(missingEmail.status).toBe(400);
  expect(missingEmail.body).toEqual({ error: "Email is required" });
  expect(invalidEmail.status).toBe(400);
  expect(invalidEmail.body).toEqual({ error: "Invalid email" });
  expect(missingPassword.status).toBe(400);
  expect(missingPassword.body).toEqual({ error: "Password is required" });
  expect(weakPassword.status).toBe(400);
  expect(weakPassword.body).toEqual({ error: "Password must be at least 8 characters" });
});

test("POST /auth/register validates name and duplicate emails", async () => {
  const missingName = await request(app).post("/auth/register").send({
    email: "sam@example.com",
    password: "Password123!",
  });
  const emptyName = await request(app).post("/auth/register").send({
    email: "sam@example.com",
    password: "Password123!",
    name: "   ",
  });
  const duplicate = await request(app).post("/auth/register").send({
    email: "ALEX@example.com",
    password: "Password123!",
    name: "Alex Rivera",
  });

  expect(missingName.status).toBe(400);
  expect(missingName.body).toEqual({ error: "Name is required" });
  expect(emptyName.status).toBe(400);
  expect(emptyName.body).toEqual({ error: "Name is required" });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body).toEqual({ error: "Email already registered" });
});

test("POST /auth/register creates a user, hashes the password, and returns a safe session response", async () => {
  const res = await request(app).post("/auth/register").send({
    email: "  SAM@Example.com ",
    password: "Password123!",
    name: "  Sam Carter  ",
  });

  expect(res.status).toBe(201);
  expect(typeof res.body.token).toBe("string");
  expect(res.body.token.length).toBeGreaterThan(20);
  expect(res.body.user).toMatchObject({
    id: 2,
    email: "sam@example.com",
    name: "Sam Carter",
  });
  expect(res.body.user.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(JSON.stringify(res.body)).not.toContain("password_hash");
  expect(JSON.stringify(res.body)).not.toContain("Password123!");

  const stored = db.get<{ email: string; password_hash: string; name: string }>(
    "SELECT email, password_hash, name FROM users WHERE id = ?",
    [2],
  );
  expect(stored?.email).toBe("sam@example.com");
  expect(stored?.name).toBe("Sam Carter");
  expect(stored?.password_hash).not.toBe("Password123!");
  expect(stored?.password_hash.startsWith("scrypt$")).toBe(true);

  const session = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?", [2]);
  expect(session).toEqual({ count: 1 });
});
