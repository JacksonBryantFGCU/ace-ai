INSERT INTO users (id, name, email, created_at) VALUES
  (1, 'Alex Rivera', 'alex@example.com', '2025-01-01T09:00:00.000Z'),
  (2, 'Sam Carter', 'sam@example.com', '2025-01-02T10:00:00.000Z'),
  (3, 'Priya Shah', 'priya@example.com', '2025-01-03T11:00:00.000Z');

INSERT INTO posts (id, title, slug, status, created_at) VALUES
  (1, 'Designing APIs for Teams', 'designing-apis-for-teams', 'published', '2025-01-05T09:00:00.000Z'),
  (2, 'Draft Launch Notes', 'draft-launch-notes', 'draft', '2025-01-06T09:00:00.000Z'),
  (3, 'Archived Roadmap', 'archived-roadmap', 'archived', '2025-01-07T09:00:00.000Z'),
  (4, 'SQLite Tips', 'sqlite-tips', 'published', '2025-01-08T09:00:00.000Z');

INSERT INTO comments (id, post_id, author_id, parent_id, body, status, created_at, updated_at) VALUES
  (1, 1, 1, NULL, 'Great post.', 'visible', '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'),
  (2, 1, 2, 1, 'Thanks!', 'visible', '2025-01-10T09:05:00.000Z', '2025-01-10T09:05:00.000Z'),
  (3, 1, 3, NULL, 'Needs moderation.', 'pending', '2025-01-10T09:10:00.000Z', '2025-01-10T09:10:00.000Z'),
  (4, 1, 2, NULL, 'Hidden for tone.', 'hidden', '2025-01-10T09:15:00.000Z', '2025-01-10T09:15:00.000Z'),
  (5, 1, 3, 1, 'Pending reply.', 'pending', '2025-01-10T09:20:00.000Z', '2025-01-10T09:20:00.000Z'),
  (6, 1, 1, 1, 'Hidden reply.', 'hidden', '2025-01-10T09:25:00.000Z', '2025-01-10T09:25:00.000Z'),
  (7, 4, 3, NULL, 'SQLite comments are useful.', 'visible', '2025-01-10T09:30:00.000Z', '2025-01-10T09:30:00.000Z'),
  (8, 1, 2, NULL, 'Second visible top-level comment.', 'visible', '2025-01-10T09:35:00.000Z', '2025-01-10T09:35:00.000Z'),
  (9, 1, 3, NULL, 'Third visible top-level comment.', 'visible', '2025-01-10T09:40:00.000Z', '2025-01-10T09:40:00.000Z'),
  (10, 2, 1, NULL, 'Draft post comment.', 'visible', '2025-01-10T09:45:00.000Z', '2025-01-10T09:45:00.000Z');
