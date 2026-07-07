import app from "../workspace/app";

test("GET /posts/:postId/comments validates post id and published post visibility", async () => {
  const invalid = await request(app).get("/posts/abc/comments");
  const missing = await request(app).get("/posts/999/comments");
  const draft = await request(app).get("/posts/2/comments");
  const archived = await request(app).get("/posts/3/comments");

  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid post id" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Post not found" });
  expect(draft.status).toBe(404);
  expect(draft.body).toEqual({ error: "Post not found" });
  expect(archived.status).toBe(404);
  expect(archived.body).toEqual({ error: "Post not found" });
});

test("GET /posts/:postId/comments returns only visible top-level comments with visible replies", async () => {
  const res = await request(app).get("/posts/1/comments");

  expect(res.status).toBe(200);
  expect(res.body.pagination).toEqual({ limit: 20, offset: 0, total: 3 });
  expect(res.body.comments.map((comment: { id: number }) => comment.id)).toEqual([1, 8, 9]);
  expect(res.body.comments[0]).toEqual({
    id: 1,
    post_id: 1,
    author: { id: 1, name: "Alex Rivera" },
    parent_id: null,
    body: "Great post.",
    status: "visible",
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
    replies: [
      {
        id: 2,
        post_id: 1,
        author: { id: 2, name: "Sam Carter" },
        parent_id: 1,
        body: "Thanks!",
        status: "visible",
        created_at: "2025-01-10T09:05:00.000Z",
        updated_at: "2025-01-10T09:05:00.000Z",
      },
    ],
  });
  expect(JSON.stringify(res.body)).not.toContain("email");
  expect(JSON.stringify(res.body)).not.toContain("Needs moderation");
  expect(JSON.stringify(res.body)).not.toContain("Hidden reply");
});

test("GET /posts/:postId/comments paginates top-level comments only", async () => {
  const first = await request(app).get("/posts/1/comments?limit=1&offset=0");
  const second = await request(app).get("/posts/1/comments?limit=1&offset=1");

  expect(first.status).toBe(200);
  expect(first.body.pagination).toEqual({ limit: 1, offset: 0, total: 3 });
  expect(first.body.comments.map((comment: { id: number }) => comment.id)).toEqual([1]);
  expect(first.body.comments[0].replies.map((reply: { id: number }) => reply.id)).toEqual([2]);
  expect(second.status).toBe(200);
  expect(second.body.pagination).toEqual({ limit: 1, offset: 1, total: 3 });
  expect(second.body.comments.map((comment: { id: number }) => comment.id)).toEqual([8]);
});

test("GET /posts/:postId/comments validates pagination parameters", async () => {
  const invalidLimit = await request(app).get("/posts/1/comments?limit=abc");
  const tooLarge = await request(app).get("/posts/1/comments?limit=100");
  const invalidOffset = await request(app).get("/posts/1/comments?offset=-1");

  expect(invalidLimit.status).toBe(400);
  expect(invalidLimit.body).toEqual({ error: "Invalid limit" });
  expect(tooLarge.status).toBe(400);
  expect(tooLarge.body).toEqual({ error: "Invalid limit" });
  expect(invalidOffset.status).toBe(400);
  expect(invalidOffset.body).toEqual({ error: "Invalid offset" });
});
