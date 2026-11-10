-- ==============================================================================
-- AnanQuiz / OpenQuiz Database Schema & Row Level Security (RLS) Policies
-- Designed for Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  streak INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Word Progress Table (Spaced Repetition System - SM-2)
CREATE TABLE IF NOT EXISTS public.word_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  strength FLOAT DEFAULT 0.0 CHECK (strength >= 0.0 AND strength <= 1.0),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_due TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  seen_count INTEGER DEFAULT 0,
  wrong_streak INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'learning', 'review', 'mastered')),
  ease_factor FLOAT DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word)
);

-- 3. Preset Quiz Sets
CREATE TABLE IF NOT EXISTS public.quiz_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Custom User Quizzes (Created via AI Prompt or Manual)
CREATE TABLE IF NOT EXISTS public.custom_quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  words JSONB NOT NULL, -- Array of Word objects
  is_public BOOLEAN DEFAULT false,
  author_name TEXT DEFAULT 'Học viên',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Daily Stats Table
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  words_learned INTEGER DEFAULT 0,
  words_drilled INTEGER DEFAULT 0,
  words_examined INTEGER DEFAULT 0,
  mistakes_count INTEGER DEFAULT 0,
  accuracy FLOAT DEFAULT 100.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Security Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own progress" ON public.word_progress FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view public quiz sets" ON public.quiz_sets FOR SELECT USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "Users can view own or public custom quizzes" ON public.custom_quizzes FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage own custom quizzes" ON public.custom_quizzes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own daily stats" ON public.daily_stats FOR ALL USING (auth.uid() = user_id);

-- Trigger for Automatic Profile Creation on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
