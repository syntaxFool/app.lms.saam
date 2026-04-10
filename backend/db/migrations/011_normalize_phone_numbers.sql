-- Migration 011: Add normalized phone numbers for duplicate detection
-- Prevents duplicate leads with same phone number in different formats
-- Examples: '8452093228', '+91 8452093228', '+918452093228' all normalize to '+918452093228'

-- Function to normalize phone to E.164 format (remove spaces, ensure + prefix)
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digits except + at the start
  cleaned := regexp_replace(phone, '[^0-9+]', '', 'g');
  
  -- Remove + signs that aren't at the start
  IF position('+' in cleaned) > 1 THEN
    cleaned := replace(cleaned, '+', '');
    cleaned := '+' || cleaned;
  END IF;
  
  -- If starts with +, keep it
  IF left(cleaned, 1) = '+' THEN
    RETURN cleaned;
  END IF;
  
  -- If 10 digits (Indian format), prepend +91
  IF length(cleaned) = 10 THEN
    RETURN '+91' || cleaned;
  END IF;
  
  -- For other lengths, assume it already has country code
  RETURN '+' || cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add normalized_phone column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS normalized_phone TEXT;

-- Populate normalized_phone from existing phone column
UPDATE leads 
SET normalized_phone = normalize_phone(phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Find and mark duplicates before creating unique constraint
-- For duplicate phone numbers, keep the oldest one and add ' (duplicate N)' suffix to others
WITH duplicates AS (
  SELECT 
    id,
    normalized_phone,
    ROW_NUMBER() OVER (PARTITION BY normalized_phone ORDER BY created_at ASC) as rn
  FROM leads
  WHERE normalized_phone IS NOT NULL
)
UPDATE leads
SET normalized_phone = leads.normalized_phone || ' (duplicate ' || duplicates.rn - 1 || ')'
FROM duplicates
WHERE leads.id = duplicates.id 
  AND duplicates.rn > 1
  AND leads.normalized_phone IS NOT NULL;

-- Create unique index on normalized_phone (partial index - only non-null values)
CREATE UNIQUE INDEX idx_leads_normalized_phone 
ON leads(normalized_phone) 
WHERE normalized_phone IS NOT NULL;

-- Trigger function to auto-populate normalized_phone on insert/update
CREATE OR REPLACE FUNCTION set_normalized_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.normalized_phone := normalize_phone(NEW.phone);
  ELSE
    NEW.normalized_phone := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_normalized_phone ON leads;
CREATE TRIGGER trigger_set_normalized_phone
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_phone();

-- Comments
COMMENT ON COLUMN leads.normalized_phone IS 'Phone number normalized to E.164 format for duplicate detection';
COMMENT ON FUNCTION normalize_phone(TEXT) IS 'Normalizes phone numbers to E.164 format (+[country code][number])';
