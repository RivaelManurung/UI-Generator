CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_from_id UUID REFERENCES refresh_tokens(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash_unique ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL,
  default_theme_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS project_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  page_type TEXT NOT NULL,
  current_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(project_id, slug)
);

CREATE TABLE IF NOT EXISTS page_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES project_pages(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  prompt TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  generated_code TEXT NOT NULL,
  quality_score NUMERIC NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(page_id, version_number)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_pages_current_version_fk' 
        AND table_name = 'project_pages'
    ) THEN
        ALTER TABLE project_pages
          ADD CONSTRAINT project_pages_current_version_fk
          FOREIGN KEY (current_version_id) REFERENCES page_versions(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_id UUID REFERENCES project_pages(id) ON DELETE SET NULL,
  request_id TEXT NOT NULL,
  operation TEXT NOT NULL DEFAULT 'generate' CHECK (operation IN ('generate', 'refine')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'analyzing', 'generating_schema', 'validating_schema', 'rendering_code', 'succeeded', 'failed', 'refunded', 'canceled', 'cancelled')),
  prompt TEXT NOT NULL,
  page_type TEXT NOT NULL,
  domain TEXT NOT NULL,
  theme_slug TEXT NOT NULL,
  output_mode TEXT NOT NULL,
  credit_cost INT NOT NULL DEFAULT 1,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generation_job_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('topup', 'reserve', 'usage', 'refund', 'adjustment')),
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  idempotency_key TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  request_key TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, operation, request_key)
);

CREATE TABLE IF NOT EXISTS themes (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  accent TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  page_type TEXT NOT NULL,
  component_hint INT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_pages_project_id ON project_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_page_number ON page_versions(page_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created ON generation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_request_id ON generation_jobs(request_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_user_request_operation ON generation_jobs(user_id, request_id, operation);
CREATE INDEX IF NOT EXISTS idx_generation_job_events_job_created ON generation_job_events(job_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_created ON idempotency_keys(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Missing indexes added for FK/Filter optimization
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_status ON generation_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_rotated_from_id ON refresh_tokens(rotated_from_id);
CREATE INDEX IF NOT EXISTS idx_project_pages_current_version_id ON project_pages(current_version_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_created_by ON page_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_project_id ON generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_page_id ON generation_jobs(page_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id ON credit_transactions(reference_id);

