-- Migration 009: Agent Filtering Performance Indexes
-- Purpose: Add indexes to support role-based lead filtering for agent users
-- Date: 2026-04-09
-- Security: Critical - enables efficient filtering of leads by assigned_to for agent role

-- Add index on assigned_to column for agent role filtering
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Add composite index for combined filtering (updated_at + assigned_to)
-- Used by sync endpoint when filtering by both updated_at and assigned_to
CREATE INDEX IF NOT EXISTS idx_leads_updated_assigned ON leads(updated_at DESC, assigned_to);

-- Verify indexes created
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'leads' 
  AND indexname IN ('idx_leads_assigned_to', 'idx_leads_updated_assigned');
