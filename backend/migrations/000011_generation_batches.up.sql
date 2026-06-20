-- Persist generation batches so idempotency survives a backend restart and works
-- across replicas: a duplicate request with the same (user_id, idem_key) returns
-- the existing batch instead of starting (and charging) a second generation. The
-- in-memory tracker remains the live progress source; this table is the durable
-- dedup + reconstruction record.
CREATE TABLE IF NOT EXISTS generation_batches (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  project_id TEXT NOT NULL,
  idem_key   TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'running',
  total      INT  NOT NULL DEFAULT 0,
  completed  INT  NOT NULL DEFAULT 0,
  error      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One live batch per (user, idem_key). Empty keys are excluded so unkeyed
-- requests never collide.
CREATE UNIQUE INDEX IF NOT EXISTS uq_generation_batches_user_idem
  ON generation_batches (user_id, idem_key)
  WHERE idem_key <> '';

CREATE INDEX IF NOT EXISTS idx_generation_batches_user
  ON generation_batches (user_id, created_at DESC);
