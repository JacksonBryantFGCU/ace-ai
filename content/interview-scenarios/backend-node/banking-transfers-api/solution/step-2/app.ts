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
type AccountDetailRow = AccountListRow & { customer_email: string };
type TransferRow = {
  id: number;
  idempotency_key: string;
  from_account_id: number;
  to_account_id: number;
  amount_cents: number;
  status: string;
  description: string | null;
  created_at: string;
};
type LedgerRow = {
  id: number;
  transfer_id: number;
  account_id?: number;
  direction: string;
  amount_cents: number;
  balance_after_cents: number;
  created_at: string;
};
type AccountRow = {
  id: number;
  status: string;
  balance_cents: number;
};

function nowIso() {
  return new Date().toISOString();
}

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

function findAccount(accountId: number) {
  return db.get<AccountRow>("SELECT id, status, balance_cents FROM accounts WHERE id = ?", [accountId]);
}

function findTransferByKey(idempotencyKey: string) {
  return db.get<TransferRow>(
    "SELECT id, idempotency_key, from_account_id, to_account_id, amount_cents, status, description, created_at FROM transfers WHERE idempotency_key = ?",
    [idempotencyKey],
  );
}

function findTransferById(transferId: number) {
  return db.get<TransferRow>(
    "SELECT id, idempotency_key, from_account_id, to_account_id, amount_cents, status, description, created_at FROM transfers WHERE id = ?",
    [transferId],
  );
}

function transferResponse(row: TransferRow) {
  const ledger = db.all<Required<LedgerRow>>(
    `SELECT id, account_id, direction, amount_cents, balance_after_cents, created_at
     FROM ledger_entries
     WHERE transfer_id = ?
     ORDER BY id ASC`,
    [row.id],
  );

  return {
    id: row.id,
    idempotency_key: row.idempotency_key,
    from_account_id: row.from_account_id,
    to_account_id: row.to_account_id,
    amount_cents: row.amount_cents,
    status: row.status,
    description: row.description,
    created_at: row.created_at,
    ledger_entries: ledger,
  };
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
    customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email },
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

app.post("/transfers", (req: Request, res: Response) => {
  const body = req.body as {
    idempotency_key?: unknown;
    from_account_id?: unknown;
    to_account_id?: unknown;
    amount_cents?: unknown;
    description?: unknown;
  };
  const idempotencyKey = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
  if (!idempotencyKey) {
    res.status(400).json({ error: "Idempotency key is required" });
    return;
  }

  const existing = findTransferByKey(idempotencyKey);
  if (existing) {
    res.status(200).json({ transfer: transferResponse(existing), duplicate: true });
    return;
  }

  if (body.from_account_id === undefined) {
    res.status(400).json({ error: "Source account id is required" });
    return;
  }
  const fromAccountId = parseId(body.from_account_id);
  if (!fromAccountId) {
    res.status(400).json({ error: "Invalid source account id" });
    return;
  }

  if (body.to_account_id === undefined) {
    res.status(400).json({ error: "Destination account id is required" });
    return;
  }
  const toAccountId = parseId(body.to_account_id);
  if (!toAccountId) {
    res.status(400).json({ error: "Invalid destination account id" });
    return;
  }

  const source = findAccount(fromAccountId);
  if (!source) {
    res.status(404).json({ error: "Source account not found" });
    return;
  }
  const destination = findAccount(toAccountId);
  if (!destination) {
    res.status(404).json({ error: "Destination account not found" });
    return;
  }
  if (fromAccountId === toAccountId) {
    res.status(400).json({ error: "Cannot transfer to the same account" });
    return;
  }
  if (source.status !== "open") {
    res.status(400).json({ error: "Source account is not open" });
    return;
  }
  if (destination.status !== "open") {
    res.status(400).json({ error: "Destination account is not open" });
    return;
  }

  if (body.amount_cents === undefined) {
    res.status(400).json({ error: "Amount is required" });
    return;
  }
  const amount = Number(body.amount_cents);
  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }
  if (amount > source.balance_cents) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  let description: string | null = null;
  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      res.status(400).json({ error: "Invalid description" });
      return;
    }
    description = body.description.trim() || null;
    if (description && description.length > 120) {
      res.status(400).json({ error: "Description is too long" });
      return;
    }
  }

  const createTransfer = db.transaction(() => {
    const timestamp = nowIso();
    const sourceBalance = source.balance_cents - amount;
    const destinationBalance = destination.balance_cents + amount;
    const result = db.run(
      "INSERT INTO transfers (idempotency_key, from_account_id, to_account_id, amount_cents, status, description, created_at) VALUES (?, ?, ?, ?, 'completed', ?, ?)",
      [idempotencyKey, fromAccountId, toAccountId, amount, description, timestamp],
    );
    const transferId = result.lastInsertRowid;

    db.run("UPDATE accounts SET balance_cents = ?, updated_at = ? WHERE id = ?", [sourceBalance, timestamp, fromAccountId]);
    db.run("UPDATE accounts SET balance_cents = ?, updated_at = ? WHERE id = ?", [
      destinationBalance,
      timestamp,
      toAccountId,
    ]);
    db.run(
      "INSERT INTO ledger_entries (account_id, transfer_id, direction, amount_cents, balance_after_cents, created_at) VALUES (?, ?, 'debit', ?, ?, ?)",
      [fromAccountId, transferId, amount, sourceBalance, timestamp],
    );
    db.run(
      "INSERT INTO ledger_entries (account_id, transfer_id, direction, amount_cents, balance_after_cents, created_at) VALUES (?, ?, 'credit', ?, ?, ?)",
      [toAccountId, transferId, amount, destinationBalance, timestamp],
    );

    return findTransferById(transferId)!;
  });

  res.status(201).json({ transfer: transferResponse(createTransfer()) });
});

export default app;
