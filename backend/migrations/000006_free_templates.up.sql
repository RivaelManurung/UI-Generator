-- Free templates: a generated page published by an admin as a downloadable freebie.

CREATE TABLE IF NOT EXISTS free_templates (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug               TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  page_type          TEXT NOT NULL DEFAULT 'dashboard',
  design_system_slug TEXT NOT NULL DEFAULT 'shadcn',
  brand              TEXT NOT NULL DEFAULT '',
  category           TEXT NOT NULL DEFAULT '',
  schema_json        JSONB NOT NULL DEFAULT '{}',
  generated_code     TEXT NOT NULL DEFAULT '',
  published          BOOLEAN NOT NULL DEFAULT true,
  downloads          INT NOT NULL DEFAULT 0,
  source_page_id     UUID,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_free_templates_published ON free_templates(published);
