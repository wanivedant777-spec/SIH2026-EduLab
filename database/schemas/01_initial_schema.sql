-- ==============================================================================
-- Practical Lab Management Platform (SIH 2026 - Problem Statement SIH26207)
-- Initial Database Schema: PostgreSQL + Supabase (Auth, RLS, Realtime)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES & ROLES
-- Extends Supabase auth.users with institutional metadata
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    roll_number TEXT UNIQUE,
    batch TEXT NOT NULL DEFAULT 'Batch-A',
    role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')) DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Faculty and admin can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('faculty', 'admin')
        )
    );

-- ------------------------------------------------------------------------------
-- 2. PRACTICALS (Lab Experiments)
-- Contains pedagogical theory, algorithm, pseudocode, and 10-mark rubric
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practicals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    course_code TEXT NOT NULL,
    category TEXT NOT NULL,
    aim TEXT NOT NULL,
    algorithm JSONB NOT NULL DEFAULT '[]'::jsonb,
    pseudocode TEXT NOT NULL,
    flowchart_url TEXT,
    max_coding_marks NUMERIC(4, 2) DEFAULT 5.00,
    max_writeup_marks NUMERIC(4, 2) DEFAULT 3.00,
    max_viva_marks NUMERIC(4, 2) DEFAULT 2.00,
    default_starter_codes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Practicals are readable by authenticated users
ALTER TABLE public.practicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view practicals"
    ON public.practicals FOR SELECT
    TO authenticated
    USING (true);

-- ------------------------------------------------------------------------------
-- 3. TEST CASES (Standard & Parameterized per student)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practical_id TEXT NOT NULL REFERENCES public.practicals(id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    is_parameterized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view sample test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (is_sample = true);

CREATE POLICY "Faculty can view all test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('faculty', 'admin')
        )
    );

-- ------------------------------------------------------------------------------
-- 4. SUBMISSIONS & AUTO-EVALUATIONS (Judge0 + ML Tiering)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    practical_id TEXT NOT NULL REFERENCES public.practicals(id) ON DELETE CASCADE,
    language_id INT NOT NULL,
    source_code TEXT NOT NULL,
    total_test_cases INT DEFAULT 0,
    passed_test_cases INT DEFAULT 0,
    pass_percentage NUMERIC(5, 2) DEFAULT 0.00,
    coding_marks NUMERIC(4, 2) DEFAULT 0.00, -- Scored out of 5.00
    adaptive_tier TEXT CHECK (adaptive_tier IN ('Beginner', 'Proficient', 'Advanced')),
    recommended_difficulty TEXT,
    attempt_count INT DEFAULT 1,
    time_spent_seconds INT DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('submitted', 'evaluated', 'flagged')) DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view and insert own submissions"
    ON public.submissions FOR ALL
    TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Faculty can view all submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('faculty', 'admin')
        )
    );

-- ------------------------------------------------------------------------------
-- 5. FACULTY EVALUATIONS (Write-up + Viva Graded Queue)
-- Total 10 marks = 5 Coding (auto) + 3 Writeup (faculty) + 2 Viva (faculty)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID UNIQUE NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    graded_by UUID REFERENCES public.profiles(id),
    writeup_marks NUMERIC(4, 2) CHECK (writeup_marks BETWEEN 0 AND 3.00) DEFAULT 0.00,
    viva_marks NUMERIC(4, 2) CHECK (viva_marks BETWEEN 0 AND 2.00) DEFAULT 0.00,
    faculty_feedback TEXT,
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.faculty_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their evaluation"
    ON public.faculty_evaluations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = faculty_evaluations.submission_id AND s.student_id = auth.uid()
        )
    );

CREATE POLICY "Faculty can manage evaluations"
    ON public.faculty_evaluations FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('faculty', 'admin')
        )
    );

-- ------------------------------------------------------------------------------
-- 6. AUDIT & FOCUS INTEGRITY LOGS (Detect & Inform, No Punitive Erasing)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.focus_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    practical_id TEXT NOT NULL REFERENCES public.practicals(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g. 'window_blur', 'window_focus'
    duration_seconds INT DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.focus_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert their focus events"
    ON public.focus_events FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Faculty can view focus events for batch auditing"
    ON public.focus_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('faculty', 'admin')
        )
    );
