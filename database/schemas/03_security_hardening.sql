-- ==============================================================================
-- 03_security_hardening.sql
-- Practical Lab Management Platform (SIH 2026 - EduLab)
-- Security Hardening, Canonical Relational Architecture & 10-Mark Rubric Migration
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEARCH_PATH HARDENING ON ALL FUNCTIONS
-- Prevents search_path injection attacks (CWE-426 / Supabase Advisor Flag)
-- ------------------------------------------------------------------------------

-- Trigger function: handle_updated_at
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

-- Trigger function: handle_new_auth_user
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
$$;

-- Helper: lookup_user_by_identifier with immutable search_path
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

-- Helper: get_user_role with immutable search_path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

-- Helper: is_faculty_or_admin with immutable search_path
CREATE OR REPLACE FUNCTION public.is_faculty_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('faculty', 'admin')
          AND status = 'active'
    );
$$;

-- ------------------------------------------------------------------------------
-- 2. FUNCTION EXECUTION PERMISSION REVOCATION
-- Enforces Principle of Least Privilege on internal database functions
-- ------------------------------------------------------------------------------

-- Revoke default public execute on trigger functions and internal helpers
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_faculty_or_admin() TO authenticated;

-- Allow identifier lookup for unauthenticated sign-in verification
GRANT EXECUTE ON FUNCTION public.lookup_user_by_identifier(text) TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 3. GRANULAR FACULTY AUTHORIZATION VIA faculty_allocations
-- Faculty can ONLY view and grade submissions for batches and subjects they teach
-- ------------------------------------------------------------------------------

-- Drop broad faculty access policies
DROP POLICY IF EXISTS "Faculty can view batch submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can manage evaluations" ON public.evaluations;

-- Enhanced Submissions Policy: Granular allocation check
CREATE POLICY "Faculty can view allocated batch submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (
        -- Admins can view all submissions
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        -- Faculty can only view submissions from batches & subjects allocated to them
        OR EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            JOIN public.profiles st ON st.id = submissions.student_id AND st.batch_id = fa.batch_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = submissions.practical_id
        )
    );

-- Enhanced Evaluations Policy: Faculty can only grade their allocated batches/subjects
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

-- ------------------------------------------------------------------------------
-- 4. OFFICIAL 10-MARK RUBRIC CONSTRAINT VERIFICATION
-- Performing/Coding (3M) + Writing/Journal (5M) + Viva (2M) = 10.0M Total
-- ------------------------------------------------------------------------------
ALTER TABLE public.practicals
    ALTER COLUMN max_coding_marks SET DEFAULT 3.00,
    ALTER COLUMN max_writeup_marks SET DEFAULT 5.00,
    ALTER COLUMN max_viva_marks SET DEFAULT 2.00;

ALTER TABLE public.evaluations
    DROP CONSTRAINT IF EXISTS evaluations_marks_performing_check,
    DROP CONSTRAINT IF EXISTS evaluations_marks_writing_check,
    DROP CONSTRAINT IF EXISTS evaluations_marks_viva_check;

ALTER TABLE public.evaluations
    ADD CONSTRAINT evaluations_marks_performing_check CHECK (marks_performing >= 0 AND marks_performing <= 3),
    ADD CONSTRAINT evaluations_marks_writing_check CHECK (marks_writing >= 0 AND marks_writing <= 5),
    ADD CONSTRAINT evaluations_marks_viva_check CHECK (marks_viva >= 0 AND marks_viva <= 2);

-- ------------------------------------------------------------------------------
-- 5. CANONICAL PRACTICALS & TEST CASES SEED (for CS201P Data Structures)
-- Populates the live canonical practicals catalog if not already present
-- ------------------------------------------------------------------------------
INSERT INTO public.colleges (code, name, city, state)
VALUES ('CLG_GHRCEM', 'G H Raisoni College of Engineering and Management', 'Pune', 'Maharashtra')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.departments (college_id, code, name)
VALUES (
    (SELECT id FROM public.colleges WHERE code = 'CLG_GHRCEM' LIMIT 1),
    'CSE-AI',
    'Computer Science & Engineering (Artificial Intelligence)'
)
ON CONFLICT (college_id, code) DO NOTHING;

INSERT INTO public.divisions (department_id, name, semester, academic_year)
VALUES (
    (SELECT id FROM public.departments WHERE code = 'CSE-AI' LIMIT 1),
    'Division C',
    3,
    '2026-27'
)
ON CONFLICT (department_id, academic_year, semester, name) DO NOTHING;

