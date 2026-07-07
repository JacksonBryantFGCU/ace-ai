import express from "express";
import type { Request, Response } from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const MAX_BODY_LENGTH = 500;
const MODERATION_STATUSES = new Set(["visible", "hidden"]);

type PostRow = {
  id: number;
};

type UserRow = {
  id: number;
  name: string;
};

type ParentRow = {
  id: number;
  post_id: number;
  parent_id: number | null;
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

function nowIso() {
  return new Date().toISOString();
}

function parseId(value: unknown) {
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

function findAuthor(authorId: number) {
  return db.get<UserRow>("SELECT id, name FROM users WHERE id = ?", [authorId]);
}

function findParent(parentId: number) {
  return db.get<ParentRow>("SELECT id, post_id, parent_id FROM comments WHERE id = ?", [parentId]);
}

function findComment(commentId: number) {
  return db.get<CommentRow>(
    `SELECT comments.id, comments.post_id, comments.author_id, users.name AS author_name,
            comments.parent_id, comments.body, comments.status, comments.created_at, comments.updated_at
     FROM comments
     JOIN users ON users.id = comments.author_id
     WHERE comments.id = ?`,
    [commentId],
  );
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

app.post("/posts/:postId/comments", (req: Request, res: Response) => {
  const postId = parseId(req.params.postId);
  if (!postId) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }
  if (!findPublishedPost(postId)) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const body = req.body as { author_id?: unknown; parent_id?: unknown; body?: unknown };
  if (body.author_id === undefined) {
    res.status(400).json({ error: "Author id is required" });
    return;
  }

  const authorId = parseId(body.author_id);
  if (!authorId) {
    res.status(400).json({ error: "Invalid author id" });
    return;
  }
  if (!findAuthor(authorId)) {
    res.status(404).json({ error: "Author not found" });
    return;
  }

  let parentId: number | null = null;
  if (body.parent_id !== undefined && body.parent_id !== null) {
    parentId = parseId(body.parent_id);
    if (!parentId) {
      res.status(400).json({ error: "Invalid parent id" });
      return;
    }

    const parent = findParent(parentId);
    if (!parent) {
      res.status(404).json({ error: "Parent comment not found" });
      return;
    }
    if (parent.post_id !== postId) {
      res.status(400).json({ error: "Parent comment does not belong to this post" });
      return;
    }
    if (parent.parent_id !== null) {
      res.status(400).json({ error: "Cannot reply to a reply" });
      return;
    }
  }

  const commentBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!commentBody) {
    res.status(400).json({ error: "Body is required" });
    return;
  }
  if (commentBody.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: "Body is too long" });
    return;
  }

  const timestamp = nowIso();
  const result = db.run(
    "INSERT INTO comments (post_id, author_id, parent_id, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)",
    [postId, authorId, parentId, commentBody, timestamp, timestamp],
  );
  const comment = findComment(result.lastInsertRowid)!;

  res.status(201).json({ comment: toComment(comment) });
});

app.patch("/comments/:id/status", (req: Request, res: Response) => {
  const commentId = parseId(req.params.id);
  if (!commentId) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }

  if (!findComment(commentId)) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  const body = req.body as { status?: unknown };
  if (body.status === undefined) {
    res.status(400).json({ error: "Status is required" });
    return;
  }
  if (typeof body.status !== "string" || !MODERATION_STATUSES.has(body.status)) {
    res.status(400).json({ error: "Invalid moderation status" });
    return;
  }

  db.run("UPDATE comments SET status = ?, updated_at = ? WHERE id = ?", [body.status, nowIso(), commentId]);
  const updated = findComment(commentId)!;

  res.status(200).json({ comment: toComment(updated) });
});

export default app;
