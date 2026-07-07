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

async function loginAlex() {
  const res = await request(app).post("/auth/login").send({
    email: "alex@example.com",
    password: "Password123!",
  });
  return res.body.token as string;
}

beforeEach(() => {
  resetAuth();
});

test("GET /auth/me rejects missing, malformed, and invalid authorization", async () => {
  const missing = await request(app).get("/auth/me");
  const malformed = await request(app).get("/auth/me").set("Authorization", "Token abc123");
  const invalid = await request(app).get("/auth/me").set("Authorization", "Bearer missing-token");

  expect(missing.status).toBe(401);
  expect(missing.body).toEqual({ error: "Authentication required" });
  expect(malformed.status).toBe(401);
  expect(malformed.body).toEqual({ error: "Authentication required" });
  expect(invalid.status).toBe(401);
  expect(invalid.body).toEqual({ error: "Invalid or expired token" });
});

test("GET /auth/me accepts a token returned by registration", async () => {
  const registered = await request(app).post("/auth/register").send({
    email: "sam@example.com",
    password: "Password123!",
    name: "Sam Carter",
  });
  const me = await request(app).get("/auth/me").set("Authorization", `Bearer ${registered.body.token}`);

  expect(registered.status).toBe(201);
  expect(me.status).toBe(200);
  expect(me.body).toEqual({ user: registered.body.user });
  expect(JSON.stringify(me.body)).not.toContain("password_hash");
});

test("GET /auth/me accepts a token returned by login", async () => {
  const token = await loginAlex();
  const me = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

  expect(me.status).toBe(200);
  expect(me.body).toEqual({
    user: {
      id: 1,
      email: "alex@example.com",
      name: "Alex Rivera",
      created_at: "2025-01-10T09:00:00.000Z",
    },
  });
});

test("POST /auth/logout rejects missing and invalid authorization", async () => {
  const missing = await request(app).post("/auth/logout");
  const invalid = await request(app).post("/auth/logout").set("Authorization", "Bearer missing-token");

  expect(missing.status).toBe(401);
  expect(missing.body).toEqual({ error: "Authentication required" });
  expect(invalid.status).toBe(401);
  expect(invalid.body).toEqual({ error: "Invalid or expired token" });
});

test("POST /auth/logout revokes the current token", async () => {
  const token = await loginAlex();
  const logout = await request(app).post("/auth/logout").set("Authorization", `Bearer ${token}`);
  const me = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

  expect(logout.status).toBe(200);
  expect(logout.body).toEqual({ message: "Logged out" });
  const session = db.get<{ revoked_at: string }>("SELECT revoked_at FROM sessions WHERE token = ?", [token]);
  expect(typeof session?.revoked_at).toBe("string");
  expect(session?.revoked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(me.status).toBe(401);
  expect(me.body).toEqual({ error: "Invalid or expired token" });
});

test("logout revokes only the current session token", async () => {
  const first = await loginAlex();
  const second = await loginAlex();

  await request(app).post("/auth/logout").set("Authorization", `Bearer ${first}`);
  const firstMe = await request(app).get("/auth/me").set("Authorization", `Bearer ${first}`);
  const secondMe = await request(app).get("/auth/me").set("Authorization", `Bearer ${second}`);

  expect(firstMe.status).toBe(401);
  expect(secondMe.status).toBe(200);
  expect(secondMe.body.user.email).toBe("alex@example.com");
});
