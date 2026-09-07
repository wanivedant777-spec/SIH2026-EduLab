-- ==============================================================================
-- 08_demo_faculty_allocation.sql
-- SIH 2026 EduLab · Futuristic Lab Management Platform
-- Demo Faculty Allocation for Faculty Workflow Validation
-- ==============================================================================
-- Canonical Entities Used:
--   1. Faculty Account : FAC001 (faculty001@college.edu)
--      Profile UUID    : 267914ae-fc60-4a1a-b900-364e6e0fae24
--   2. Subject         : CS201P (Data Structures)
--      Subject UUID    : 24f0fc33-4d3a-40a9-8c5f-185a6679f88b
--   3. Batch           : C1 (Division C, Department CSE-AI)
--      Batch UUID      : 2ced03fc-8c5e-4b5f-a797-ff6a13ae3eb4
--
-- Canonical Table: public.faculty_allocations
-- Foreign Keys:
--   - faculty_id -> public.profiles(id)
--   - subject_id -> public.subjects(id)
--   - batch_id   -> public.batches(id)
-- Constraint: UNIQUE (faculty_id, subject_id, batch_id)
-- Idempotency: ON CONFLICT (faculty_id, subject_id, batch_id) DO NOTHING
-- Security: Preserves all RLS policies, zero mock data, zero frontend changes
-- ==============================================================================

-- 1. Idempotent Allocation Insert using Canonical Resolution
INSERT INTO public.faculty_allocations (faculty_id, subject_id, batch_id)
SELECT
    p.id AS faculty_id,
    s.id AS subject_id,
    b.id AS batch_id
FROM (
    SELECT id FROM public.profiles
    WHERE identifier = 'FAC001' OR email = 'faculty001@college.edu' OR id = '267914ae-fc60-4a1a-b900-364e6e0fae24'::uuid
    LIMIT 1
) p
CROSS JOIN (
    SELECT id FROM public.subjects
    WHERE code = 'CS201P' OR id = '24f0fc33-4d3a-40a9-8c5f-185a6679f88b'::uuid
    LIMIT 1
) s
CROSS JOIN (
    SELECT id FROM public.batches
    WHERE name = 'C1' OR id = '2ced03fc-8c5e-4b5f-a797-ff6a13ae3eb4'::uuid
    LIMIT 1
) b
ON CONFLICT (faculty_id, subject_id, batch_id) DO NOTHING;

-- 2. Verification Query
-- Run this query in Supabase SQL Editor to confirm the active allocation:
SELECT 
    fa.id AS allocation_id,
    p.identifier AS faculty_identifier,
    p.email AS faculty_email,
    p.full_name AS faculty_name,
    s.code AS subject_code,
    s.name AS subject_name,
    b.name AS batch_name,
    d.name AS division_name,
    fa.created_at AS allocated_at
FROM public.faculty_allocations fa
JOIN public.profiles p ON p.id = fa.faculty_id
JOIN public.subjects s ON s.id = fa.subject_id
JOIN public.batches b ON b.id = fa.batch_id
LEFT JOIN public.divisions d ON d.id = b.division_id
WHERE p.identifier = 'FAC001' OR p.email = 'faculty001@college.edu';
