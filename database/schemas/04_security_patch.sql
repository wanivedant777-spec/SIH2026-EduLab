-- ==============================================================================
-- 04_security_patch.sql
-- Minimal SQL Patch: Function search_path Hardening & Execution Revocation
-- Targets: Project evwjiffnyhbvqbnogbjv
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PIN search_path (Fixes: function_search_path_mutable)
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_new_auth_user() SET search_path = '';
ALTER FUNCTION public.get_user_role() SET search_path = '';
ALTER FUNCTION public.is_faculty_or_admin() SET search_path = '';

-- Pin rls_auto_enable() if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) THEN
        ALTER FUNCTION public.rls_auto_enable() SET search_path = '';
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 2. REVOKE EXECUTE (Fixes: security_definer_function_execute_public)
-- ------------------------------------------------------------------------------
-- Revoke handle_updated_at()
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

-- Revoke handle_new_auth_user()
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

-- Revoke get_user_role()
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon, authenticated;

-- Revoke is_faculty_or_admin()
REVOKE ALL ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;

-- Revoke rls_auto_enable()
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) THEN
        REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
