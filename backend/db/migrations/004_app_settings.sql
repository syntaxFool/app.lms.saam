CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('app_name', 'LeadFlow India'),
  ('app_logo', '')
ON CONFLICT (key) DO NOTHING;
