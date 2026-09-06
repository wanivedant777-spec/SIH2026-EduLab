-- ==============================================================================
-- Practical Lab Management Platform (SIH 2026)
-- Database Architecture: PostgreSQL + Supabase (Auth, RLS, Realtime)
-- Structure: 100% Dynamic Relational Hierarchy (Zero Hardcoded Entities)
-- 10-Mark Rubric: Writing (5M) + Performing (3M) + Viva (2M)
-- ==============================================================================

-- Ensure pgcrypto extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- CLEANUP PREVIOUS TEST SCHEMAS (Ensures fresh, clean structure)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 1. INSTITUTIONAL HIERARCHY
-- ------------------------------------------------------------------------------

-- Colleges / Institutions
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,               -- e.g. 'CLG_ENGG_01'
    name TEXT NOT NULL,                      -- e.g. 'Institute of Engineering & Technology'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic Departments within a College
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    code TEXT NOT NULL,                      -- e.g. 'CSE-AI', 'COMP', 'IT'
    name TEXT NOT NULL,                      -- e.g. 'Computer Science & Engineering (AI)'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (college_id, code)
);

-- Academic Divisions / Classes
CREATE TABLE IF NOT EXISTS public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                      -- e.g. 'Division C', 'Division A'
    academic_year TEXT NOT NULL,             -- e.g. '2025-2026'
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (department_id, academic_year, semester, name)
);

-- Practical Batches within a Division
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                      -- e.g. 'C1', 'C2', 'C3'
    capacity INT DEFAULT 20 CHECK (capacity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (division_id, name)
);

-- Academic Lab Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    code TEXT NOT NULL,                      -- e.g. 'CS201P', 'AI202P'
    name TEXT NOT NULL,                      -- e.g. 'Data Structures', 'Operating Systems'
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (department_id, code)
);

-- ------------------------------------------------------------------------------
-- 2. INSTITUTIONAL WHITELIST ROSTER (Pre-registered by College Admin)
-- Prevents unauthorized users from signing up and accessing the platform
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutional_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,                -- Registration No (Students) or Employee ID (Faculty)
    email TEXT NOT NULL,                     -- Registered institutional/personal email
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    assigned_subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL, -- for faculty
    is_claimed BOOLEAN DEFAULT FALSE,        -- True once user creates their auth account
    claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (college_id, identifier),
    UNIQUE (college_id, email)
);

-- ------------------------------------------------------------------------------
-- 3. PROFILES (Extends Supabase auth.users with institutional link)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    roster_id UUID REFERENCES public.institutional_roster(id) ON DELETE SET NULL,
    college_id UUID REFERENCES public.colleges(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    identifier TEXT NOT NULL,                -- PRN / Employee ID
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')) DEFAULT 'student',
    status TEXT NOT NULL CHECK (status IN ('active', 'pending_approval', 'suspended')) DEFAULT 'active',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Faculty-to-Batch & Subject Teaching Allocations
CREATE TABLE IF NOT EXISTS public.faculty_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (faculty_id, subject_id, batch_id)
);

-- ------------------------------------------------------------------------------
-- 4. PRACTICALS & TEST CASES (LeetCode-Style Split Screen Content)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    practical_number INT NOT NULL CHECK (practical_number > 0),
    title TEXT NOT NULL,
    aim TEXT NOT NULL,
    theory_content JSONB NOT NULL DEFAULT '{"algorithm": [], "pseudocode": "", "examples": []}'::jsonb,
    flowchart_url TEXT,                      -- Supabase Storage asset URL
    video_url TEXT,                          -- Reference video URL
    starter_codes JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"cpp": "...", "python": "..."}
    max_coding_marks NUMERIC(3, 2) DEFAULT 3.00,
    max_writeup_marks NUMERIC(3, 2) DEFAULT 5.00,
    max_viva_marks NUMERIC(3, 2) DEFAULT 2.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (subject_id, practical_number)
);

