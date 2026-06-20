-- Remove the per-project domain setting. The generation pipeline now infers
-- domain context from the prompt, so projects no longer carry a domain field.
ALTER TABLE projects DROP COLUMN IF EXISTS domain;
