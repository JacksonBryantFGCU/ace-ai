import express from "express";
import type { Request, Response } from "express";
import { db } from "./db";

const app = express();
app.use(express.json());

const VALID_ACCOUNT_STATUSES = ["open", "frozen", "closed"];

interface AccountJoinRow {
  id: number;
  customer_id: number;
  customer_name: string;
  account_number: string;
  type: string;
  status: string;
  balance_cents: number;
  created_at: string;
  updated_at: string;
}

interface AccountJoinRowWithEmail extends AccountJoinRow {
  customer_email: string;
}

interface TransferRecord {
  id: number;
  idempotency_key: string;
  from_account_id: number;
  to_account_id: number;
  amount_cents: number;
  status: string;
  description: string | null;
  created_at: string;
}

interface LedgerRecord {
  id: number;
  account_id: number;
  transfer_id: number;
  direction: string;
  amount_cents: number;
  balance_after_cents: number;
  created_at: string;
}

interface MinimalAccount {
  id: number;
  status: string;
  balance_cents: number;
}

function timestamp(): string {
  return new Date().toISOString();
}

function firstOf(input: unknown): unknown {
  return Array.isArray(input) ? input[0] : input;
}

function toPositiveInt(input: unknown): number | null {
  const n = Number(input);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function customerRecordExists(id: number): boolean {
  const row = db.get("SELECT id FROM customers WHERE id = ?", [id]);
  return row !== undefined && row !== null;
}

function loadMinimalAccount(id: number): MinimalAccount | undefined {
  return db.get<MinimalAccount>("SELECT id, status, balance_cents FROM accounts WHERE id = ?", [id]);
}

function loadTransferByKey(key: string): TransferRecord | undefined {
  return db.get<TransferRecord>(
    `SELECT id, idempotency_key, from_account_id, to_account_id, amount_cents, status, description, created_at
     FROM transfers WHERE idempotency_key = ?`,
    [key],
  );
}

function loadTransferById(id: number): TransferRecord | undefined {
  return db.get<TransferRecord>(
    `SELECT id, idempotency_key, from_account_id, to_account_id, amount_cents, status, description, created_at
     FROM transfers WHERE id = ?`,
    [id],
  );
}

function ledgerEntriesForTransfer(transferId: number) {
  return db.all<LedgerRecord>(
    `SELECT id, account_id, direction, amount_cents, balance_after_cents, created_at
     FROM ledger_entries WHERE transfer_id = ? ORDER BY id ASC`,
    [transferId],
  );
}

function ledgerEntriesForAccount(accountId: number) {
  return db.all<Omit<LedgerRecord, "account_id"> & { transfer_id: number }>(
    `SELECT id, transfer_id, direction, amount_cents, balance_after_cents, created_at
     FROM ledger_entries WHERE account_id = ? ORDER BY created_at ASC, id ASC`,
    [accountId],
  );
}

function serializeTransfer(row: TransferRecord) {
  return {
    id: row.id,
    idempotency_key: row.idempotency_key,
    from_account_id: row.from_account_id,
    to_account_id: row.to_account_id,
    amount_cents: row.amount_cents,
    status: row.status,
    description: row.description,
    created_at: row.created_at,
    ledger_entries: ledgerEntriesForTransfer(row.id),
  };
}

function serializeAccountSummary(row: AccountJoinRow) {
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

function serializeAccountDetail(row: AccountJoinRowWithEmail) {
  return {
    id: row.id,
    customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email },
    account_number: row.account_number,
    type: row.type,
    status: row.status,
    balance_cents: row.balance_cents,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ledger: ledgerEntriesForAccount(row.id),
  };
}

function loadAccountDetailRow(accountId: number): AccountJoinRowWithEmail | undefined {
  return db.get<AccountJoinRowWithEmail>(
    `SELECT accounts.id, accounts.customer_id, customers.name AS customer_name, customers.email AS customer_email,
            accounts.account_number, accounts.type, accounts.status, accounts.balance_cents,
            accounts.created_at, accounts.updated_at
     FROM accounts JOIN customers ON customers.id = accounts.customer_id
     WHERE accounts.id = ?`,
    [accountId],
  );
}

app.get("/accounts", (req: Request, res: Response) => {
  const rawCustomerId = firstOf(req.query.customer_id);
  let customerIdFilter: number | null = null;

  if (rawCustomerId !== undefined) {
    const parsed = toPositiveInt(rawCustomerId);
    if (parsed === null) {
      res.status(400).json({ error: "Invalid customer id" });
      return;
    }
    if (!customerRecordExists(parsed)) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    customerIdFilter = parsed;
  }

  const rawStatus = firstOf(req.query.status);
  let statusFilter: string | null = null;
  if (rawStatus !== undefined) {
    if (typeof rawStatus !== "string" || !VALID_ACCOUNT_STATUSES.includes(rawStatus)) {
      res.status(400).json({ error: "Invalid account status" });
      return;
    }
    statusFilter = rawStatus;
  }

  const rows = db.all<AccountJoinRow>(
    `SELECT accounts.id, accounts.customer_id, customers.name AS customer_name,
            accounts.account_number, accounts.type, accounts.status, accounts.balance_cents,
            accounts.created_at, accounts.updated_at
     FROM accounts JOIN customers ON customers.id = accounts.customer_id
     WHERE (? IS NULL OR accounts.customer_id = ?)
       AND (? IS NULL OR accounts.status = ?)
     ORDER BY accounts.id ASC`,
    [customerIdFilter, customerIdFilter, statusFilter, statusFilter],
  );

  res.status(200).json({ accounts: rows.map(serializeAccountSummary) });
});

app.get("/accounts/:id", (req: Request, res: Response) => {
  const accountId = toPositiveInt(req.params.id);
  if (accountId === null) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  const row = loadAccountDetailRow(accountId);
  if (!row) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.status(200).json({ account: serializeAccountDetail(row) });
});

type TransferBody = {
  idempotency_key?: unknown;
  from_account_id?: unknown;
  to_account_id?: unknown;
  amount_cents?: unknown;
  description?: unknown;
};

app.post("/transfers", (req: Request, res: Response) => {
  const body = req.body as TransferBody;

  const idempotencyKey = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
  if (idempotencyKey.length === 0) {
    res.status(400).json({ error: "Idempotency key is required" });
    return;
  }

  const priorTransfer = loadTransferByKey(idempotencyKey);
  if (priorTransfer) {
    res.status(200).json({ transfer: serializeTransfer(priorTransfer), duplicate: true });
    return;
  }

  if (body.from_account_id === undefined) {
    res.status(400).json({ error: "Source account id is required" });
    return;
  }
  const sourceId = toPositiveInt(body.from_account_id);
  if (sourceId === null) {
    res.status(400).json({ error: "Invalid source account id" });
    return;
  }

  if (body.to_account_id === undefined) {
    res.status(400).json({ error: "Destination account id is required" });
    return;
  }
  const destinationId = toPositiveInt(body.to_account_id);
  if (destinationId === null) {
    res.status(400).json({ error: "Invalid destination account id" });
    return;
  }

  const sourceAccount = loadMinimalAccount(sourceId);
  if (!sourceAccount) {
    res.status(404).json({ error: "Source account not found" });
    return;
  }

  const destinationAccount = loadMinimalAccount(destinationId);
  if (!destinationAccount) {
    res.status(404).json({ error: "Destination account not found" });
    return;
  }

  if (sourceId === destinationId) {
    res.status(400).json({ error: "Cannot transfer to the same account" });
    return;
  }

  if (sourceAccount.status !== "open") {
    res.status(400).json({ error: "Source account is not open" });
    return;
  }

  if (destinationAccount.status !== "open") {
    res.status(400).json({ error: "Destination account is not open" });
    return;
  }

  if (body.amount_cents === undefined) {
    res.status(400).json({ error: "Amount is required" });
    return;
  }
  const transferAmount = toPositiveInt(body.amount_cents);
  if (transferAmount === null) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }
  if (transferAmount > sourceAccount.balance_cents) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  let normalizedDescription: string | null = null;
  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      res.status(400).json({ error: "Invalid description" });
      return;
    }
    const trimmed = body.description.trim();
    normalizedDescription = trimmed.length > 0 ? trimmed : null;
    if (normalizedDescription !== null && normalizedDescription.length > 120) {
      res.status(400).json({ error: "Description is too long" });
      return;
    }
  }

  const runTransfer = db.transaction(() => {
    const now = timestamp();
    const newSourceBalance = sourceAccount.balance_cents - transferAmount;
    const newDestinationBalance = destinationAccount.balance_cents + transferAmount;

    const insertResult = db.run(
      `INSERT INTO transfers (idempotency_key, from_account_id, to_account_id, amount_cents, status, description, created_at)
       VALUES (?, ?, ?, ?, 'completed', ?, ?)`,
      [idempotencyKey, sourceId, destinationId, transferAmount, normalizedDescription, now],
    );
    const newTransferId = insertResult.lastInsertRowid;

    db.run("UPDATE accounts SET balance_cents = ?, updated_at = ? WHERE id = ?", [newSourceBalance, now, sourceId]);
    db.run("UPDATE accounts SET balance_cents = ?, updated_at = ? WHERE id = ?", [newDestinationBalance, now, destinationId]);

    db.run(
      `INSERT INTO ledger_entries (account_id, transfer_id, direction, amount_cents, balance_after_cents, created_at)
       VALUES (?, ?, 'debit', ?, ?, ?)`,
      [sourceId, newTransferId, transferAmount, newSourceBalance, now],
    );
    db.run(
      `INSERT INTO ledger_entries (account_id, transfer_id, direction, amount_cents, balance_after_cents, created_at)
       VALUES (?, ?, 'credit', ?, ?, ?)`,
      [destinationId, newTransferId, transferAmount, newDestinationBalance, now],
    );

    return loadTransferById(newTransferId)!;
  });

  const finalTransfer = runTransfer();
  res.status(201).json({ transfer: serializeTransfer(finalTransfer) });
});

export default app;
