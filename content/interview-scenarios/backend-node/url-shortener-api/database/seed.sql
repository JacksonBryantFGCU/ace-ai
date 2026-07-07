INSERT INTO links (id, short_code, original_url, title, is_active, expires_at, created_at, updated_at) VALUES
  (1, 'docs', 'https://example.com/docs', 'Docs', 1, NULL, '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'),
  (2, 'old', 'https://example.com/old', 'Old Campaign', 1, '2020-01-01T00:00:00.000Z', '2025-01-10T09:05:00.000Z', '2025-01-10T09:05:00.000Z'),
  (3, 'off', 'https://example.com/off', 'Inactive Link', 0, NULL, '2025-01-10T09:10:00.000Z', '2025-01-10T09:10:00.000Z'),
  (4, 'aa0001', 'https://example.com/collision', 'Collision Seed', 1, NULL, '2025-01-10T09:15:00.000Z', '2025-01-10T09:15:00.000Z'),
  (5, 'empty', 'https://example.com/empty', 'No Clicks', 1, NULL, '2025-01-10T09:20:00.000Z', '2025-01-10T09:20:00.000Z'),
  (6, 'bothbad', 'https://example.com/bothbad', 'Inactive Expired', 0, '2020-01-01T00:00:00.000Z', '2025-01-10T09:25:00.000Z', '2025-01-10T09:25:00.000Z');

INSERT INTO clicks (id, link_id, referrer, user_agent, clicked_at) VALUES
  (1, 1, NULL, 'Mozilla/5.0', '2025-01-10T10:00:00.000Z'),
  (2, 1, 'https://google.com', 'Chrome', '2025-01-10T11:00:00.000Z'),
  (3, 1, '', 'Safari', '2025-01-10T12:00:00.000Z'),
  (4, 1, 'https://google.com', 'Chrome', '2025-01-11T10:00:00.000Z'),
  (5, 1, 'https://news.ycombinator.com', 'Firefox', '2025-01-12T10:00:00.000Z'),
  (6, 2, 'https://archive.example.com', 'Bot', '2025-01-09T10:00:00.000Z');
