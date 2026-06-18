-- Credit packages (purchasable top-up packs) and payment orders (Midtrans).

CREATE TABLE IF NOT EXISTS credit_packages (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_idr   INT NOT NULL CHECK (price_idr >= 0),
  credits     INT NOT NULL CHECK (credits > 0),
  sort        INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  description TEXT NOT NULL DEFAULT ''
);

INSERT INTO credit_packages (slug, name, price_idr, credits, sort, description) VALUES
  ('individual', 'Individual',   99000,  12, 1, 'For trying things out'),
  ('silver',     'Silver',      690000, 100, 2, 'Good for freelancing and making money'),
  ('premium',    'Premium',    1250000, 250, 3, 'Best value for professionals')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_slug    TEXT NOT NULL,
  amount_idr      INT NOT NULL,
  credits         INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  provider        TEXT NOT NULL DEFAULT 'midtrans',
  order_id        TEXT NOT NULL UNIQUE,
  snap_token      TEXT NOT NULL DEFAULT '',
  provider_txn_id TEXT NOT NULL DEFAULT '',
  raw_payload     JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
