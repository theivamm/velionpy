-- Run this in Supabase SQL Editor
-- Schema for VELION apps (social media calendar + dashboard)

-- ============================================================
-- Shared tables
-- ============================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (NEW.id, '', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Dashboard tables (clients)
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  phone TEXT,
  avatar_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lead')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
CREATE POLICY "Authenticated users can manage clients"
  ON clients FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Calendar / Social Media tables
-- ============================================================

-- Calendar Pieces table
CREATE TABLE IF NOT EXISTS calendar_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('carousel', 'story', 'reel', 'post')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  media_url TEXT,
  media_additional TEXT[] DEFAULT '{}',
  pillar_idea_id UUID REFERENCES pillar_ideas(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly Briefs table
CREATE TABLE IF NOT EXISTS monthly_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Pillar Ideas table
CREATE TABLE IF NOT EXISTS pillar_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_id UUID REFERENCES monthly_briefs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  pillar TEXT NOT NULL DEFAULT 'General',
  theme TEXT NOT NULL DEFAULT 'General',
  type TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('carousel', 'story', 'reel', 'post')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'needs_revision', 'standby')),
  feedback TEXT,
  scheduled_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pillar_ideas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Brief Comments table
CREATE TABLE IF NOT EXISTS brief_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES monthly_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idea Comments table
CREATE TABLE IF NOT EXISTS idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES pillar_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Piece Comments table
CREATE TABLE IF NOT EXISTS piece_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id UUID NOT NULL REFERENCES calendar_pieces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  x_pos FLOAT NOT NULL,
  y_pos FLOAT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_calendar_pieces_user_date ON calendar_pieces(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_monthly_briefs_user_month ON monthly_briefs(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_pillar_ideas_user ON pillar_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_idea ON idea_comments(idea_id, created_at);
CREATE INDEX IF NOT EXISTS idx_brief_comments_brief ON brief_comments(brief_id, created_at);
CREATE INDEX IF NOT EXISTS idx_piece_comments_piece ON piece_comments(piece_id, created_at);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE calendar_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillar_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE piece_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage own calendar pieces" ON calendar_pieces;
CREATE POLICY "Authenticated users can manage calendar pieces"
  ON calendar_pieces FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage own monthly briefs" ON monthly_briefs;
CREATE POLICY "Authenticated users can manage monthly briefs"
  ON monthly_briefs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage own pillar ideas" ON pillar_ideas;
CREATE POLICY "Authenticated users can manage pillar ideas"
  ON pillar_ideas FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage comments on their ideas" ON idea_comments;
CREATE POLICY "Authenticated users can manage idea comments"
  ON idea_comments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage brief comments" ON brief_comments;
CREATE POLICY "Authenticated users can manage brief comments"
  ON brief_comments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage piece comments" ON piece_comments;
CREATE POLICY "Authenticated users can manage piece comments"
  ON piece_comments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Auto-update triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_calendar_pieces_updated_at ON calendar_pieces;
CREATE TRIGGER update_calendar_pieces_updated_at
  BEFORE UPDATE ON calendar_pieces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_monthly_briefs_updated_at ON monthly_briefs;
CREATE TRIGGER update_monthly_briefs_updated_at
  BEFORE UPDATE ON monthly_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_pillar_ideas_updated_at ON pillar_ideas;
CREATE TRIGGER update_pillar_ideas_updated_at
  BEFORE UPDATE ON pillar_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
