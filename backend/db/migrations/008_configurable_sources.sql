-- Add configurable sources list to app_settings
-- This allows admins to manage the source options shown in lead forms

INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'sources_list',
  '["LinkedIn","Facebook","Instagram","Google Ads","Website","Referral","Cold Call","Email Campaign","WhatsApp","Trade Show","Partner","Direct","YouTube","Twitter"]',
  NOW()
)
ON CONFLICT (key) DO NOTHING;
