-- ============================================================
-- webApp x LMS x Shanuzz — PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('superuser', 'admin', 'agent', 'user');

CREATE TABLE users (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username     TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  role         user_role NOT NULL DEFAULT 'user',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────
CREATE TYPE lead_status      AS ENUM ('New', 'Contacted', 'Proposal', 'Won', 'Lost');
CREATE TYPE lead_temperature AS ENUM ('Hot', 'Warm', 'Cold', '');
CREATE TYPE lost_reason_type AS ENUM ('price', 'not_interested', 'competitor', 'invalid_number', 'duplicate', 'other');

CREATE TABLE leads (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  email              TEXT,
  location           TEXT,
  interest           TEXT,
  source             TEXT,
  status             lead_status NOT NULL DEFAULT 'New',
  assigned_to        TEXT,
  temperature        TEXT DEFAULT '',
  value              NUMERIC(12, 2) DEFAULT 0,
  lost_reason        TEXT,
  lost_reason_type   lost_reason_type,
  notes              TEXT,
  follow_up_date     DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_by   TEXT
);

CREATE INDEX idx_leads_status      ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_updated_at  ON leads(updated_at);
CREATE INDEX idx_leads_follow_up   ON leads(follow_up_date);

-- ─────────────────────────────────────────────
-- ACTIVITIES
-- ─────────────────────────────────────────────
CREATE TYPE activity_type AS ENUM (
  'lead_created', 'status_change', 'assignment', 'task',
  'follow_up', 'field_update', 'lost_reason', 'note', 'call', 'message'
);

CREATE TABLE activities (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id         TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type            activity_type NOT NULL,
  note            TEXT NOT NULL,
  created_by      TEXT NOT NULL,
  role            user_role,
  related_task_id TEXT,
  changes         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_lead_id    ON activities(lead_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);

-- ─────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────
CREATE TYPE task_status    AS ENUM ('pending', 'completed', 'dropped');
CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');

CREATE TABLE tasks (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id      TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  note         TEXT,
  due_date     DATE,
  status       task_status NOT NULL DEFAULT 'pending',
  priority     priority_level DEFAULT 'medium',
  created_by   TEXT,
  assigned_to  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_lead_id  ON tasks(lead_id);
CREATE INDEX idx_tasks_status   ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- ─────────────────────────────────────────────
-- DEFAULT SUPERUSER (password: changeme123)
-- Change on first login!
-- ─────────────────────────────────────────────
INSERT INTO users (username, password, name, role)
VALUES (
  'superuser',
  '$2a$12$kmHPKNbcX6nDFT4qXyEcyumyNwa8mRW5HPMuha8Vd9elVVzAU7Vly',
  'Super Admin',
  'superuser'
);
