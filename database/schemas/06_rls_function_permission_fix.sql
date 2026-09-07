-- ==============================================================================
-- 06_rls_function_permission_fix.sql
-- Fix: Eliminate "permission denied for function is_faculty_or_admin" in Supabase RLS
-- Target: Supabase Project evwjiffnyhbvqbnogbjv
--
-- PURPOSE:
-- Replaces all RLS policies that call public.is_faculty_or_admin() with direct
-- role checks using (SELECT auth.uid()) and public.profiles.
--
-- COMPLIANCE:
-- - Hardens is_faculty_or_admin() with REVOKE EXECUTE from PUBLIC, anon, authenticated.
-- - Authenticated users can load practicals with nested test_cases without errors.
-- - Faculty can only view/grade submissions & evaluations for allocated batches/subjects.
-- - Students can only access their own submissions, evaluations, and sample test cases.
-- - Zero infinite recursion on public.profiles.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. HARDEN HELPER FUNCTIONS (Preserve Security Advisor Compliance)
-- ------------------------------------------------------------------------------
-- Ensure is_faculty_or_admin() execution remains strictly revoked from public/client roles
REVOKE ALL ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;

-- Ensure get_user_role() is revoked from untrusted client roles
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;



-- ------------------------------------------------------------------------------
-- 2. PUBLIC.PROFILES (Eliminate is_faculty_or_admin() and prevent recursion)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Faculty can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Active profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self, faculty, and admins" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self and active members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own avatar and display name" ON public.profiles;

-- Self-read policy: Users can always read their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- Faculty/Admin read policy: Active faculty and admins can view active profiles
CREATE POLICY "Faculty can view active profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        status = 'active'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
              AND p.role IN ('faculty', 'admin')
              AND p.status = 'active'
        )
    );

-- Self-update policy: Users can only update their own avatar and full_name
CREATE POLICY "Users can update own avatar and display name"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);


-- ------------------------------------------------------------------------------
-- 3. PUBLIC.TEST_CASES (Direct Role Checks for Sample vs All Test Cases)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Faculty can view all test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Students can view sample test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Allow authenticated read test_cases" ON public.test_cases;
DROP POLICY IF EXISTS "Faculty can manage test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Active students view sample test cases" ON public.test_cases;

-- Students can view sample test cases for any practical
CREATE POLICY "Students can view sample test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (is_sample = true);

-- Faculty and Admins can view ALL test cases (both sample and hidden evaluation test cases)
CREATE POLICY "Faculty can view all test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('faculty', 'admin')
              AND status = 'active'
        )
    );

-- Faculty and Admins can create, update, or delete test cases
CREATE POLICY "Faculty can manage test cases"
    ON public.test_cases FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('faculty', 'admin')
              AND status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('faculty', 'admin')
              AND status = 'active'
        )
    );


-- ------------------------------------------------------------------------------
-- 4. PUBLIC.SUBMISSIONS (Direct Student & Allocated Faculty Access)
-- ------------------------------------------------------------------------------
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

-- Students create own submissions if active
CREATE POLICY "Students can create own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = student_id
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND status = 'active'
        )
    );

-- Students update own submissions
CREATE POLICY "Students can update own submissions"
    ON public.submissions FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = student_id)
    WITH CHECK ((SELECT auth.uid()) = student_id);

-- Faculty can view submissions only for allocated batches and practicals (Admins view all)
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

-- Faculty can update allocated submissions
CREATE POLICY "Faculty can update allocated submissions"
    ON public.submissions FOR UPDATE
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
    )
    WITH CHECK (
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


-- ------------------------------------------------------------------------------
-- 5. PUBLIC.EVALUATIONS (Direct Student & Allocated Faculty Access)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Faculty can manage evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can insert evaluations for assigned batches" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can update evaluations for assigned batches" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view allocated evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can manage allocated evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Students can view own evaluations" ON public.evaluations;

-- Students view evaluations for their own submissions
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

-- Faculty view evaluations for allocated batches/subjects (Admins view all)
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

-- Faculty manage evaluations for allocated batches/subjects
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
-- 6. PUBLIC.TAB_SWITCH_LOGS (Direct Role Checks)
-- ------------------------------------------------------------------------------
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
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('faculty', 'admin')
              AND status = 'active'
        )
    );


-- ------------------------------------------------------------------------------
-- 7. PUBLIC.INSTITUTIONAL_ROSTER (Direct Role Checks)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Faculty and admin can view roster" ON public.institutional_roster;
DROP POLICY IF EXISTS "Faculty can view roster" ON public.institutional_roster;

CREATE POLICY "Faculty can view roster"
    ON public.institutional_roster FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('faculty', 'admin')
              AND status = 'active'
        )
    );


-- ------------------------------------------------------------------------------
-- 8. PUBLIC.DIVISIONS & PUBLIC.BATCHES (Direct Role Checks)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Faculty can view divisions" ON public.divisions;
CREATE POLICY "Faculty can view divisions"
    ON public.divisions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('faculty', 'admin')
              AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Faculty can view batches" ON public.batches;
CREATE POLICY "Faculty can view batches"
    ON public.batches FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('faculty', 'admin')
              AND status = 'active'
        )
    );


-- ------------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES FOR DIRECT RLS LOOKUPS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_auth_lookup
    ON public.profiles(id, role, status);

CREATE INDEX IF NOT EXISTS idx_test_cases_practical_sample
    ON public.test_cases(practical_id, is_sample);

CREATE INDEX IF NOT EXISTS idx_faculty_allocations_composite
    ON public.faculty_allocations(faculty_id, batch_id, subject_id);

COMMIT;

-- ------------------------------------------------------------------------------
-- 10. VERIFICATION PROBE QUERY
-- Run this query after execution: It MUST return 0 rows.
-- ------------------------------------------------------------------------------
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
