-- Add 'posted' to pillar_ideas status check constraint
-- Run this in Supabase SQL Editor

-- Drop old constraint and add new one allowing 'posted'
ALTER TABLE pillar_ideas DROP CONSTRAINT IF EXISTS pillar_ideas_status_check;
ALTER TABLE pillar_ideas ADD CONSTRAINT pillar_ideas_status_check
  CHECK (status IN ('draft', 'approved', 'needs_revision', 'standby', 'posted'));
