-- A theme now represents a dashboard UI kit / design system (shadcn, reui, antd,
-- mui, chakra, …) that generation targets, not just an accent color.
ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS library TEXT NOT NULL DEFAULT 'shadcn';

ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
