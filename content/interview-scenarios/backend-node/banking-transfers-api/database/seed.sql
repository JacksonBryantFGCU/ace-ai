INSERT INTO customers (id, name, email, created_at) VALUES
  (1, 'Alex Rivera', 'alex@example.com', '2025-01-01T09:00:00.000Z'),
  (2, 'Sam Carter', 'sam@example.com', '2025-01-02T09:00:00.000Z'),
  (3, 'Priya Shah', 'priya@example.com', '2025-01-03T09:00:00.000Z');

INSERT INTO accounts (id, customer_id, account_number, type, status, balance_cents, created_at, updated_at) VALUES
  (1, 1, 'CHK-1001', 'checking', 'open', 122500, '2025-01-10T09:00:00.000Z', '2025-01-10T09:30:00.000Z'),
  (2, 2, 'SAV-2001', 'savings', 'open', 77500, '2025-01-10T09:05:00.000Z', '2025-01-10T09:30:00.000Z'),
  (3, 1, 'SAV-1002', 'savings', 'frozen', 50000, '2025-01-10T09:10:00.000Z', '2025-01-10T09:10:00.000Z'),
  (4, 2, 'CHK-2002', 'checking', 'closed', 10000, '2025-01-10T09:15:00.000Z', '2025-01-10T09:15:00.000Z'),
  (5, 3, 'CHK-3001', 'checking', 'open', 30000, '2025-01-10T09:20:00.000Z', '2025-01-10T09:20:00.000Z');

INSERT INTO transfers (id, idempotency_key, from_account_id, to_account_id, amount_cents, status, description, created_at) VALUES
  (1, 'transfer_001', 1, 2, 2500, 'completed', 'Rent split', '2025-01-10T09:30:00.000Z');

INSERT INTO ledger_entries (id, account_id, transfer_id, direction, amount_cents, balance_after_cents, created_at) VALUES
  (1, 1, 1, 'debit', 2500, 122500, '2025-01-10T09:30:00.000Z'),
  (2, 2, 1, 'credit', 2500, 77500, '2025-01-10T09:30:00.000Z');
