import app from "../workspace/app";

test("GET /accounts returns all accounts with customer summaries in deterministic order", async () => {
  const res = await request(app).get("/accounts");

  expect(res.status).toBe(200);
  expect(res.body.accounts.map((account: { id: number }) => account.id)).toEqual([1, 2, 3, 4, 5]);
  expect(res.body.accounts[0]).toEqual({
    id: 1,
    customer_id: 1,
    customer_name: "Alex Rivera",
    account_number: "CHK-1001",
    type: "checking",
    status: "open",
    balance_cents: 122500,
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:30:00.000Z",
  });
});

test("GET /accounts supports customer, status, and combined filters", async () => {
  const customer = await request(app).get("/accounts?customer_id=1");
  const open = await request(app).get("/accounts?status=open");
  const frozen = await request(app).get("/accounts?status=frozen");
  const closed = await request(app).get("/accounts?status=closed");
  const combined = await request(app).get("/accounts?customer_id=1&status=open");

  expect(customer.body.accounts.map((account: { id: number }) => account.id)).toEqual([1, 3]);
  expect(open.body.accounts.map((account: { id: number }) => account.id)).toEqual([1, 2, 5]);
  expect(frozen.body.accounts.map((account: { id: number }) => account.id)).toEqual([3]);
  expect(closed.body.accounts.map((account: { id: number }) => account.id)).toEqual([4]);
  expect(combined.body.accounts.map((account: { id: number }) => account.id)).toEqual([1]);
});

test("GET /accounts validates filters", async () => {
  const invalidCustomer = await request(app).get("/accounts?customer_id=abc");
  const missingCustomer = await request(app).get("/accounts?customer_id=999");
  const invalidStatus = await request(app).get("/accounts?status=paused");

  expect(invalidCustomer.status).toBe(400);
  expect(invalidCustomer.body).toEqual({ error: "Invalid customer id" });
  expect(missingCustomer.status).toBe(404);
  expect(missingCustomer.body).toEqual({ error: "Customer not found" });
  expect(invalidStatus.status).toBe(400);
  expect(invalidStatus.body).toEqual({ error: "Invalid account status" });
});

test("GET /accounts/:id returns account detail with customer and ordered ledger", async () => {
  const res = await request(app).get("/accounts/1");

  expect(res.status).toBe(200);
  expect(res.body.account).toEqual({
    id: 1,
    customer: { id: 1, name: "Alex Rivera", email: "alex@example.com" },
    account_number: "CHK-1001",
    type: "checking",
    status: "open",
    balance_cents: 122500,
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:30:00.000Z",
    ledger: [
      {
        id: 1,
        transfer_id: 1,
        direction: "debit",
        amount_cents: 2500,
        balance_after_cents: 122500,
        created_at: "2025-01-10T09:30:00.000Z",
      },
    ],
  });
});

test("GET /accounts/:id validates account ids", async () => {
  const invalid = await request(app).get("/accounts/abc");
  const missing = await request(app).get("/accounts/999");

  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid account id" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Account not found" });
});
