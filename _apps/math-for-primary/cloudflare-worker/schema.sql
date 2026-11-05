CREATE TABLE IF NOT EXISTS encrypted_profiles (
  account_id TEXT PRIMARY KEY CHECK (length(account_id) = 64),
  write_verifier TEXT NOT NULL CHECK (length(write_verifier) = 64),
  iv TEXT NOT NULL CHECK (length(iv) <= 64),
  ciphertext TEXT NOT NULL CHECK (length(ciphertext) <= 131072),
  schema_version INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_encrypted_profiles_updated_at ON encrypted_profiles(updated_at);
