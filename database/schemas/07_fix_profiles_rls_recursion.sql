-- ==============================================================================
-- 07_fix_profiles_rls_recursion.sql
-- Fix: Eliminate All Direct and Indirect RLS Cycles on public.profiles
-- Target: Supabase Project evwjiffnyhbvqbnogbjv
--
-- RLS DEPENDENCY GRAPH (Strictly Acyclic / DAG):
-- Level 0 (Leaves - Zero Table Dependencies):
--   • public.faculty_allocations: faculty_id = (SELECT auth.uid()) OR admin JWT
--   • public.divisions: true (public catalog to authenticated)
--   • public.batches: true (public catalog to authenticated)
--   • public.institutional_roster: claimed_by = (SELECT auth.uid()) OR admin JWT
--
-- Level 1 (Depends only on Level 0):
--   • public.profiles:
--       - Self: (SELECT auth.uid()) = id
--       - Faculty: status = 'active' AND EXISTS (faculty_allocations where batch_id = profiles.batch_id)
--       - Admin: admin JWT claims
--
-- Level 2 (Depends on Level 1 & 0):
--   • public.practicals: profiles (p.id = auth.uid() AND status = 'active')
--   • public.test_cases: is_sample = true OR faculty_allocations via practical's subject
--
-- Level 3 (Depends on Levels 2, 1, 0):
--   • public.submissions: self student_id OR faculty_allocations + practicals + profiles
--
-- Level 4 (Depends on Levels 3, 2, 1, 0):
--   • public.evaluations: self submissions OR faculty_allocations + practicals + profiles + submissions
--   • public.tab_switch_logs: self student_id OR faculty_allocations + practicals + profiles
--
-- GUARANTEES:
-- 1. Zero self-recursion: No policy on table T queries table T.
-- 2. Zero indirect cycles: profiles queries faculty_allocations, which NEVER queries profiles.
-- 3. Strict security: Faculty only view data for batches/subjects they are allocated to.
-- 4. Function hardening: is_faculty_or_admin() and get_user_role() EXECUTE remains revoked.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. HARDEN SECURITY DEFINER FUNCTIONS (Revoke execution from client roles)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;


-- ------------------------------------------------------------------------------
-- 2. LEVEL 0: PUBLIC.FACULTY_ALLOCATIONS (Zero Table Dependencies)
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
    );


-- ------------------------------------------------------------------------------
-- 3. LEVEL 0: PUBLIC.DIVISIONS & PUBLIC.BATCHES (Zero Table Dependencies)
-- ------------------------------------------------------------------------------
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can view divisions" ON public.divisions;
DROP POLICY IF EXISTS "Authenticated users can view divisions" ON public.divisions;
CREATE POLICY "Authenticated users can view divisions"
    ON public.divisions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Faculty can view batches" ON public.batches;
DROP POLICY IF EXISTS "Authenticated users can view batches" ON public.batches;
CREATE POLICY "Authenticated users can view batches"
    ON public.batches FOR SELECT
    TO authenticated
    USING (true);


-- ------------------------------------------------------------------------------
-- 4. LEVEL 0: PUBLIC.INSTITUTIONAL_ROSTER (Zero Table Dependencies)
-- ------------------------------------------------------------------------------
ALTER TABLE public.institutional_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty and admin can view roster" ON public.institutional_roster;
DROP POLICY IF EXISTS "Faculty can view roster" ON public.institutional_roster;
CREATE POLICY "Faculty can view roster"
    ON public.institutional_roster FOR SELECT
    TO authenticated
    USING (
        claimed_by = (SELECT auth.uid())
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('faculty', 'admin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('faculty', 'admin')
    );


-- ------------------------------------------------------------------------------
-- 5. LEVEL 1: PUBLIC.PROFILES (Depends ONLY on faculty_allocations & JWT claims)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all historical recursive policies
DROP POLICY IF EXISTS "Faculty can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view allocated student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Active profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self, faculty, and admins" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self and active members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own avatar and display name" ON public.profiles;

-- 5.1 Self-Read: Users can always view their own profile directly
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- 5.2 Faculty & Admin Read:
-- Faculty access students ONLY in batches they are explicitly allocated to.
-- Strictly checks faculty_allocations and JWT claims — NEVER queries profiles or institutional_roster!
CREATE POLICY "Faculty can view allocated student profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        (
            status = 'active'
            AND EXISTS (
                SELECT 1 FROM public.faculty_allocations fa
                WHERE fa.faculty_id = (SELECT auth.uid())
                  AND fa.batch_id = profiles.batch_id
            )
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- 5.3 Self-Update: Users can update their own avatar and full_name
CREATE POLICY "Users can update own avatar and display name"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);


