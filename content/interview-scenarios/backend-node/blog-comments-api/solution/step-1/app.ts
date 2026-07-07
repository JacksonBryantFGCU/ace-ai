import express from "express";
import type { Request, Response } from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

type PostRow = {
  id: number;
};

type CommentRow = {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  parent_id: number | null;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function queryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function parseLimit(value: unknown) {
  if (value === undefined) return 20;
  const limit = Number(queryValue(value));
  return Number.isInteger(limit) && limit >= 1 && limit <= 50 ? limit : null;
}

function parseOffset(value: unknown) {
  if (value === undefined) return 0;
  const offset = Number(queryValue(value));
  return Number.isInteger(offset) && offset >= 0 ? offset : null;
}

function findPublishedPost(postId: number) {
  return db.get<PostRow>("SELECT id FROM posts WHERE id = ? AND status = 'published'", [postId]);
}

function toComment(row: CommentRow) {
  return {
    id: row.id,
    post_id: row.post_id,
    author: {
      id: row.author_id,
      name: row.author_name,
    },
    parent_id: row.parent_id,
    body: row.body,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function visibleReplies(parentId: number) {
  return db.all<CommentRow>(
    `SELECT comments.id, comments.post_id, comments.author_id, users.name AS author_name,
            comments.parent_id, comments.body, comments.status, comments.created_at, comments.updated_at
     FROM comments
     JOIN users ON users.id = comments.author_id
     WHERE comments.parent_id = ? AND comments.status = 'visible'
     ORDER BY comments.created_at ASC, comments.id ASC`,
    [parentId],
  );
}

function listVisibleComments(postId: number, limit: number, offset: number) {
  const total =
    db.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM comments WHERE post_id = ? AND parent_id IS NULL AND status = 'visible'",
      [postId],
    )?.count ?? 0;
  const parents = db.all<CommentRow>(
    `SELECT comments.id, comments.post_id, comments.author_id, users.name AS author_name,
            comments.parent_id, comments.body, comments.status, comments.created_at, comments.updated_at
     FROM comments
     JOIN users ON users.id = comments.author_id
     WHERE comments.post_id = ? AND comments.parent_id IS NULL AND comments.status = 'visible'
     ORDER BY comments.created_at ASC, comments.id ASC
     LIMIT ? OFFSET ?`,
    [postId, limit, offset],
  );

  return {
    comments: parents.map((parent) => ({
      ...toComment(parent),
      replies: visibleReplies(parent.id).map(toComment),
    })),
    pagination: { limit, offset, total },
  };
}

app.get("/posts/:postId/comments", (req: Request, res: Response) => {
  const postId = parseId(req.params.postId);
  if (!postId) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }
  if (!findPublishedPost(postId)) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const limit = parseLimit(req.query.limit);
  if (limit === null) {
    res.status(400).json({ error: "Invalid limit" });
    return;
  }

  const offset = parseOffset(req.query.offset);
  if (offset === null) {
    res.status(400).json({ error: "Invalid offset" });
    return;
  }

  res.status(200).json(listVisibleComments(postId, limit, offset));
});

export default app;
