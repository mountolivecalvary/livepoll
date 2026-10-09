-- Supabase Schema for Live Poll & Sabbath School Presentation System
-- Paste this script into your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql) and click RUN

-- 1. Create Sessions Table (if not exists)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Share HIM',
  header_image_url TEXT DEFAULT 'https://www.sabbath.school/assets/img/lessons/2026/3/_13fb.png',
  current_question_index INT DEFAULT 0,
  slide_mode TEXT DEFAULT 'VOTING',
  timer_seconds INT DEFAULT 15,
  timer_state TEXT DEFAULT 'IDLE',
  timer_started_at BIGINT,
  timer_duration INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Questions Table (if not exists)
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  question_order INT NOT NULL DEFAULT 1,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT DEFAULT 'A',
  explanation_text TEXT,
  active BOOLEAN DEFAULT false,
  slide_mode TEXT DEFAULT 'VOTING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add session_code Column if Missing (Fixes: column "session_code" does not exist)
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS session_code TEXT DEFAULT '482915';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation_text TEXT;

-- 4. Create Responses Table (if not exists) & add session_code
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS session_code TEXT DEFAULT '482915';

-- 5. Seed default session record for 482915
INSERT INTO public.sessions (session_code, title, header_image_url)
VALUES ('482915', 'Share HIM', 'https://www.sabbath.school/assets/img/lessons/2026/3/_13fb.png')
ON CONFLICT (session_code) DO NOTHING;

-- 6. Link existing questions & responses to session 482915
UPDATE public.questions SET session_code = '482915' WHERE session_code IS NULL;
UPDATE public.responses SET session_code = '482915' WHERE session_code IS NULL;

-- 7. Enable Fast Query Indexes
CREATE INDEX IF NOT EXISTS idx_questions_session ON public.questions(session_code, question_order);
CREATE INDEX IF NOT EXISTS idx_responses_qid ON public.responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_session ON public.responses(session_code);

-- 8. Enable Row Level Security (RLS) & Full Permissive Policies
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for sessions" ON public.sessions;
DROP POLICY IF EXISTS "Public write access for sessions" ON public.sessions;
DROP POLICY IF EXISTS "Public access for sessions" ON public.sessions;
CREATE POLICY "Public access for sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access for questions" ON public.questions;
DROP POLICY IF EXISTS "Public write access for questions" ON public.questions;
DROP POLICY IF EXISTS "Public access for questions" ON public.questions;
CREATE POLICY "Public access for questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access for responses" ON public.responses;
DROP POLICY IF EXISTS "Public insert access for responses" ON public.responses;
DROP POLICY IF EXISTS "Public delete access for responses" ON public.responses;
DROP POLICY IF EXISTS "Public write access for responses" ON public.responses;
DROP POLICY IF EXISTS "Public access for responses" ON public.responses;
CREATE POLICY "Public access for responses" ON public.responses FOR ALL USING (true) WITH CHECK (true);

-- 9. Realtime Publication & Replica Identity (Ensures complete updates/deletes are broadcast)
ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER TABLE public.questions REPLICA IDENTITY FULL;
ALTER TABLE public.responses REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