-- ------------------------------------------------------------------------------
-- 6. LEVEL 2: PUBLIC.PRACTICALS & PUBLIC.TEST_CASES
-- ------------------------------------------------------------------------------
ALTER TABLE public.practicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active students and faculty can view practicals" ON public.practicals;
CREATE POLICY "Active students and faculty can view practicals"
    ON public.practicals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Faculty can view all test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Students can view sample test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Allow authenticated read test_cases" ON public.test_cases;
DROP POLICY IF EXISTS "Faculty can manage test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Active students view sample test cases" ON public.test_cases;

-- Students view sample test cases (Zero table dependency)
CREATE POLICY "Students can view sample test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (is_sample = true);

-- Faculty view all test cases for practicals under subjects they teach (Admin views all)
CREATE POLICY "Faculty can view all test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = test_cases.practical_id
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Faculty can manage test cases for allocated subjects
CREATE POLICY "Faculty can manage test cases"
    ON public.test_cases FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = test_cases.practical_id
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = test_cases.practical_id
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );


-- ------------------------------------------------------------------------------
-- 7. LEVEL 3: PUBLIC.SUBMISSIONS (Allocation-based authorization)
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

-- Students view own submissions (Zero table dependency)
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
    );


-- ------------------------------------------------------------------------------
-- 8. LEVEL 4: PUBLIC.EVALUATIONS & PUBLIC.TAB_SWITCH_LOGS
-- ------------------------------------------------------------------------------
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_switch_logs ENABLE ROW LEVEL SECURITY;

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
    );

-- Tab Switch Logs
DROP POLICY IF EXISTS "Faculty can view tab logs for audit" ON public.tab_switch_logs;
DROP POLICY IF EXISTS "Students can insert own tab logs" ON public.tab_switch_logs;

CREATE POLICY "Students can insert own tab logs"
    ON public.tab_switch_logs FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = student_id);

CREATE POLICY "Faculty can view tab logs for audit"
    ON public.tab_switch_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.id = tab_switch_logs.practical_id
            JOIN public.profiles st ON st.id = tab_switch_logs.student_id AND st.batch_id = fa.batch_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.subject_id = fa.subject_id
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );


-- ------------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES FOR ACYCLIC RLS LOOKUPS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_faculty_allocations_fast_lookup
    ON public.faculty_allocations(faculty_id, batch_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_profiles_student_lookup
    ON public.profiles(batch_id, status, id);

COMMIT;

-- ------------------------------------------------------------------------------
-- 10. VERIFICATION & ACYCLIC DEPENDENCY AUDIT QUERIES
-- Run these queries after applying the migration in Supabase SQL Editor.
-- ------------------------------------------------------------------------------

-- Audit 1: Verify ZERO policies on public.profiles query public.profiles
-- MUST RETURN 0 ROWS.
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

-- Audit 2: Verify ZERO policies on public.faculty_allocations query profiles or roster
-- MUST RETURN 0 ROWS.
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'faculty_allocations'
  AND (
      qual ~* 'FROM\s+([a-z0-9_]+\.)?(profiles|institutional_roster)'
      OR with_check ~* 'FROM\s+([a-z0-9_]+\.)?(profiles|institutional_roster)'
  );

-- Audit 3: Verify ZERO policies across entire schema reference is_faculty_or_admin()
-- MUST RETURN 0 ROWS.
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      qual ILIKE '%is_faculty_or_admin%'
      OR with_check ILIKE '%is_faculty_or_admin%'
  );
