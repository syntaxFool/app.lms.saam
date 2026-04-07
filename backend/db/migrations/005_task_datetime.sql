-- ============================================================
-- Task Due Date/Time Support
-- Change due_date from DATE to TIMESTAMPTZ to support time
-- ============================================================

-- Alter the due_date column to support both date and time
ALTER TABLE tasks ALTER COLUMN due_date TYPE TIMESTAMPTZ USING due_date::TIMESTAMPTZ;

-- Update the index to reflect the new type (no change needed, just for documentation)
-- idx_tasks_due_date already exists and will work with TIMESTAMPTZ
