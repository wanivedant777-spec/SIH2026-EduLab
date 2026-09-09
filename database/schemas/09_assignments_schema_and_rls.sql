-- ==============================================================================
-- 09_assignments_schema_and_rls.sql
-- SIH 2026 EduLab · Practical Lab Management Platform
-- Phase 4: Production Database Model, Data Integrity & RLS for Assignments
-- ==============================================================================
--
-- ARCHITECTURAL ROLE:
-- Manages institutional practical allocations from faculty to student batches:
-- Faculty -> Subject -> Batch -> Assignment -> Practical
--
-- LEVEL IN RLS DAG:
-- Level 2 (Depends on Level 0: faculty_allocations, batches, subjects; Level 1: profiles)
-- ZERO circular dependencies (acyclic DAG verified).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ASSIGNMENTS TABLE (Idempotent Creation / Schema Alignment)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    practical_id UUID NOT NULL REFERENCES public.practicals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely add any columns if assignments table pre-existed with a partial schema
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ NULL;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure practical_id is NOT NULL
DO $$
BEGIN
    -- Delete or clean up any orphan records with null practical_id if they exist
    DELETE FROM public.assignments WHERE practical_id IS NULL;
    ALTER TABLE public.assignments ALTER COLUMN practical_id SET NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Add check constraint on status if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_assignments_status'
    ) THEN
        ALTER TABLE public.assignments ADD CONSTRAINT chk_assignments_status CHECK (status IN ('active', 'archived', 'draft', 'closed'));
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Prevent duplicate assignments of the same practical to the same batch
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_batch_practical_assignment'
    ) THEN
        ALTER TABLE public.assignments ADD CONSTRAINT unique_batch_practical_assignment UNIQUE (batch_id, practical_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;


-- ------------------------------------------------------------------------------
-- 2. HIGH-PERFORMANCE INDEXES (Supabase Postgres Best Practices)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assignments_faculty_id
    ON public.assignments (faculty_id);

CREATE INDEX IF NOT EXISTS idx_assignments_subject_id
    ON public.assignments (subject_id);

CREATE INDEX IF NOT EXISTS idx_assignments_batch_id
    ON public.assignments (batch_id);

CREATE INDEX IF NOT EXISTS idx_assignments_practical_id
    ON public.assignments (practical_id);

-- Composite index for the primary student & faculty query pattern
CREATE INDEX IF NOT EXISTS idx_assignments_batch_subject_status
    ON public.assignments (batch_id, subject_id, status);

CREATE INDEX IF NOT EXISTS idx_assignments_faculty_subject_batch
    ON public.assignments (faculty_id, subject_id, batch_id);


-- ------------------------------------------------------------------------------
-- 3. DATA INTEGRITY ENFORCEMENT TRIGGER
-- Guarantees:
--   1. Practical actually belongs to the specified Subject.
--   2. Faculty is officially allocated to that Subject and Batch in faculty_allocations.
-- Rejects inconsistent combinations at the engine level.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_assignment_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_practical_subject_id UUID;
    v_allocation_exists BOOLEAN;
BEGIN
    -- 1. Verify practical actually belongs to the subject
    SELECT subject_id INTO v_practical_subject_id
    FROM public.practicals
    WHERE id = NEW.practical_id;

    IF v_practical_subject_id IS NULL THEN
        RAISE EXCEPTION 'Data Integrity Violation: Practical % does not exist', NEW.practical_id;
    END IF;

    IF v_practical_subject_id <> NEW.subject_id THEN
        RAISE EXCEPTION 'Data Integrity Violation: Practical % belongs to Subject %, not Subject %',
            NEW.practical_id, v_practical_subject_id, NEW.subject_id;
    END IF;

    -- 2. Verify faculty is officially allocated to this subject and batch
    SELECT EXISTS (
        SELECT 1 FROM public.faculty_allocations
        WHERE faculty_id = NEW.faculty_id
          AND subject_id = NEW.subject_id
          AND batch_id = NEW.batch_id
    ) INTO v_allocation_exists;

    IF NOT v_allocation_exists THEN
        RAISE EXCEPTION 'Data Integrity Violation: Faculty % is not allocated to Subject % and Batch %',
            NEW.faculty_id, NEW.subject_id, NEW.batch_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_assignment_integrity ON public.assignments;
CREATE TRIGGER trg_check_assignment_integrity
    BEFORE INSERT OR UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_assignment_integrity();

-- Auto-update updated_at timestamp trigger
DROP TRIGGER IF EXISTS trg_assignments_updated_at ON public.assignments;
CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Clean up existing or historical policies on assignments
DROP POLICY IF EXISTS "Faculty can view own allocated assignments" ON public.assignments;
DROP POLICY IF EXISTS "Faculty can insert assignments for allocated batches" ON public.assignments;
DROP POLICY IF EXISTS "Faculty can update own allocated assignments" ON public.assignments;
DROP POLICY IF EXISTS "Faculty can delete own allocated assignments" ON public.assignments;
DROP POLICY IF EXISTS "Active students can view assignments for their batch" ON public.assignments;
DROP POLICY IF EXISTS "Admins have full access to assignments" ON public.assignments;
DROP POLICY IF EXISTS "Assignments viewable by authenticated users" ON public.assignments;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.assignments;
DROP POLICY IF EXISTS "Faculty manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students view assignments" ON public.assignments;

-- 4.1 FACULTY: SELECT
-- Faculty can view only assignments where they are the assigned faculty AND allocated to that subject+batch
CREATE POLICY "Faculty can view own allocated assignments"
    ON public.assignments FOR SELECT
    TO authenticated
    USING (
        faculty_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.faculty_allocations fa
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND fa.subject_id = assignments.subject_id
              AND fa.batch_id = assignments.batch_id
        )
    );

-- 4.2 FACULTY: INSERT
-- Faculty can create assignments only for themselves AND where allocated to that subject+batch
CREATE POLICY "Faculty can insert assignments for allocated batches"
    ON public.assignments FOR INSERT
    TO authenticated
    WITH CHECK (
        faculty_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.faculty_allocations fa
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND fa.subject_id = assignments.subject_id
              AND fa.batch_id = assignments.batch_id
        )
    );

-- 4.3 FACULTY: UPDATE
-- Faculty can update only their own allocated assignments
CREATE POLICY "Faculty can update own allocated assignments"
    ON public.assignments FOR UPDATE
    TO authenticated
    USING (
        faculty_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.faculty_allocations fa
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND fa.subject_id = assignments.subject_id
              AND fa.batch_id = assignments.batch_id
        )
    )
    WITH CHECK (
        faculty_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.faculty_allocations fa
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND fa.subject_id = assignments.subject_id
              AND fa.batch_id = assignments.batch_id
        )
    );

-- 4.4 FACULTY: DELETE
-- Faculty can delete only their own allocated assignments
CREATE POLICY "Faculty can delete own allocated assignments"
    ON public.assignments FOR DELETE
    TO authenticated
    USING (
        faculty_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.faculty_allocations fa
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND fa.subject_id = assignments.subject_id
              AND fa.batch_id = assignments.batch_id
        )
    );

-- 4.5 STUDENTS: SELECT ONLY
-- Active students can view assignments strictly matching their enrolled batch
CREATE POLICY "Active students can view assignments for their batch"
    ON public.assignments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
              AND p.batch_id = assignments.batch_id
              AND p.status = 'active'
              AND p.role = 'student'
        )
    );

-- 4.6 ADMINS: FULL ACCESS (via JWT claim)
CREATE POLICY "Admins have full access to assignments"
    ON public.assignments FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

COMMIT;
