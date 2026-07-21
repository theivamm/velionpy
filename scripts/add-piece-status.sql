-- Add status column to calendar_pieces
-- Run this in Supabase SQL Editor

ALTER TABLE calendar_pieces ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'ready_to_post', 'posted'));
