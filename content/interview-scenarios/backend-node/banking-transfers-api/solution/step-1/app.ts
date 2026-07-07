import express from "express";
import type { Request, Response } from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const ACCOUNT_STATUSES = new Set(["open", "frozen", "closed"]);

type AccountListRow = {
  id: number;
  customer_id: number;
  customer_name: string;
  account_number: string;
  type: string;
  status: string;
  balance_cents: number;
  created_at: string;
  updated_at: string;
};

type AccountDetailRow = {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  account_number: string;
  type: string;
  status: string;
  balance_cents: number;
  created_at: string;
  updated_at: string;
};

type LedgerRow = {
  id: number;
  transfer_id: number;
  direction: string;
  amount_cents: number;
  balance_after_cents: number;
  created_at: string;
};

function queryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function customerExists(customerId: number) {
  return Boolean(db.get("SELECT id FROM customers WHERE id = ?", [customerId]));
}

function accountListRow(row: AccountListRow) {
  return {
    id: row.id,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    account_number: row.account_number,
    type: row.type,
    status: row.status,
    balance_cents: row.balance_cents,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function accountDetail(row: AccountDetailRow) {
  const ledger = db.all<LedgerRow>(
    `SELECT id, transfer_id, direction, amount_cents, balance_after_cents, created_at
     FROM ledger_entries
     WHERE account_id = ?
     ORDER BY created_at ASC, id ASC`,
    [row.id],
  );

  return {
    id: row.id,
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      email: row.customer_email,
    },
    account_number: row.account_number,
    type: row.type,
    status: row.status,
    balance_cents: row.balance_cents,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ledger,
  };
}

function findAccountDetail(accountId: number) {
  return db.get<AccountDetailRow>(
    `SELECT accounts.id, accounts.customer_id, customers.name AS customer_name, customers.email AS customer_email,
            accounts.account_number, accounts.type, accounts.status, accounts.balance_cents,
            accounts.created_at, accounts.updated_at
     FROM accounts
     JOIN customers ON customers.id = accounts.customer_id
     WHERE accounts.id = ?`,
    [accountId],
  );
}

app.get("/accounts", (req: Request, res: Response) => {
  const rawCustomerId = queryValue(req.query.customer_id);
  let customerId: number | null = null;
  if (rawCustomerId !== undefined) {
    customerId = parseId(rawCustomerId);
    if (!customerId) {
      res.status(400).json({ error: "Invalid customer id" });
      return;
    }
    if (!customerExists(customerId)) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
  }

  const status = queryValue(req.query.status);
  if (status !== undefined && (typeof status !== "string" || !ACCOUNT_STATUSES.has(status))) {
    res.status(400).json({ error: "Invalid account status" });
    return;
  }

  const rows = db.all<AccountListRow>(
    `SELECT accounts.id, accounts.customer_id, customers.name AS customer_name,
            accounts.account_number, accounts.type, accounts.status, accounts.balance_cents,
            accounts.created_at, accounts.updated_at
     FROM accounts
     JOIN customers ON customers.id = accounts.customer_id
     WHERE (? IS NULL OR accounts.customer_id = ?)
       AND (? IS NULL OR accounts.status = ?)
     ORDER BY accounts.id ASC`,
    [customerId, customerId, status ?? null, status ?? null],
  );

  res.status(200).json({ accounts: rows.map(accountListRow) });
});

app.get("/accounts/:id", (req: Request, res: Response) => {
  const accountId = parseId(req.params.id);
  if (!accountId) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  const row = findAccountDetail(accountId);
  if (!row) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.status(200).json({ account: accountDetail(row) });
});

export default app;
