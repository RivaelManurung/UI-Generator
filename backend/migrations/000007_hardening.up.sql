-- Indexing + referential-integrity hardening (additive, idempotent).

-- Hot-path indexes.
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_idem
  ON credit_transactions(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_free_templates_created_by ON free_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_free_templates_source_page ON free_templates(source_page_id);

-- FKs added NOT VALID so existing rows aren't re-validated; new writes are enforced.
-- Wrapped in DO blocks to stay idempotent (Postgres has no ADD CONSTRAINT IF NOT EXISTS).
DO $$ BEGIN
  ALTER TABLE free_templates ADD CONSTRAINT fk_free_templates_source_page
    FOREIGN KEY (source_page_id) REFERENCES project_pages(id) ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT fk_payments_package
    FOREIGN KEY (package_slug) REFERENCES credit_packages(slug) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ledger integrity: the polymorphic reference pair must be both set or both null.
DO $$ BEGIN
  ALTER TABLE credit_transactions ADD CONSTRAINT chk_credit_tx_reference
    CHECK ((reference_type IS NULL) = (reference_id IS NULL)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
