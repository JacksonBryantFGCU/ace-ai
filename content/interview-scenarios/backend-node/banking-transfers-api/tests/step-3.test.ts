import app from "../workspace/app";
import { db } from "../workspace/db";

test("GET /transfers/:id returns transfer details with ordered ledger entries", async () => {
  const res = await request(app).get("/transfers/1");

  expect(res.status).toBe(200);
  expect(res.body.transfer).toEqual({
    id: 1,
    idempotency_key: "transfer_001",
    from_account_id: 1,
    to_account_id: 2,
    amount_cents: 2500,
    status: "completed",
    description: "Rent split",
    created_at: "2025-01-10T09:30:00.000Z",
    ledger_entries: [
      {
        id: 1,
        account_id: 1,
        direction: "debit",
        amount_cents: 2500,
        balance_after_cents: 122500,
        created_at: "2025-01-10T09:30:00.000Z",
      },
      {
        id: 2,
        account_id: 2,
        direction: "credit",
        amount_cents: 2500,
        balance_after_cents: 77500,
        created_at: "2025-01-10T09:30:00.000Z",
      },
    ],
  });
});

test("GET /transfers/:id validates transfer ids", async () => {
  const invalid = await request(app).get("/transfers/abc");
  const missing = await request(app).get("/transfers/999");

  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid transfer id" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Transfer not found" });
});

test("POST /transfers duplicate idempotency key returns original transfer without mutating balances or ledger", async () => {
  const before = {
    source: db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [1])!.balance_cents,
    destination: db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [2])!.balance_cents,
    transfers: db.get<{ count: number }>("SELECT COUNT(*) AS count FROM transfers")!.count,
    ledger: db.get<{ count: number }>("SELECT COUNT(*) AS count FROM ledger_entries")!.count,
  };
  const duplicate = await request(app).post("/transfers").send({
    idempotency_key: "transfer_001",
    from_account_id: 1,
    to_account_id: 2,
    amount_cents: 99999,
    description: "Should not apply",
  });

  expect(duplicate.status).toBe(200);
  expect(duplicate.body.duplicate).toBe(true);
  expect(duplicate.body.transfer.id).toBe(1);
  expect(duplicate.body.transfer.amount_cents).toBe(2500);
  expect(duplicate.body.transfer.ledger_entries).toHaveLength(2);
  expect(db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [1])!.balance_cents).toBe(before.source);
  expect(db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [2])!.balance_cents).toBe(before.destination);
  expect(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM transfers")!.count).toBe(before.transfers);
  expect(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM ledger_entries")!.count).toBe(before.ledger);
});

test("Step 3 preserves transfer creation and account reads", async () => {
  const created = await request(app).post("/transfers").send({
    idempotency_key: "transfer_step3_001",
    from_account_id: 1,
    to_account_id: 5,
    amount_cents: 2000,
    description: "Step 3 transfer",
  });
  const detail = await request(app).get(`/transfers/${created.body.transfer.id}`);
  const account = await request(app).get("/accounts/1");

  expect(created.status).toBe(201);
  expect(detail.status).toBe(200);
  expect(detail.body.transfer.ledger_entries).toHaveLength(2);
  expect(account.body.account.balance_cents).toBe(120500);
  expect(account.body.account.ledger.map((entry: { transfer_id: number }) => entry.transfer_id)).toContain(created.body.transfer.id);
});
