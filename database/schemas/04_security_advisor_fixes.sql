-- ==============================================================================
-- 04_security_advisor_fixes.sql
-- Live Security Advisor Fixes for EduLab (Project evwjiffnyhbvqbnogbjv)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PIN search_path ON TRIGGER AND SECURITY DEFINER FUNCTIONS
-- Prevents search_path injection (Supabase Advisor: function_search_path_mutable)
-- ------------------------------------------------------------------------------

-- Pin search_path on handle_updated_at()
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

-- Pin search_path on handle_new_auth_user()
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

-- Pin search_path on get_user_role()
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

-- Pin search_path on is_faculty_or_admin()
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

-- Pin search_path on lookup_user_by_identifier() if present
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

-- Pin search_path on rls_auto_enable() if it exists in any schema
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


-- ------------------------------------------------------------------------------
-- 2. REVOKE EXECUTE ON SECURITY DEFINER FUNCTIONS FROM PUBLIC, anon, authenticated
-- (Supabase Advisor: security_definer_function_execute_public)
-- ------------------------------------------------------------------------------

-- Revoke handle_updated_at
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

-- Revoke handle_new_auth_user
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

-- Revoke get_user_role
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon, authenticated;

-- Revoke is_faculty_or_admin
REVOKE ALL ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;

-- Revoke rls_auto_enable dynamically if it exists
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


-- ------------------------------------------------------------------------------
-- 3. FIX SUBMISSIONS AND EVALUATIONS RLS TO AUTHORIZE VIA faculty_allocations
-- Drops any policies relying purely on is_faculty_or_admin()
-- ------------------------------------------------------------------------------

-- Clean up any legacy or broad policies on submissions
DROP POLICY IF EXISTS "Faculty can view batch submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can view allocated batch submissions" ON public.submissions;

-- Create strict allocation-based policy on submissions
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

-- Clean up any legacy policies on evaluations
DROP POLICY IF EXISTS "Faculty can manage evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view allocated evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can manage allocated evaluations" ON public.evaluations;

-- Create strict allocation-based SELECT policy on evaluations
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

-- Create strict allocation-based ALL (INSERT/UPDATE/DELETE) policy on evaluations
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
-- 4. NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
