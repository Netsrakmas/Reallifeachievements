CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '🙂',
  bio TEXT NOT NULL DEFAULT '',
  is_system INTEGER NOT NULL DEFAULT 0,
  soft_ban_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS friendships (
  user_a INTEGER NOT NULL REFERENCES users(id),
  user_b INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  naam TEXT NOT NULL,
  emoji TEXT NOT NULL,
  categorie TEXT NOT NULL CHECK (categorie IN ('goed','ondeugd','neutraal')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common','uncommon','rare','legendary')),
  beschrijving TEXT NOT NULL,
  is_secret INTEGER NOT NULL DEFAULT 0,
  is_auto INTEGER NOT NULL DEFAULT 0,
  chain_slug TEXT,
  chain_step INTEGER
);

CREATE TABLE IF NOT EXISTS awards (
  id INTEGER PRIMARY KEY,
  badge_id INTEGER NOT NULL REFERENCES badges(id),
  giver_id INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER NOT NULL REFERENCES users(id) CHECK (giver_id != recipient_id),
  citation TEXT NOT NULL,
  photo_path TEXT,
  photo_late INTEGER NOT NULL DEFAULT 0,
  in_person INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disputed','restored')),
  anomaly_zeroed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_awards_recipient ON awards (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_awards_created ON awards (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_awards_giver ON awards (giver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vouches (
  id INTEGER PRIMARY KEY,
  award_id INTEGER NOT NULL REFERENCES awards(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  stance TEXT NOT NULL CHECK (stance IN ('vouch','doubt')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (award_id, user_id)
);

CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY,
  award_id INTEGER NOT NULL REFERENCES awards(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (award_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  award_id INTEGER REFERENCES awards(id),
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS award_tokens (
  token TEXT PRIMARY KEY,
  giver_id INTEGER NOT NULL REFERENCES users(id),
  badge_id INTEGER NOT NULL REFERENCES badges(id),
  citation TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL,
  claimed_award_id INTEGER REFERENCES awards(id)
);
CREATE INDEX IF NOT EXISTS idx_tokens_giver ON award_tokens (giver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_log (
  id INTEGER PRIMARY KEY,
  award_id INTEGER REFERENCES awards(id),
  user_id INTEGER REFERENCES users(id),
  rule TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
