CREATE TABLE links (
  id INTEGER PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  title TEXT,
  is_active INTEGER NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE clicks (
  id INTEGER PRIMARY KEY,
  link_id INTEGER NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  clicked_at TEXT NOT NULL,
  FOREIGN KEY (link_id) REFERENCES links(id)
);
