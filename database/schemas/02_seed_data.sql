-- ==============================================================================
-- Seed Data: Sample Practicals & Standard Test Cases
-- ==============================================================================

INSERT INTO public.practicals (
    id,
    title,
    course_code,
    category,
    aim,
    algorithm,
    pseudocode,
    max_coding_marks,
    max_writeup_marks,
    max_viva_marks
) VALUES (
    'prac_dsa_04_bst',
    'Practical 04: Implementation of Binary Search Tree & Traversal',
    'CS204P: Data Structures Lab',
    'Tree Structures',
    'To implement a Binary Search Tree (BST), perform recursive insertion maintaining BST invariants, and verify sorted output via Inorder Traversal.',
    '[
        {"title": "Define Node Structure", "detail": "Create Node structure with integer data, left pointer, and right pointer."},
        {"title": "BST Insertion", "detail": "Recursively place elements strictly smaller to left and greater or equal to right."},
        {"title": "Inorder Traversal", "detail": "Recursively visit left subtree, print current node data, and visit right subtree to yield sorted sequence."},
        {"title": "Verify Output", "detail": "Ensure space-delimited standard output matches expected ascending sequence."}
    ]'::jsonb,
    'function INSERT(root, value):
    if root is NULL then:
        return create_new_node(value)
    if value < root.data then:
        root.left = INSERT(root.left, value)
    else:
        root.right = INSERT(root.right, value)
    return root

function INORDER(root):
    if root is not NULL then:
        INORDER(root.left)
        OUTPUT root.data
        INORDER(root.right)',
    5.00,
    3.00,
    2.00
) ON CONFLICT (id) DO NOTHING;

-- Seed Test Cases for BST Practical
INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample, is_parameterized) VALUES
('prac_dsa_04_bst', '4\n10 5 20 15', '5 10 15 20', true, false),
('prac_dsa_04_bst', '5\n30 20 40 10 25', '10 20 25 30 40', false, false),
('prac_dsa_04_bst', '1\n42', '42', false, true)
ON CONFLICT DO NOTHING;
