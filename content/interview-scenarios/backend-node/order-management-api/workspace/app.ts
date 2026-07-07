import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement GET /orders and GET /orders/:id with joined customer/item data.
// TODO Step 2: implement POST /orders with validation, total calculation, stock updates, and a transaction.
// TODO Step 3: implement PATCH /orders/:id/status with allowed status transitions.

export default app;
