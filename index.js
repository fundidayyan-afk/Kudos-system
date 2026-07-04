const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'kudos.db');

const db = new DatabaseSync(DB_PATH);

// Enable foreign key constraints
db.exec('PRAGMA foreign_keys = ON;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kudos (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_visible INTEGER NOT NULL DEFAULT 1,
  is_flagged INTEGER NOT NULL DEFAULT 0,
  moderated_by TEXT REFERENCES users(id),
  moderated_at TEXT,
  reason_for_moderation TEXT,
  moderation_action TEXT CHECK (moderation_action IN ('hidden', 'deleted', 'restored') OR moderation_action IS NULL)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  kudos_id TEXT NOT NULL REFERENCES kudos(id),
  reported_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kudos_created_at ON kudos(created_at);
CREATE INDEX IF NOT EXISTS idx_kudos_is_visible ON kudos(is_visible);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

db.exec(SCHEMA);

module.exports = db;
