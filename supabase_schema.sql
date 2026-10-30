-- =================================================================
-- IEEE ICEBREAKER BINGO: SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =================================================================

-- 1. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Participants Table
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branch TEXT DEFAULT '',
    board JSONB NOT NULL,
    completed_lines INT DEFAULT 0,
    completed_count INT DEFAULT 1,
    has_bingo BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_active TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS) with open public access (No logins required)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Allow public read/write on tasks (so admin can manage tasks and users can fetch them)
CREATE POLICY "Allow public read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete tasks" ON public.tasks FOR DELETE USING (true);

-- Allow public read/write on participants
CREATE POLICY "Allow public read participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Allow public insert participants" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update participants" ON public.participants FOR UPDATE USING (true);
CREATE POLICY "Allow public delete participants" ON public.participants FOR DELETE USING (true);

-- 4. Enable Supabase Realtime for instant updates between Admin & Players
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;

-- 5. Seed Initial Icebreaker Tasks
INSERT INTO public.tasks (text, category, is_active) VALUES
  ('Uses Dark Mode on every single app 🌙', 'Tech', true),
  ('Has pulled an all-nighter for a hackathon or exam ☕', 'College', true),
  ('From a different college branch/major than you 🎓', 'Social', true),
  ('Has accidentally pushed an API key or password to GitHub 🙈', 'Tech', true),
  ('Speaks 3 or more languages fluently 🗣️', 'Social', true),
  ('Watched an entire lecture series at 2x speed ⚡', 'College', true),
  ('Takes a quick selfie together! 📸', 'Fun', true),
  ('Owns an Arduino, Raspberry Pi, or ESP32 🤖', 'Tech', true),
  ('Shares the same birth month as you 🎂', 'Social', true),
  ('Has phone battery currently below 25% 🪫', 'Fun', true),
  ('Can recite the first 8 digits of Pi (3.1415926...) 🥧', 'Fun', true),
  ('First-year student attending their first IEEE event 🌟', 'College', true),
  ('Can solve a 3x3 Rubik''s cube in under 2 minutes 🧊', 'Fun', true),
  ('Uses Linux or macOS as their daily driver 🐧', 'Tech', true),
  ('Drinks more than 3 cups of tea/coffee a day ☕', 'College', true),
  ('Knows how to play a musical instrument 🎸', 'Social', true),
  ('Has more than 150 unread notifications right now 📬', 'Fun', true),
  ('Has built a personal project or website 💻', 'Tech', true),
  ('Can name 5 programming languages in 5 seconds ⏱️', 'Tech', true),
  ('Traveled more than 1 hour to get to college today 🚌', 'College', true),
  ('Prefers Tabs over Spaces (or passionate about it!) ⚔️', 'Tech', true),
  ('Has an adorable pet photo to show you 🐶🐱', 'Social', true),
  ('Wearing blue clothes or IEEE merchandise 👕', 'Fun', true),
  ('Can make you laugh with a one-liner joke 😂', 'Fun', true),
  ('Has contributed to open-source software 🌐', 'Tech', true),
  ('Binged an entire anime or Netflix series in 2 days 🍿', 'College', true),
  ('Has a mechanical keyboard with custom switches ⌨️', 'Tech', true),
  ('Knows the lyrics to an entire nostalgic song 🎶', 'Fun', true),
  ('Has participated in a game jam or robotics competition 🎮', 'Tech', true),
  ('Does NOT drink tea or coffee at all! 🥛', 'Quirky', true)
ON CONFLICT DO NOTHING;
