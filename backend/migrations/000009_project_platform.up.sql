-- Add a per-project target platform so generation can produce a website layout
-- (sidebar / top-nav, multi-column grids) OR a mobile app layout (single column,
-- bottom tab bar, touch-first) from the SAME brief. Chosen at project creation.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web';
