-- ==============================================================================
-- 04_security_advisor_fixes.sql
-- Live Security Advisor Fixes for EduLab (Project evwjiffnyhbvqbnogbjv)
-- Target: Zero Warnings / Errors on Supabase Security Advisors
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PIN search_path ON ALL SECURITY DEFINER & TRIGGER FUNCTIONS
-- Fixes Supabase Advisor: function_search_path_mutable
-- ------------------------------------------------------------------------------

-- 1.1 handle_updated_at()
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
ALTER FUNCTION public.handle_updated_at() SET search_path = '';

-- 1.2 handle_new_auth_user()
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    matched_roster public.institutional_roster%ROWTYPE;
BEGIN
    SELECT * INTO matched_roster
    FROM public.institutional_roster
    WHERE LOWER(email) = LOWER(NEW.email)
    LIMIT 1;

    IF FOUND THEN
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

        UPDATE public.institutional_roster
        SET is_claimed = TRUE,
            claimed_by = NEW.id,
            claimed_at = NOW()
        WHERE id = matched_roster.id;
    ELSE
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
ALTER FUNCTION public.handle_new_auth_user() SET search_path = '';

-- 1.3 get_user_role()
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;
ALTER FUNCTION public.get_user_role() SET search_path = '';

-- 1.4 is_faculty_or_admin()
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
ALTER FUNCTION public.is_faculty_or_admin() SET search_path = '';

-- 1.5 lookup_user_by_identifier()
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
ALTER FUNCTION public.lookup_user_by_identifier(text) SET search_path = '';

-- 1.6 rls_auto_enable() (Dynamically handles event trigger or helper function)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'rls_auto_enable'
    ) LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = ''''', r.nspname, r.proname, r.args);
    END LOOP;
END $$;

-- 1.7 Catch-all for any remaining SECURITY DEFINER functions with mutable search_path
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.prosecdef = true
          AND n.nspname = 'public'
          AND (p.proconfig IS NULL OR NOT array_to_string(p.proconfig, ',') LIKE '%search_path=%')
    ) LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = ''''', r.nspname, r.proname, r.args);
    END LOOP;
END $$;


-- ------------------------------------------------------------------------------
-- 2. REVOKE EXECUTE ON SECURITY DEFINER FUNCTIONS FROM PUBLIC, anon, authenticated
-- Fixes Supabase Advisor: security_definer_function_execute_public
-- ------------------------------------------------------------------------------

-- 2.1 Revoke handle_updated_at
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

-- 2.2 Revoke handle_new_auth_user
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

-- 2.3 Revoke get_user_role
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon, authenticated;

-- 2.4 Revoke is_faculty_or_admin
REVOKE ALL ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;

-- 2.5 Revoke rls_auto_enable
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'rls_auto_enable'
    ) LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', r.nspname, r.proname, r.args);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', r.nspname, r.proname, r.args);
    END LOOP;
END $$;

-- 2.6 Revoke execution on all internal SECURITY DEFINER functions in public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.prosecdef = true
          AND n.nspname = 'public'
          AND p.proname IN ('get_user_role', 'handle_new_auth_user', 'is_faculty_or_admin', 'handle_updated_at', 'rls_auto_enable')
    ) LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', r.nspname, r.proname, r.args);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', r.nspname, r.proname, r.args);
    END LOOP;
END $$;

-- Explicitly allow lookup_user_by_identifier for anonymous/authenticated lookup during sign-in
GRANT EXECUTE ON FUNCTION public.lookup_user_by_identifier(text) TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 3. ELIMINATE is_faculty_or_admin() DEPENDENCIES IN OTHER POLICIES
-- Ensures no policies break now that execute is revoked on is_faculty_or_admin()
-- ------------------------------------------------------------------------------

-- Update divisions policy to direct subquery
DROP POLICY IF EXISTS "Faculty can view divisions" ON public.divisions;
CREATE POLICY "Faculty can view divisions"
    ON public.divisions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role IN ('faculty', 'admin') AND status = 'active'
        )
    );

-- Update batches policy to direct subquery
DROP POLICY IF EXISTS "Faculty can view batches" ON public.batches;
CREATE POLICY "Faculty can view batches"
    ON public.batches FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role IN ('faculty', 'admin') AND status = 'active'
        )
    );

-- Update test_cases policy to direct subquery
DROP POLICY IF EXISTS "Faculty can view all test cases" ON public.test_cases;
CREATE POLICY "Faculty can view all test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role IN ('faculty', 'admin') AND status = 'active'
        )
    );

-- Update institutional_roster policy to direct subquery
DROP POLICY IF EXISTS "Faculty can view roster" ON public.institutional_roster;
CREATE POLICY "Faculty can view roster"
    ON public.institutional_roster FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role IN ('faculty', 'admin') AND status = 'active'
        )
    );


-- ------------------------------------------------------------------------------
-- 4. FIX SUBMISSIONS AND EVALUATIONS RLS TO AUTHORIZE VIA faculty_allocations
-- Faculty access is STRICTLY restricted to allocated batches & subjects
-- ------------------------------------------------------------------------------

-- 4.1 Submissions Policies
DROP POLICY IF EXISTS "Faculty can view batch submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can view allocated batch submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can manage submissions" ON public.submissions;

CREATE POLICY "Faculty can view allocated batch submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (
        -- Admins can view all submissions
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        -- Faculty can only view submissions if allocated to student's batch and practical's subject
        OR EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            JOIN public.profiles st ON st.id = submissions.student_id AND st.batch_id = fa.batch_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = submissions.practical_id
        )
    );

-- Ensure student submission policies are consistent
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
CREATE POLICY "Students can view own submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = student_id);

DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create own submissions" ON public.submissions;
CREATE POLICY "Students can create own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = student_id AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
CREATE POLICY "Students can update own submissions"
    ON public.submissions FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = student_id)
    WITH CHECK ((SELECT auth.uid()) = student_id);

-- 4.2 Evaluations Policies
DROP POLICY IF EXISTS "Faculty can manage evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view allocated evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can manage allocated evaluations" ON public.evaluations;

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

DROP POLICY IF EXISTS "Students can view own evaluations" ON public.evaluations;
CREATE POLICY "Students can view own evaluations"
    ON public.evaluations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = evaluations.submission_id AND s.student_id = (SELECT auth.uid())
        )
    );


-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES FOR RLS EVALUATION JOINS
-- Avoids sequential table scans during RLS policy evaluation
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_faculty_allocations_lookup
    ON public.faculty_allocations(faculty_id, batch_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_submissions_practical_student
    ON public.submissions(practical_id, student_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_submission_lookup
    ON public.evaluations(submission_id);

CREATE INDEX IF NOT EXISTS idx_profiles_batch_role_lookup
    ON public.profiles(id, batch_id, role, status);


-- ------------------------------------------------------------------------------
-- 6. NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- Forces PostgREST to immediately pick up privilege revokes and policy updates
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
