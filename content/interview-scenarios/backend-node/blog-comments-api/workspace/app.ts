import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement GET /posts/:postId/comments with visible comments, one reply level, and pagination.
// TODO Step 2: implement POST /posts/:postId/comments for pending comments and replies.
// TODO Step 3: implement PATCH /comments/:id/status for moderation.

export default app;
