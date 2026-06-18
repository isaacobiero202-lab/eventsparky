-- ====================================================================
-- EVENT SPARK DATABASE SETUP SCHEMAS
-- Execute this SQL script in the Supabase SQL Editor Workspace.
-- It provisions tables, automatic signup triggers, and security rules.
-- ====================================================================

-- 1. PROFILES SCHEMA (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('admin', 'organizer', 'attendee')) DEFAULT 'attendee' NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. EVENTS SCHEMA 
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  price NUMERIC DEFAULT 0 CHECK (price >= 0) NOT NULL,
  capacity INTEGER DEFAULT 0 CHECK (capacity >= 0) NOT NULL, -- 0 represents unlimited/no cap
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. REGISTRATIONS SCHEMA
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('registered', 'cancelled')) DEFAULT 'registered' NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id, user_id, status) -- Disallow double active reservations
);

-- 4. FEEDBACK SCHEMA
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all schema lists
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- AUTOMATIC SIGNUP PROFILE SYNC TRIGGER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Spark User'),
    COALESCE(new.raw_user_meta_data->>'role', 'attendee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- A. PROFILES POLICIES
CREATE POLICY "Public Profiles are viewable by anyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- B. EVENTS POLICIES
CREATE POLICY "Events list is publicly readable" 
ON public.events FOR SELECT USING (true);

CREATE POLICY "Organizers and Admins can create events" 
ON public.events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role IN ('organizer', 'admin')
  )
);

CREATE POLICY "Creators can update profiles events" 
ON public.events FOR UPDATE USING (
  organizer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Creators can delete profiles events" 
ON public.events FOR DELETE USING (
  organizer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- C. REGISTRATIONS POLICIES
CREATE POLICY "Users can select their own registrations" 
ON public.registrations FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = registrations.event_id AND events.organizer_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Users can register seats" 
ON public.registrations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own seats" 
ON public.registrations FOR UPDATE USING (auth.uid() = user_id);

-- D. FEEDBACK POLICIES
CREATE POLICY "Feedback is readable by everyone" 
ON public.feedback FOR SELECT USING (true);

CREATE POLICY "Registered attendees can leave event feedback" 
ON public.feedback FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.registrations 
    WHERE registrations.event_id = feedback.event_id 
    AND registrations.user_id = auth.uid() 
    AND registrations.status = 'registered'
  )
);

-- ====================================================================
-- BUCKETS SETUP (Execute inside Supabase Storage Dashboard)
-- Create two public buckets: 'event-posters' and 'avatars'
-- ====================================================================
