-- ==============================================================================
-- Practical Lab Management Platform (SIH 2026)
-- Data Onboarding Guide & Parameterized Ingestion Script
-- (Zero Fake Data: Uses real CSV data provided by College Administration)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1: DEFINE YOUR INSTITUTION & DEPARTMENT
-- (Run once per college / department setup)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_college_id UUID;
    v_dept_id UUID;
    v_div_id UUID;
    v_batch_c1_id UUID;
    v_batch_c2_id UUID;
    v_batch_c3_id UUID;
BEGIN
    -- 1. Insert College (Replace with your actual college details)
    INSERT INTO public.colleges (code, name)
    VALUES ('CLG_GHRCEM', 'G H Raisoni College of Engineering and Management')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_college_id;

    -- 2. Insert Department
    INSERT INTO public.departments (college_id, code, name)
    VALUES (v_college_id, 'CSE-AI', 'Computer Science and Engineering (Artificial Intelligence)')
    ON CONFLICT (college_id, code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_dept_id;

    -- 3. Insert Division (Division C, 2025-2026, Semester 4)
    INSERT INTO public.divisions (department_id, name, academic_year, semester)
    VALUES (v_dept_id, 'Division C', '2025-2026', 4)
    ON CONFLICT (department_id, academic_year, semester, name) DO UPDATE SET semester = EXCLUDED.semester
    RETURNING id INTO v_div_id;

    -- 4. Insert Batches C1, C2, C3
    INSERT INTO public.batches (division_id, name, capacity)
    VALUES (v_div_id, 'C1', 20)
    ON CONFLICT (division_id, name) DO NOTHING
    RETURNING id INTO v_batch_c1_id;

    INSERT INTO public.batches (division_id, name, capacity)
    VALUES (v_div_id, 'C2', 20)
    ON CONFLICT (division_id, name) DO NOTHING
    RETURNING id INTO v_batch_c2_id;

    INSERT INTO public.batches (division_id, name, capacity)
    VALUES (v_div_id, 'C3', 20)
    ON CONFLICT (division_id, name) DO NOTHING
    RETURNING id INTO v_batch_c3_id;

    -- 5. Insert 4 Practical Subjects
    INSERT INTO public.subjects (department_id, code, name, semester)
    VALUES
        (v_dept_id, 'CS201P', 'Data Structures', 4),
        (v_dept_id, 'AI202P', 'introduction to Quantum computing', 4),
        (v_dept_id, 'CS203P', 'Operating Systems', 4),
        (v_dept_id, 'AI204P', 'Python for quantum computing', 4)
    ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name;

    RAISE NOTICE 'Institutional setup completed successfully for College ID: %', v_college_id;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 2: CSV INGESTION INTO institutional_roster
-- ------------------------------------------------------------------------------
-- When uploading via the Supabase Dashboard SQL Editor or psql CLI:
--
-- For Faculty CSV:
-- employee_id,email,name,department,subject_name
--
-- For Student CSV:
-- registration_no,email,name,batch_name
--
-- You can ingest records directly by matching the college and batch names dynamically:
-- Example dynamic insert query for a student record:
--
-- INSERT INTO public.institutional_roster (
--     college_id,
--     identifier,
--     email,
--     full_name,
--     role,
--     department_id,
--     division_id,
--     batch_id
-- )
-- SELECT
--     c.id,
--     'GHR2025AI001',
--     'student001@college.edu',
--     'Student 001',
--     'student',
--     d.id,
--     div.id,
--     b.id
-- FROM public.colleges c
-- JOIN public.departments d ON d.college_id = c.id AND d.code = 'CSE-AI'
-- JOIN public.divisions div ON div.department_id = d.id AND div.name = 'Division C'
-- JOIN public.batches b ON b.division_id = div.id AND b.name = 'C1'
-- WHERE c.code = 'CLG_GHRCEM'
-- ON CONFLICT (college_id, identifier) DO NOTHING;
