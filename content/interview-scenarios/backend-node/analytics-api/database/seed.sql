INSERT INTO accounts (id, name, plan, created_at) VALUES
  (1, 'Acme Analytics', 'pro', '2025-01-01T09:00:00.000Z'),
  (2, 'Globex Labs', 'enterprise', '2025-01-02T09:00:00.000Z'),
  (3, 'Quiet Co', 'free', '2025-01-03T09:00:00.000Z');

INSERT INTO events (id, external_id, account_id, user_id, event_type, occurred_at, properties_json, created_at) VALUES
  (1, 'evt_001', 1, 'user_1', 'page_view', '2025-01-10T00:00:00.000Z', '{"path":"/landing"}', '2025-01-10T00:00:01.000Z'),
  (2, 'evt_002', 1, 'user_1', 'signup', '2025-01-10T09:00:00.000Z', '{"source":"organic"}', '2025-01-10T09:00:01.000Z'),
  (3, 'evt_003', 1, 'user_1', 'project_created', '2025-01-10T10:00:00.000Z', '{"project_id":"proj_1"}', '2025-01-10T10:00:01.000Z'),
  (4, 'evt_004', 1, 'user_2', 'page_view', '2025-01-10T11:00:00.000Z', '{"path":"/dashboard"}', '2025-01-10T11:00:01.000Z'),
  (5, 'evt_005', 1, 'user_2', 'signup', '2025-01-10T12:00:00.000Z', '{"source":"paid"}', '2025-01-10T12:00:01.000Z'),
  (6, 'evt_006', 1, 'user_3', 'page_view', '2025-01-11T09:00:00.000Z', '{"path":"/projects"}', '2025-01-11T09:00:01.000Z'),
  (7, 'evt_007', 1, 'user_3', 'signup', '2025-01-11T10:00:00.000Z', '{"source":"referral"}', '2025-01-11T10:00:01.000Z'),
  (8, 'evt_008', 1, 'user_3', 'project_created', '2025-01-11T11:00:00.000Z', '{"project_id":"proj_2"}', '2025-01-11T11:00:01.000Z'),
  (9, 'evt_009', 1, 'user_3', 'subscription_started', '2025-01-11T12:00:00.000Z', '{"plan":"pro"}', '2025-01-11T12:00:01.000Z'),
  (10, 'evt_010', 1, 'user_2', 'invite_sent', '2025-01-11T13:00:00.000Z', '{"count":1}', '2025-01-11T13:00:01.000Z'),
  (11, 'evt_011', 1, 'user_2', 'subscription_cancelled', '2025-01-12T08:00:00.000Z', '{"reason":"budget"}', '2025-01-12T08:00:01.000Z'),
  (12, 'evt_012', 1, 'user_4', 'page_view', '2025-01-13T08:00:00.000Z', '{"path":"/settings"}', '2025-01-13T08:00:01.000Z'),
  (13, 'evt_201', 2, 'globex_1', 'page_view', '2025-01-10T09:00:00.000Z', '{"path":"/admin"}', '2025-01-10T09:00:01.000Z'),
  (14, 'evt_202', 2, 'globex_1', 'signup', '2025-01-11T09:00:00.000Z', '{"source":"enterprise"}', '2025-01-11T09:00:01.000Z'),
  (15, 'evt_013', 1, 'user_1', 'page_view', '2025-01-12T23:59:59.999Z', '{"path":"/billing"}', '2025-01-13T00:00:00.000Z'),
  (16, 'evt_014', 1, 'user_1', 'invite_sent', '2025-01-10T13:00:00.000Z', '{"count":2}', '2025-01-10T13:00:01.000Z'),
  (17, 'evt_015', 1, 'user_5', 'subscription_started', '2025-01-12T09:00:00.000Z', '{"plan":"pro"}', '2025-01-12T09:00:01.000Z');
