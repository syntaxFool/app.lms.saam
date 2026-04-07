-- Add configurable interests list to app_settings
-- This allows admins to manage the interest options shown in lead forms

INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'interests_list',
  '["Software Development","Mobile App Development","Web Development","Digital Marketing","SEO Services","Social Media Marketing","Graphic Design","UI/UX Design","Cloud Services","Data Analytics","AI/ML Solutions","Cybersecurity","E-commerce Platform","CRM Software","ERP System","Business Consulting"]',
  NOW()
)
ON CONFLICT (key) DO NOTHING;
