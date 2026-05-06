const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });

const db = new Database(config.DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migrations for existing DBs
try { db.exec(`ALTER TABLE users ADD COLUMN device_id TEXT`); } catch { /* column exists */ }
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_event_username ON users(event_id, username)`); } catch { /* index exists or duplicates present — uniqueness enforced going forward */ }
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_event_device ON users(event_id, device_id) WHERE device_id IS NOT NULL`); } catch { /* index exists */ }
try { db.exec(`ALTER TABLE photos ADD COLUMN thumb_filename TEXT`); } catch { /* column exists */ }
try { db.exec(`ALTER TABLE events ADD COLUMN handoff_prepared_at INTEGER`); } catch { /* column exists */ }
try { db.exec(`ALTER TABLE events ADD COLUMN handoff_completed_at INTEGER`); } catch { /* column exists */ }
try { db.exec(`ALTER TABLE events ADD COLUMN media_deleted_at INTEGER`); } catch { /* column exists */ }
try { db.exec(`ALTER TABLE events ADD COLUMN closed_at INTEGER`); } catch { /* column exists */ }
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_settings (
      event_id TEXT PRIMARY KEY,
      organizer_name TEXT,
      event_date TEXT,
      event_type TEXT,
      expected_guests INTEGER,
      retention_policy TEXT,
      storage_warning_pct INTEGER,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )
  `);
} catch { /* table exists */ }
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS photo_likes (
      photo_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      liked_at INTEGER NOT NULL,
      PRIMARY KEY (photo_id, user_id),
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
} catch { /* table exists */ }

module.exports = db;
