import app from "../workspace/app";
import { db } from "../workspace/db";

function resetData() {
  db.exec("DELETE FROM comments;");
  db.exec("INSERT INTO comments (id, post_id, author_id, parent_id, body, status, created_at, updated_at) VALUES (1, 1, 1, NULL, 'Great post.', 'visible', '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'), (2, 1, 2, 1, 'Thanks!', 'visible', '2025-01-10T09:05:00.000Z', '2025-01-10T09:05:00.000Z'), (3, 1, 3, NULL, 'Needs moderation.', 'pending', '2025-01-10T09:10:00.000Z', '2025-01-10T09:10:00.000Z'), (4, 1, 2, NULL, 'Hidden for tone.', 'hidden', '2025-01-10T09:15:00.000Z', '2025-01-10T09:15:00.000Z'), (5, 1, 3, 1, 'Pending reply.', 'pending', '2025-01-10T09:20:00.000Z', '2025-01-10T09:20:00.000Z'), (6, 1, 1, 1, 'Hidden reply.', 'hidden', '2025-01-10T09:25:00.000Z', '2025-01-10T09:25:00.000Z'), (7, 4, 3, NULL, 'SQLite comments are useful.', 'visible', '2025-01-10T09:30:00.000Z', '2025-01-10T09:30:00.000Z'), (8, 1, 2, NULL, 'Second visible top-level comment.', 'visible', '2025-01-10T09:35:00.000Z', '2025-01-10T09:35:00.000Z'), (9, 1, 3, NULL, 'Third visible top-level comment.', 'visible', '2025-01-10T09:40:00.000Z', '2025-01-10T09:40:00.000Z'), (10, 2, 1, NULL, 'Draft post comment.', 'visible', '2025-01-10T09:45:00.000Z', '2025-01-10T09:45:00.000Z');");
}

beforeEach(() => resetData());

test("PATCH /comments/:id/status validates id and status body", async () => {
  const invalidId = await request(app).patch("/comments/abc/status").send({ status: "hidden" });
  const missingComment = await request(app).patch("/comments/999/status").send({ status: "hidden" });
  const missingStatus = await request(app).patch("/comments/1/status").send({});
  const invalidStatus = await request(app).patch("/comments/1/status").send({ status: "spam" });
  const pendingStatus = await request(app).patch("/comments/1/status").send({ status: "pending" });

  expect(invalidId.body).toEqual({ error: "Invalid comment id" });
  expect(missingComment.status).toBe(404);
  expect(missingComment.body).toEqual({ error: "Comment not found" });
  expect(missingStatus.body).toEqual({ error: "Status is required" });
  expect(invalidStatus.body).toEqual({ error: "Invalid moderation status" });
  expect(pendingStatus.body).toEqual({ error: "Invalid moderation status" });
});

test("PATCH /comments/:id/status updates status, updated_at, and safe author shape", async () => {
  const before = db.get<{ updated_at: string }>("SELECT updated_at FROM comments WHERE id = ?", [1]);
  const hidden = await request(app).patch("/comments/1/status").send({ status: "hidden" });
  const visible = await request(app).patch("/comments/3/status").send({ status: "visible" });

  expect(hidden.status).toBe(200);
  expect(hidden.body.comment.status).toBe("hidden");
  expect(hidden.body.comment.updated_at).not.toBe(before?.updated_at);
  expect(hidden.body.comment.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(visible.body.comment.status).toBe("visible");
  expect(JSON.stringify(hidden.body)).not.toContain("email");
});

test("moderating top-level comments changes public list visibility", async () => {
  await request(app).patch("/comments/3/status").send({ status: "visible" });
  const withPendingVisible = await request(app).get("/posts/1/comments");
  await request(app).patch("/comments/1/status").send({ status: "hidden" });
  const afterHide = await request(app).get("/posts/1/comments");

  expect(withPendingVisible.body.comments.map((comment: { id: number }) => comment.id)).toEqual([1, 3, 8, 9]);
  expect(afterHide.body.comments.map((comment: { id: number }) => comment.id)).toEqual([3, 8, 9]);
});

test("moderating replies changes nested reply visibility", async () => {
  await request(app).patch("/comments/5/status").send({ status: "visible" });
  const withReply = await request(app).get("/posts/1/comments");
  await request(app).patch("/comments/2/status").send({ status: "hidden" });
  const afterHide = await request(app).get("/posts/1/comments");

  expect(withReply.body.comments[0].replies.map((reply: { id: number }) => reply.id)).toEqual([2, 5]);
  expect(afterHide.body.comments[0].replies.map((reply: { id: number }) => reply.id)).toEqual([5]);
});

test("completed API still supports comment creation and listing", async () => {
  const created = await request(app).post("/posts/1/comments").send({ author_id: 1, body: "New pending comment" });
  const list = await request(app).get("/posts/1/comments?limit=2");

  expect(created.status).toBe(201);
  expect(created.body.comment.status).toBe("pending");
  expect(list.body.pagination).toEqual({ limit: 2, offset: 0, total: 3 });
});
