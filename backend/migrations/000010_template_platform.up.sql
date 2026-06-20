-- Templates can target a website or a mobile app, mirroring projects.platform.
-- The Studio "Use template" handoff reads this to pre-select the right target.
ALTER TABLE templates ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web';
