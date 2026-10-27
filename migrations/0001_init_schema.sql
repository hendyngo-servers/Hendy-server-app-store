PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info','warning','error')),
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android','ios','windows','macos')),
  format TEXT NOT NULL CHECK (format IN ('apk','aab','ipa','exe','msix','dmg','pkg')),
  object_key TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL DEFAULT '',
  changelog TEXT NOT NULL DEFAULT '',
  min_os_version TEXT,
  created_at TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_releases_published_created ON releases(published, created_at DESC);
CREATE TABLE IF NOT EXISTS certs_metadata (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  platform TEXT NOT NULL,
  expires_at TEXT,
  fingerprint_sha256 TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','maintainer','viewer')),
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);
