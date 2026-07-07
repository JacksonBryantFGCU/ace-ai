import app from "../workspace/app";
import { db } from "../workspace/db";

function resetData() {
  db.exec("DELETE FROM comments;");
  db.exec("INSERT INTO comments (id, post_id, author_id, parent_id, body, status, created_at, updated_at) VALUES (1, 1, 1, NULL, 'Great post.', 'visible', '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'), (2, 1, 2, 1, 'Thanks!', 'visible', '2025-01-10T09:05:00.000Z', '2025-01-10T09:05:00.000Z'), (3, 1, 3, NULL, 'Needs moderation.', 'pending', '2025-01-10T09:10:00.000Z', '2025-01-10T09:10:00.000Z'), (4, 1, 2, NULL, 'Hidden for tone.', 'hidden', '2025-01-10T09:15:00.000Z', '2025-01-10T09:15:00.000Z'), (5, 1, 3, 1, 'Pending reply.', 'pending', '2025-01-10T09:20:00.000Z', '2025-01-10T09:20:00.000Z'), (6, 1, 1, 1, 'Hidden reply.', 'hidden', '2025-01-10T09:25:00.000Z', '2025-01-10T09:25:00.000Z'), (7, 4, 3, NULL, 'SQLite comments are useful.', 'visible', '2025-01-10T09:30:00.000Z', '2025-01-10T09:30:00.000Z'), (8, 1, 2, NULL, 'Second visible top-level comment.', 'visible', '2025-01-10T09:35:00.000Z', '2025-01-10T09:35:00.000Z'), (9, 1, 3, NULL, 'Third visible top-level comment.', 'visible', '2025-01-10T09:40:00.000Z', '2025-01-10T09:40:00.000Z'), (10, 2, 1, NULL, 'Draft post comment.', 'visible', '2025-01-10T09:45:00.000Z', '2025-01-10T09:45:00.000Z');");
}

beforeEach(() => resetData());

test("POST /posts/:postId/comments validates post and author inputs", async () => {
  const invalidPost = await request(app).post("/posts/abc/comments").send({ author_id: 1, body: "Helpful" });
  const missingPost = await request(app).post("/posts/999/comments").send({ author_id: 1, body: "Helpful" });
  const draftPost = await request(app).post("/posts/2/comments").send({ author_id: 1, body: "Helpful" });
  const missingAuthor = await request(app).post("/posts/1/comments").send({ body: "Helpful" });
  const invalidAuthor = await request(app).post("/posts/1/comments").send({ author_id: "abc", body: "Helpful" });
  const unknownAuthor = await request(app).post("/posts/1/comments").send({ author_id: 999, body: "Helpful" });

  expect(invalidPost.body).toEqual({ error: "Invalid post id" });
  expect(missingPost.status).toBe(404);
  expect(missingPost.body).toEqual({ error: "Post not found" });
  expect(draftPost.status).toBe(404);
  expect(draftPost.body).toEqual({ error: "Post not found" });
  expect(missingAuthor.body).toEqual({ error: "Author id is required" });
  expect(invalidAuthor.body).toEqual({ error: "Invalid author id" });
  expect(unknownAuthor.status).toBe(404);
  expect(unknownAuthor.body).toEqual({ error: "Author not found" });
});

test("POST /posts/:postId/comments validates parent relationships", async () => {
  const invalidParent = await request(app).post("/posts/1/comments").send({ author_id: 1, parent_id: "abc", body: "Helpful" });
  const missingParent = await request(app).post("/posts/1/comments").send({ author_id: 1, parent_id: 999, body: "Helpful" });
  const otherPostParent = await request(app).post("/posts/1/comments").send({ author_id: 1, parent_id: 7, body: "Helpful" });
  const replyToReply = await request(app).post("/posts/1/comments").send({ author_id: 1, parent_id: 2, body: "Nested reply" });

  expect(invalidParent.body).toEqual({ error: "Invalid parent id" });
  expect(missingParent.status).toBe(404);
  expect(missingParent.body).toEqual({ error: "Parent comment not found" });
  expect(otherPostParent.body).toEqual({ error: "Parent comment does not belong to this post" });
  expect(replyToReply.body).toEqual({ error: "Cannot reply to a reply" });
});

test("POST /posts/:postId/comments validates and trims body", async () => {
  const missingBody = await request(app).post("/posts/1/comments").send({ author_id: 1 });
  const emptyBody = await request(app).post("/posts/1/comments").send({ author_id: 1, body: "   " });
  const tooLong = await request(app).post("/posts/1/comments").send({ author_id: 1, body: "x".repeat(501) });

  expect(missingBody.body).toEqual({ error: "Body is required" });
  expect(emptyBody.body).toEqual({ error: "Body is required" });
  expect(tooLong.body).toEqual({ error: "Body is too long" });
});

test("POST /posts/:postId/comments creates pending top-level comments and replies without exposing email", async () => {
  const top = await request(app).post("/posts/1/comments").send({ author_id: 1, body: "  This was helpful.  " });
  const reply = await request(app).post("/posts/1/comments").send({ author_id: 2, parent_id: 1, body: "I agree." });
  const list = await request(app).get("/posts/1/comments");

  expect(top.status).toBe(201);
  expect(top.body.comment).toMatchObject({ id: 11, post_id: 1, author: { id: 1, name: "Alex Rivera" }, parent_id: null, body: "This was helpful.", status: "pending" });
  expect(reply.status).toBe(201);
  expect(reply.body.comment).toMatchObject({ id: 12, post_id: 1, author: { id: 2, name: "Sam Carter" }, parent_id: 1, body: "I agree.", status: "pending" });
  expect(JSON.stringify(top.body)).not.toContain("email");
  expect(JSON.stringify(reply.body)).not.toContain("email");
  expect(list.body.comments.map((comment: { id: number }) => comment.id)).toEqual([1, 8, 9]);
  expect(JSON.stringify(list.body)).not.toContain("This was helpful.");
});
