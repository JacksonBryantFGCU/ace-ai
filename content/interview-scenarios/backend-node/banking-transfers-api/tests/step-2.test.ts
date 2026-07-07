import app from "../workspace/app";
import { db } from "../workspace/db";

test("POST /transfers validates idempotency and account ids", async () => {
  const missingKey = await request(app).post("/transfers").send({ from_account_id: 1, to_account_id: 2, amount_cents: 2500 });
  const emptyKey = await request(app).post("/transfers").send({
    idempotency_key: "   ",
    from_account_id: 1,
    to_account_id: 2,
    amount_cents: 2500,
  });
  const missingSource = await request(app).post("/transfers").send({ idempotency_key: "t_bad_1", to_account_id: 2, amount_cents: 2500 });
  const invalidSource = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_2",
    from_account_id: "abc",
    to_account_id: 2,
    amount_cents: 2500,
  });
  const missingDestination = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_3",
    from_account_id: 1,
    amount_cents: 2500,
  });
  const invalidDestination = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_4",
    from_account_id: 1,
    to_account_id: "abc",
    amount_cents: 2500,
  });

  expect(missingKey.body).toEqual({ error: "Idempotency key is required" });
  expect(emptyKey.body).toEqual({ error: "Idempotency key is required" });
  expect(missingSource.body).toEqual({ error: "Source account id is required" });
  expect(invalidSource.body).toEqual({ error: "Invalid source account id" });
  expect(missingDestination.body).toEqual({ error: "Destination account id is required" });
  expect(invalidDestination.body).toEqual({ error: "Invalid destination account id" });
});

test("POST /transfers validates related accounts and account statuses", async () => {
  const missingSource = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_5",
    from_account_id: 999,
    to_account_id: 2,
    amount_cents: 2500,
  });
  const missingDestination = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_6",
    from_account_id: 1,
    to_account_id: 999,
    amount_cents: 2500,
  });
  const same = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_7",
    from_account_id: 1,
    to_account_id: 1,
    amount_cents: 2500,
  });
  const frozenSource = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_8",
    from_account_id: 3,
    to_account_id: 2,
    amount_cents: 2500,
  });
  const closedSource = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_9",
    from_account_id: 4,
    to_account_id: 2,
    amount_cents: 2500,
  });
  const frozenDestination = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_10",
    from_account_id: 1,
    to_account_id: 3,
    amount_cents: 2500,
  });
  const closedDestination = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_11",
    from_account_id: 1,
    to_account_id: 4,
    amount_cents: 2500,
  });

  expect(missingSource.status).toBe(404);
  expect(missingSource.body).toEqual({ error: "Source account not found" });
  expect(missingDestination.status).toBe(404);
  expect(missingDestination.body).toEqual({ error: "Destination account not found" });
  expect(same.body).toEqual({ error: "Cannot transfer to the same account" });
  expect(frozenSource.body).toEqual({ error: "Source account is not open" });
  expect(closedSource.body).toEqual({ error: "Source account is not open" });
  expect(frozenDestination.body).toEqual({ error: "Destination account is not open" });
  expect(closedDestination.body).toEqual({ error: "Destination account is not open" });
});

test("POST /transfers validates amount and description without mutating state", async () => {
  const before = {
    source: db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [1])!.balance_cents,
    destination: db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [2])!.balance_cents,
    transfers: db.get<{ count: number }>("SELECT COUNT(*) AS count FROM transfers")!.count,
    ledger: db.get<{ count: number }>("SELECT COUNT(*) AS count FROM ledger_entries")!.count,
  };

  const missingAmount = await request(app).post("/transfers").send({ idempotency_key: "t_bad_12", from_account_id: 1, to_account_id: 2 });
  const invalidAmount = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_13",
    from_account_id: 1,
    to_account_id: 2,
    amount_cents: 0,
  });
  const nonInteger = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_14",
    from_account_id: 1,
    to_account_id: 2,
    amount_cents: 12.5,
  });
  const insufficient = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_15",
    from_account_id: 1,
    to_account_id: 2,
    amount_cents: 999999999,
  });
  const invalidDescription = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_16",
    from_account_id: 1,
    to_account_id: 2,
    amount_cents: 2500,
    description: 123,
  });
  const longDescription = await request(app).post("/transfers").send({
    idempotency_key: "t_bad_17",
    from_account_id: 1,
    to_account_id: 2,
    amount_cents: 2500,
    description: "x".repeat(121),
  });

  expect(missingAmount.body).toEqual({ error: "Amount is required" });
  expect(invalidAmount.body).toEqual({ error: "Invalid amount" });
  expect(nonInteger.body).toEqual({ error: "Invalid amount" });
  expect(insufficient.body).toEqual({ error: "Insufficient funds" });
  expect(invalidDescription.body).toEqual({ error: "Invalid description" });
  expect(longDescription.body).toEqual({ error: "Description is too long" });
  expect(db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [1])!.balance_cents).toBe(before.source);
  expect(db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [2])!.balance_cents).toBe(before.destination);
  expect(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM transfers")!.count).toBe(before.transfers);
  expect(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM ledger_entries")!.count).toBe(before.ledger);
});

test("POST /transfers creates completed transfers atomically with ledger entries", async () => {
  const beforeSource = db.get<{ updated_at: string }>("SELECT updated_at FROM accounts WHERE id = ?", [1])!;
  const beforeDestination = db.get<{ updated_at: string }>("SELECT updated_at FROM accounts WHERE id = ?", [5])!;
  const res = await request(app).post("/transfers").send({
    idempotency_key: "transfer_new_001",
    from_account_id: 1,
    to_account_id: 5,
    amount_cents: 3000,
    description: "  Emergency fund  ",
  });

  expect(res.status).toBe(201);
  expect(res.body.transfer).toMatchObject({
    idempotency_key: "transfer_new_001",
    from_account_id: 1,
    to_account_id: 5,
    amount_cents: 3000,
    status: "completed",
    description: "Emergency fund",
  });
  expect(
    res.body.transfer.ledger_entries.map((entry: { account_id: number; direction: string; amount_cents: number; balance_after_cents: number }) => ({
      account_id: entry.account_id,
      direction: entry.direction,
      amount_cents: entry.amount_cents,
      balance_after_cents: entry.balance_after_cents,
    })),
  ).toEqual([
    { account_id: 1, direction: "debit", amount_cents: 3000, balance_after_cents: 119500 },
    { account_id: 5, direction: "credit", amount_cents: 3000, balance_after_cents: 33000 },
  ]);
  expect(db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [1])!.balance_cents).toBe(119500);
  expect(db.get<{ balance_cents: number }>("SELECT balance_cents FROM accounts WHERE id = ?", [5])!.balance_cents).toBe(33000);
  expect(db.get<{ updated_at: string }>("SELECT updated_at FROM accounts WHERE id = ?", [1])!.updated_at).not.toBe(beforeSource.updated_at);
  expect(db.get<{ updated_at: string }>("SELECT updated_at FROM accounts WHERE id = ?", [5])!.updated_at).not.toBe(beforeDestination.updated_at);
});

test("Step 2 preserves account detail behavior after transfers", async () => {
  const created = await request(app).post("/transfers").send({
    idempotency_key: "transfer_new_002",
    from_account_id: 2,
    to_account_id: 5,
    amount_cents: 1500,
    description: "   ",
  });
  const detail = await request(app).get("/accounts/2");

  expect(created.status).toBe(201);
  expect(created.body.transfer.description).toBeNull();
  expect(detail.body.account.ledger.map((entry: { transfer_id: number }) => entry.transfer_id)).toContain(created.body.transfer.id);
});
