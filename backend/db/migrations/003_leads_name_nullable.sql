-- Allow lead name to be NULL (phone is the only required field)
ALTER TABLE leads ALTER COLUMN name DROP NOT NULL;