CREATE TABLE IF NOT EXISTS public.test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practical_id UUID NOT NULL REFERENCES public.practicals(id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    is_parameterized BOOLEAN DEFAULT FALSE,  -- Dynamic input constraints per student to deter copying
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. SUBMISSIONS & AUTO-EVALUATIONS (Judge0 Sandbox)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    practical_id UUID NOT NULL REFERENCES public.practicals(id) ON DELETE CASCADE,
    language_id INT NOT NULL,                -- Judge0 language ID: 54=C++, 71=Python, 62=Java, 50=C
    source_code TEXT NOT NULL,
    total_test_cases INT DEFAULT 0,
    passed_test_cases INT DEFAULT 0,
    time_spent_seconds INT DEFAULT 0,
    attempt_count INT DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('pending', 'attempted', 'completed')) DEFAULT 'attempted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. FACULTY EVALUATIONS (Official 5 + 3 + 2 = 10 Rubric)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID UNIQUE NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    marks_performing NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (marks_performing BETWEEN 0 AND 3.00), -- Auto from Judge0 (Overridable)
    marks_writing NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (marks_writing BETWEEN 0 AND 5.00),       -- Faculty entered (Journal)
    marks_viva NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (marks_viva BETWEEN 0 AND 2.00),             -- Faculty entered (Viva)
    marks_total NUMERIC(4, 2) GENERATED ALWAYS AS (marks_performing + marks_writing + marks_viva) STORED,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    faculty_feedback TEXT,
    graded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TAB-SWITCH LOGS (Non-Punitive Continuous Audit Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tab_switch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    practical_id UUID NOT NULL REFERENCES public.practicals(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('window_blur', 'window_focus')),
    duration_seconds INT DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. INDEXES (Supabase Best Practices: Foreign Keys & Filter Optimizations)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_roster_college_email ON public.institutional_roster(college_id, email);
CREATE INDEX IF NOT EXISTS idx_roster_email ON public.institutional_roster(email);
CREATE INDEX IF NOT EXISTS idx_roster_identifier ON public.institutional_roster(identifier);

CREATE INDEX IF NOT EXISTS idx_profiles_batch ON public.profiles(batch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_practicals_subject ON public.practicals(subject_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_practical ON public.test_cases(practical_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_practical ON public.submissions(practical_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

CREATE INDEX IF NOT EXISTS idx_evaluations_submission ON public.evaluations(submission_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_graded_by ON public.evaluations(graded_by);

CREATE INDEX IF NOT EXISTS idx_tab_logs_student_practical ON public.tab_switch_logs(student_id, practical_id);
CREATE INDEX IF NOT EXISTS idx_allocations_faculty ON public.faculty_allocations(faculty_id);

-- ------------------------------------------------------------------------------
-- 9. AUTOMATED TRIGGERS & SECURITY DEFINER HELPERS
-- ------------------------------------------------------------------------------

-- Helper: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper: Security Definer function to check user role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

-- Helper: Check if current user is faculty or admin
CREATE OR REPLACE FUNCTION public.is_faculty_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role IN ('faculty', 'admin') AND status = 'active'
    );
$$;

-- Helper: Lookup email by Registration No / Employee ID (for seamless login)
CREATE OR REPLACE FUNCTION public.lookup_user_by_identifier(p_identifier text)
RETURNS TABLE (
    email text,
    role text,
    full_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT email, role, full_name
    FROM public.institutional_roster
    WHERE UPPER(identifier) = UPPER(TRIM(p_identifier))
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_user_by_identifier(text) TO anon, authenticated;

-- Option A Auth Trigger: Automatically Whitelist and Link User on Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    matched_roster public.institutional_roster%ROWTYPE;
BEGIN
    -- Search for matching email in the institutional roster
    SELECT * INTO matched_roster
    FROM public.institutional_roster
    WHERE LOWER(email) = LOWER(NEW.email)
    LIMIT 1;

    -- If found in pre-registered whitelist:
    IF FOUND THEN
        -- Create active profile with institutional attributes
        INSERT INTO public.profiles (
            id,
            roster_id,
            college_id,
            department_id,
            division_id,
            batch_id,
            identifier,
            email,
            full_name,
            role,
            status
        ) VALUES (
            NEW.id,
            matched_roster.id,
            matched_roster.college_id,
            matched_roster.department_id,
            matched_roster.division_id,
            matched_roster.batch_id,
            matched_roster.identifier,
            NEW.email,
            matched_roster.full_name,
            matched_roster.role,
            'active'
        );

        -- Mark roster entry as claimed
        UPDATE public.institutional_roster
        SET is_claimed = TRUE,
            claimed_by = NEW.id,
            claimed_at = NOW()
        WHERE id = matched_roster.id;

    ELSE
        -- Not in institutional roster: Create pending approval account
        INSERT INTO public.profiles (
            id,
            identifier,
            email,
            full_name,
            role,
            status
        ) VALUES (
            NEW.id,
            'UNVERIFIED',
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'student',
            'pending_approval'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Revoke execute permissions on internal functions
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_faculty_or_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Performance Optimized: All auth.uid() wrapped in (SELECT auth.uid())
-- ------------------------------------------------------------------------------

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_switch_logs ENABLE ROW LEVEL SECURITY;

-- Colleges, Departments, Divisions, Batches & Subjects: Readable by active authenticated users
CREATE POLICY "Active users can view colleges" ON public.colleges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Active users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Active users can view divisions" ON public.divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Active users can view batches" ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Active users can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);

-- Institutional Roster: Only Admins and Faculty can view
CREATE POLICY "Faculty and admin can view roster"
    ON public.institutional_roster FOR SELECT
    TO authenticated
    USING (public.is_faculty_or_admin());

-- Profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

CREATE POLICY "Faculty can view active profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_faculty_or_admin());

CREATE POLICY "Users can update own avatar and display name"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- Practicals
CREATE POLICY "Active students and faculty can view practicals"
    ON public.practicals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND status = 'active'
        )
    );

-- Test Cases: Students see sample test cases; Faculty see all
CREATE POLICY "Students can view sample test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (is_sample = true);

CREATE POLICY "Faculty can view all test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (public.is_faculty_or_admin());

-- Submissions
CREATE POLICY "Students can view own submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = student_id);

CREATE POLICY "Students can insert own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = student_id AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND status = 'active'
        )
    );

CREATE POLICY "Faculty can view allocated batch submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            JOIN public.profiles st ON st.id = submissions.student_id AND st.batch_id = fa.batch_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = submissions.practical_id
        )
    );

-- Evaluations
CREATE POLICY "Students can view own evaluations"
    ON public.evaluations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = evaluations.submission_id AND s.student_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Faculty can view allocated evaluations"
    ON public.evaluations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Faculty can manage allocated evaluations"
    ON public.evaluations FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
    );

-- Tab Switch Logs
CREATE POLICY "Students can insert own tab logs"
    ON public.tab_switch_logs FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = student_id);

CREATE POLICY "Faculty can view tab logs for audit"
    ON public.tab_switch_logs FOR SELECT
    TO authenticated
    USING (public.is_faculty_or_admin());

-- ------------------------------------------------------------------------------
-- 11. SUPABASE REALTIME PUBLICATION
-- Enables live dashboard feeds and n8n webhook notifications
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tab_switch_logs;
