-- ==============================================================================
-- 07_fix_profiles_rls_recursion.sql
-- Fix: Eliminate Infinite Recursion in RLS on public.profiles
-- Target: Supabase Project evwjiffnyhbvqbnogbjv
--
-- PROBLEM RESOLVED:
-- The legacy "Faculty can view active profiles" policy performed a subquery on
-- public.profiles inside its own USING expression, causing Postgres error:
-- "infinite recursion detected in policy for relation profiles".
--
-- SOLUTION:
-- 1. Eliminate all self-referencing subqueries on public.profiles.
-- 2. "Users can view own profile" uses direct (SELECT auth.uid()) = id.
-- 3. Faculty authorization to view student profiles is derived cleanly from
--    public.faculty_allocations (via batch_id matching) without touching profiles.
-- 4. Admin authorization is supported via JWT claims and institutional_roster.
-- 5. Add safe non-recursive SELECT policy on public.faculty_allocations.
-- 6. Audit and protect test_cases, submissions, and evaluations from recursion.
-- 7. Maintain strict REVOKE EXECUTE on is_faculty_or_admin() and get_user_role().
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. HARDEN SECURITY DEFINER FUNCTIONS (Preserve strict zero-client execute)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;


-- ------------------------------------------------------------------------------
-- 2. PUBLIC.FACULTY_ALLOCATIONS (Non-recursive allocation access)
-- ------------------------------------------------------------------------------
ALTER TABLE public.faculty_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can view own allocations" ON public.faculty_allocations;
DROP POLICY IF EXISTS "Faculty view own allocations" ON public.faculty_allocations;
DROP POLICY IF EXISTS "Admins can view all allocations" ON public.faculty_allocations;

CREATE POLICY "Faculty can view own allocations"
    ON public.faculty_allocations FOR SELECT
    TO authenticated
    USING (
        faculty_id = (SELECT auth.uid())
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    );


-- ------------------------------------------------------------------------------
-- 3. PUBLIC.PROFILES (Zero self-referencing subqueries — Completely Non-Recursive)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all historical recursive and conflicting policies
DROP POLICY IF EXISTS "Faculty can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view allocated student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Active profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self, faculty, and admins" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self and active members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own avatar and display name" ON public.profiles;

-- 3.1 Self-Read Policy: Authenticated users can always view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- 3.2 Faculty & Admin Read Policy:
-- Faculty access students ONLY in batches they are explicitly allocated to.
-- Authorizes via faculty_allocations and institutional_roster / JWT (ZERO queries to profiles).
CREATE POLICY "Faculty can view allocated student profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- Faculty view active students in allocated batches
        (
            status = 'active'
            AND EXISTS (
                SELECT 1 FROM public.faculty_allocations fa
                WHERE fa.faculty_id = (SELECT auth.uid())
                  AND fa.batch_id = profiles.batch_id
            )
        )
        -- Admin support without querying public.profiles
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    );

-- 3.3 Self-Update Policy: Users can update own profile fields
CREATE POLICY "Users can update own avatar and display name"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);


-- ------------------------------------------------------------------------------
-- 4. PUBLIC.PRACTICALS & PUBLIC.TEST_CASES
-- ------------------------------------------------------------------------------
ALTER TABLE public.practicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active students and faculty can view practicals" ON public.practicals;
CREATE POLICY "Active students and faculty can view practicals"
    ON public.practicals FOR SELECT
    TO authenticated
    USING (
        -- Fast non-recursive check against user's own profile
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Faculty can view all test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Students can view sample test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Allow authenticated read test_cases" ON public.test_cases;
DROP POLICY IF EXISTS "Faculty can manage test cases" ON public.test_cases;

-- Students view sample test cases for practicals
CREATE POLICY "Students can view sample test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (is_sample = true);

-- Faculty view all test cases (via allocated subjects, or admin)
CREATE POLICY "Faculty can view all test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (
        -- Faculty teaching the subject of this practical
        EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = test_cases.practical_id
        )
        -- Or authenticated admin
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    );


-- ------------------------------------------------------------------------------
-- 5. PUBLIC.SUBMISSIONS (Allocation-based authorization)
-- ------------------------------------------------------------------------------
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can view batch submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can manage submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can view allocated batch submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can update allocated submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;

-- Students view own submissions
CREATE POLICY "Students can view own submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = student_id);

-- Students create own submissions
CREATE POLICY "Students can create own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = student_id
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.status = 'active'
        )
    );

-- Students update own submissions
CREATE POLICY "Students can update own submissions"
    ON public.submissions FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = student_id)
    WITH CHECK ((SELECT auth.uid()) = student_id);

-- Faculty view submissions for allocated batches & practicals (Admin views all)
CREATE POLICY "Faculty can view allocated batch submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            JOIN public.profiles st ON st.id = submissions.student_id AND st.batch_id = fa.batch_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = submissions.practical_id
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    );

-- Faculty update allocated submissions
CREATE POLICY "Faculty can update allocated submissions"
    ON public.submissions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            JOIN public.profiles st ON st.id = submissions.student_id AND st.batch_id = fa.batch_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = submissions.practical_id
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            JOIN public.profiles st ON st.id = submissions.student_id AND st.batch_id = fa.batch_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = submissions.practical_id
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    );


-- ------------------------------------------------------------------------------
-- 6. PUBLIC.EVALUATIONS (Allocation-based authorization)
-- ------------------------------------------------------------------------------
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can manage evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can insert evaluations for assigned batches" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can update evaluations for assigned batches" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view allocated evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can manage allocated evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Students can view own evaluations" ON public.evaluations;

-- Students view own evaluations
CREATE POLICY "Students can view own evaluations"
    ON public.evaluations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = evaluations.submission_id
              AND s.student_id = (SELECT auth.uid())
        )
    );

-- Faculty view allocated evaluations
CREATE POLICY "Faculty can view allocated evaluations"
    ON public.evaluations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    );

-- Faculty manage allocated evaluations
CREATE POLICY "Faculty can manage allocated evaluations"
    ON public.evaluations FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.institutional_roster ir
            WHERE ir.claimed_by = (SELECT auth.uid())
              AND ir.role = 'admin'
        )
    );


-- ------------------------------------------------------------------------------
-- 7. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_allocations_composite_lookup
    ON public.faculty_allocations(faculty_id, batch_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_profiles_batch_status_id
    ON public.profiles(batch_id, status, id);

COMMIT;

-- ------------------------------------------------------------------------------
-- 8. VERIFICATION QUERY: Check that NO policy on public.profiles queries profiles
-- (This query MUST return 0 rows after applying the migration)
-- ------------------------------------------------------------------------------
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND (
      qual ~* 'FROM\s+([a-z0-9_]+\.)?profiles'
      OR with_check ~* 'FROM\s+([a-z0-9_]+\.)?profiles'
  );
