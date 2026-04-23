-- ============================================================
-- Add Age and Prior Experience fields to leads
-- ============================================================

ALTER TABLE leads ADD COLUMN age INTEGER;
ALTER TABLE leads ADD COLUMN prior_experience TEXT;
