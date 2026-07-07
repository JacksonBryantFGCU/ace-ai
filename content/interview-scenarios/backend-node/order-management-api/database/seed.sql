INSERT INTO customers (id, email, name, created_at) VALUES
  (1, 'alex@example.com', 'Alex Rivera', '2025-01-01T09:00:00.000Z'),
  (2, 'sam@example.com', 'Sam Carter', '2025-01-02T10:30:00.000Z');

INSERT INTO products (id, name, price_cents, stock, is_active, created_at) VALUES
  (1, 'Wireless Mouse', 2499, 10, 1, '2025-01-03T09:00:00.000Z'),
  (2, 'Notebook', 2500, 20, 1, '2025-01-03T10:00:00.000Z'),
  (3, 'Legacy Mug', 1299, 4, 0, '2025-01-03T11:00:00.000Z'),
  (4, 'Mechanical Keyboard', 4999, 2, 1, '2025-01-03T12:00:00.000Z'),
  (5, 'Design Systems Book', 1500, 5, 1, '2025-01-03T13:00:00.000Z');

INSERT INTO orders (id, customer_id, status, total_cents, created_at, updated_at) VALUES
  (1, 1, 'pending', 7498, '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'),
  (2, 2, 'paid', 4999, '2025-01-11T10:00:00.000Z', '2025-01-11T10:30:00.000Z'),
  (3, 1, 'shipped', 1500, '2025-01-12T11:00:00.000Z', '2025-01-12T12:00:00.000Z'),
  (4, 2, 'cancelled', 2500, '2025-01-13T12:00:00.000Z', '2025-01-13T12:15:00.000Z');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents, line_total_cents) VALUES
  (1, 1, 1, 2, 2499, 4998),
  (2, 1, 2, 1, 2500, 2500),
  (3, 2, 4, 1, 4999, 4999),
  (4, 3, 5, 1, 1500, 1500),
  (5, 4, 2, 1, 2500, 2500);
