-- ==============================================================================
-- 00_clean_reset.sql
-- COMPLETE CLEAN WIPE SCRIPT FOR SUPABASE
-- Wipes all public tables, triggers, policies, and realtime publications
-- ==============================================================================

-- 1. Remove tables from Realtime publication safely
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.submissions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.evaluations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.tab_switch_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.focus_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.faculty_evaluations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Drop auth triggers and custom functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_faculty_or_admin() CASCADE;

-- 3. Drop all custom tables with CASCADE
DROP TABLE IF EXISTS public.tab_switch_logs CASCADE;
DROP TABLE IF EXISTS public.focus_events CASCADE;
DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.faculty_evaluations CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.test_cases CASCADE;
DROP TABLE IF EXISTS public.practicals CASCADE;
DROP TABLE IF EXISTS public.faculty_allocations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.institutional_roster CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.batches CASCADE;
DROP TABLE IF EXISTS public.divisions CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.colleges CASCADE;

-- Confirmation notice
DO $$
BEGIN
    RAISE NOTICE '✅ Supabase public schema has been completely cleaned and reset!';
END $$;
