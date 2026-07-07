import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

// TODO Step 1: implement GET /accounts and GET /accounts/:id.
// TODO Step 2: implement POST /transfers with transactional balance and ledger updates.
// TODO Step 3: implement GET /transfers/:id and complete duplicate idempotency behavior.

export default app;
