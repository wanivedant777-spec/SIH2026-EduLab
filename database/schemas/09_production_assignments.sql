-- Production assignment workflow
-- Faculty can create assignments only for explicitly allocated subject + batch pairs.

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  practical_id uuid REFERENCES public.practicals(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_context
  ON public.assignments(subject_id, batch_id, created_at DESC);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty manage own allocated assignments" ON public.assignments;
CREATE POLICY "Faculty manage own allocated assignments"
ON public.assignments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.faculty_allocations fa
    WHERE fa.faculty_id = auth.uid()
      AND fa.faculty_id = assignments.faculty_id
      AND fa.subject_id = assignments.subject_id
      AND fa.batch_id = assignments.batch_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.faculty_allocations fa
    WHERE fa.faculty_id = auth.uid()
      AND fa.faculty_id = assignments.faculty_id
      AND fa.subject_id = assignments.subject_id
      AND fa.batch_id = assignments.batch_id
  )
);

DROP POLICY IF EXISTS "Students view assignments for own batch" ON public.assignments;
CREATE POLICY "Students view assignments for own batch"
ON public.assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.batch_id = assignments.batch_id
      AND p.role = 'student'
  )
);