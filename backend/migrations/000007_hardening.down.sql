ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS chk_credit_tx_reference;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_package;
ALTER TABLE free_templates DROP CONSTRAINT IF EXISTS fk_free_templates_source_page;
DROP INDEX IF EXISTS idx_free_templates_source_page;
DROP INDEX IF EXISTS idx_free_templates_created_by;
DROP INDEX IF EXISTS idx_api_keys_key_hash;
DROP INDEX IF EXISTS idx_credit_transactions_user_idem;
