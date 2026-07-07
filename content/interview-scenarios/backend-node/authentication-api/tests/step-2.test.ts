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

test("POST /auth/login validates required credentials", async () => {
  const missingEmail = await request(app).post("/auth/login").send({ password: "Password123!" });
  const missingPassword = await request(app).post("/auth/login").send({ email: "alex@example.com" });

  expect(missingEmail.status).toBe(400);
  expect(missingEmail.body).toEqual({ error: "Email is required" });
  expect(missingPassword.status).toBe(400);
  expect(missingPassword.body).toEqual({ error: "Password is required" });
});

test("POST /auth/login returns the same error for unknown email and wrong password", async () => {
  const wrongEmail = await request(app).post("/auth/login").send({
    email: "missing@example.com",
    password: "Password123!",
  });
  const wrongPassword = await request(app).post("/auth/login").send({
    email: "alex@example.com",
    password: "WrongPassword123!",
  });

  expect(wrongEmail.status).toBe(401);
  expect(wrongEmail.body).toEqual({ error: "Invalid email or password" });
  expect(wrongPassword.status).toBe(401);
  expect(wrongPassword.body).toEqual({ error: "Invalid email or password" });
});

test("POST /auth/login authenticates the seeded user case-insensitively and returns a safe user", async () => {
  const res = await request(app).post("/auth/login").send({
    email: " ALEX@Example.com ",
    password: "Password123!",
  });

  expect(res.status).toBe(200);
  expect(typeof res.body.token).toBe("string");
  expect(res.body.token.length).toBeGreaterThan(20);
  expect(res.body.user).toEqual({
    id: 1,
    email: "alex@example.com",
    name: "Alex Rivera",
    created_at: "2025-01-10T09:00:00.000Z",
  });
  expect(JSON.stringify(res.body)).not.toContain("password_hash");
});

test("multiple successful logins create distinct session tokens", async () => {
  const first = await request(app).post("/auth/login").send({
    email: "alex@example.com",
    password: "Password123!",
  });
  const second = await request(app).post("/auth/login").send({
    email: "alex@example.com",
    password: "Password123!",
  });

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(first.body.token).not.toBe(second.body.token);
  expect(db.get("SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?", [1])).toEqual({ count: 2 });
});

test("registered users can log in with their normalized email", async () => {
  const registered = await request(app).post("/auth/register").send({
    email: "SAM@example.com",
    password: "Password123!",
    name: "Sam Carter",
  });
  const login = await request(app).post("/auth/login").send({
    email: "sam@example.com",
    password: "Password123!",
  });

  expect(registered.status).toBe(201);
  expect(login.status).toBe(200);
  expect(login.body.user.email).toBe("sam@example.com");
  expect(login.body.token).not.toBe(registered.body.token);
});
