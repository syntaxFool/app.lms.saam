-- ============================================================
-- Task Resolution Support
-- Add resolution field to track completion notes
-- ============================================================

-- Add resolution column to tasks table
ALTER TABLE tasks ADD COLUMN resolution TEXT;

-- Add index for faster queries on completed tasks with resolutions
CREATE INDEX idx_tasks_resolution ON tasks(resolution) WHERE status = 'completed';