INSERT INTO public.batches (division_id, name)
VALUES (
    (SELECT id FROM public.divisions WHERE name = 'Division C' AND academic_year = '2026-27' LIMIT 1),
    'C1'
)
ON CONFLICT (division_id, name) DO NOTHING;

INSERT INTO public.subjects (department_id, code, name, semester)
VALUES (
    (SELECT id FROM public.departments WHERE code = 'CSE-AI' LIMIT 1),
    'CS201P',
    'Data Structures & Algorithms Lab',
    3
)
ON CONFLICT (department_id, code) DO NOTHING;

DO $$
DECLARE
    v_subject_id UUID;
    v_prac_id UUID;
BEGIN
    SELECT id INTO v_subject_id FROM public.subjects WHERE code = 'CS201P' LIMIT 1;

    IF v_subject_id IS NOT NULL THEN
        -- Practical 1: Binary Search Tree Insertion & Inorder Traversal
        INSERT INTO public.practicals (
            subject_id,
            practical_number,
            title,
            aim,
            max_coding_marks,
            max_writeup_marks,
            max_viva_marks
        ) VALUES (
            v_subject_id,
            1,
            'Binary Search Tree: Insertion & Inorder Traversal',
            'Implement a Binary Search Tree (BST) supporting dynamic element insertion and Inorder traversal (Left-Root-Right) to yield sorted output.',
            3.00,
            5.00,
            2.00
        )
        ON CONFLICT (subject_id, practical_number) DO UPDATE SET
            title = EXCLUDED.title,
            max_coding_marks = 3.00,
            max_writeup_marks = 5.00,
            max_viva_marks = 2.00
        RETURNING id INTO v_prac_id;

        -- Test cases for BST
        IF v_prac_id IS NOT NULL THEN
            INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample)
            VALUES
                (v_prac_id, E'4\n10 5 20 15', '5 10 15 20', true),
                (v_prac_id, E'5\n30 20 40 10 25', '10 20 25 30 40', false),
                (v_prac_id, E'1\n42', '42', false)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Practical 2: AVL Tree Balancing
        INSERT INTO public.practicals (
            subject_id,
            practical_number,
            title,
            aim,
            max_coding_marks,
            max_writeup_marks,
            max_viva_marks
        ) VALUES (
            v_subject_id,
            2,
            'AVL Tree: Self-Balancing Binary Search Tree',
            'Construct an AVL tree supporting LL, RR, LR, and RL rotations to maintain an absolute balance factor <= 1 across all nodes.',
            3.00,
            5.00,
            2.00
        )
        ON CONFLICT (subject_id, practical_number) DO UPDATE SET
            title = EXCLUDED.title,
            max_coding_marks = 3.00,
            max_writeup_marks = 5.00,
            max_viva_marks = 2.00
        RETURNING id INTO v_prac_id;

        IF v_prac_id IS NOT NULL THEN
            INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample)
            VALUES
                (v_prac_id, E'3\n10 20 30', '20 10 30', true),
                (v_prac_id, E'4\n10 20 30 40', '20 10 30 40', false)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Practical 3: Dijkstra Shortest Path
        INSERT INTO public.practicals (
            subject_id,
            practical_number,
            title,
            aim,
            max_coding_marks,
            max_writeup_marks,
            max_viva_marks
        ) VALUES (
            v_subject_id,
            3,
            'Dijkstra Algorithm: Single-Source Shortest Path',
            'Find the shortest distance from a designated source vertex to all other vertices in a weighted, directed/undirected graph using a priority queue.',
            3.00,
            5.00,
            2.00
        )
        ON CONFLICT (subject_id, practical_number) DO UPDATE SET
            title = EXCLUDED.title,
            max_coding_marks = 3.00,
            max_writeup_marks = 5.00,
            max_viva_marks = 2.00;

    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. LEGACY TABLES ARCHIVE NOTE
-- The following 6 tables are identified as legacy from previous prototype iterations:
--   - public.allowed_students (subsumed by public.institutional_roster)
--   - public.allowed_faculty  (subsumed by public.institutional_roster)
--   - public.students         (subsumed by public.profiles)
--   - public.faculty          (subsumed by public.profiles)
--   - public.faculty_batches  (subsumed by public.faculty_allocations)
--   - public.timetable        (prototype timetable scheduling)
-- They are preserved to avoid any data loss while canonical queries use the newer relational hierarchy.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 7. NOTIFY POSTGREST SCHEMA RELOAD
-- Forces PostgREST API to immediately reload its schema cache and expose new functions
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
