-- ============================================================
-- Allow all authenticated users to see all data
-- Run this in Supabase SQL Editor
-- ============================================================

-- Profiles: anyone can read all profiles
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Clients: all authenticated users can manage
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
CREATE POLICY "Authenticated users can manage clients"
  ON clients FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Calendar Pieces: all authenticated users can manage
DROP POLICY IF EXISTS "Users can manage own calendar pieces" ON calendar_pieces;
CREATE POLICY "Authenticated users can manage calendar pieces"
  ON calendar_pieces FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Monthly Briefs: all authenticated users can manage
DROP POLICY IF EXISTS "Users can manage own monthly briefs" ON monthly_briefs;
CREATE POLICY "Authenticated users can manage monthly briefs"
  ON monthly_briefs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Pillar Ideas: all authenticated users can manage
DROP POLICY IF EXISTS "Users can manage own pillar ideas" ON pillar_ideas;
CREATE POLICY "Authenticated users can manage pillar ideas"
  ON pillar_ideas FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Idea Comments: all authenticated users can manage
DROP POLICY IF EXISTS "Users can manage comments on their ideas" ON idea_comments;
CREATE POLICY "Authenticated users can manage idea comments"
  ON idea_comments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Brief Comments: all authenticated users can manage
DROP POLICY IF EXISTS "Users can manage brief comments" ON brief_comments;
CREATE POLICY "Authenticated users can manage brief comments"
  ON brief_comments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Piece Comments: all authenticated users can manage
DROP POLICY IF EXISTS "Users can manage piece comments" ON piece_comments;
CREATE POLICY "Authenticated users can manage piece comments"
  ON piece_comments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
