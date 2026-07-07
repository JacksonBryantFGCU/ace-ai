import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement GET /products and GET /products/:id.
// TODO Step 2: add validated category, active, and sort query support.
// TODO Step 3: implement POST /products with validation and SQLite insertion.

export default app;
