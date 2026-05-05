CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  handoff_prepared_at INTEGER,
  handoff_completed_at INTEGER,
  media_deleted_at INTEGER,
  closed_at INTEGER
);

CREATE TABLE IF NOT EXISTS event_settings (
  event_id TEXT PRIMARY KEY,
  organizer_name TEXT,
  event_date TEXT,
  event_type TEXT,
  expected_guests INTEGER,
  retention_policy TEXT,
  storage_warning_pct INTEGER,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  username TEXT NOT NULL,
  device_id TEXT,
  avatar_filename TEXT,
  joined_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_event_username ON users(event_id, username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_event_device   ON users(event_id, device_id) WHERE device_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL,
  user_id TEXT,
  uploader_ip TEXT,
  uploader_name TEXT NOT NULL DEFAULT 'Guest',
  thumb_filename TEXT,
  flagged INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
