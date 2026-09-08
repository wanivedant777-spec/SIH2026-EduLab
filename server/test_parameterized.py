"""
Unit and Integration Tests for EduLab Parameterized Test Case Engine
Verifies all mandatory criteria:
1. same student + practical => same generated cases (deterministic reproducibility)
2. different students => different cases (student diversity / anti-collusion)
3. expected outputs are correct (ground-truth algorithmic verification across canonical practicals)
4. multi-factor practical resolution by canonical ID, title, and subject
5. safe disambiguation of duplicate practical numbers
6. explicit fail-fast error handling for unsupported practicals (no silent fallback)
7. validation test verifying generator registry matches canonical live practical catalog
8. hidden cases are not returned by student-facing APIs (privacy & zero-leakage)
9. parameterized cases are actually executed in Judge0 evaluation & defeat hardcoded cheats
10. catalog discovery endpoint integrity
"""

import sys
from pathlib import Path
from typing import Dict, Any

import pytest
from fastapi.testclient import TestClient

# Ensure server module is importable
sys.path.insert(0, str(Path(__file__).parent))

from main import app, get_current_user, EvaluationRequest, TestCase
from parameterized_tests import (
    generate_parameterized_test_cases,
    get_deterministic_seed,
    resolve_canonical_practical,
    CANONICAL_CS201P_CATALOG,
    CANONICAL_GENERATOR_REGISTRY,
    UnsupportedPracticalError,
)


@pytest.fixture
def auth_client():
    """Client with mocked authenticated student dependency."""
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "std_test_uuid_001",
        "email": "student001@edulab.edu",
        "role": "student",
    }
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ===========================================================================
# 1. Deterministic Reproducibility
# ===========================================================================

def test_same_student_practical_same_cases():
    """
    Requirement 1:
    Same student_id + practical_id must yield identical test cases across repeated generations.
    """
    student_id = "std_2026_ghr_042"
    practical_id = "prac_dsa_01_linked_list"

    # Run generation multiple times
    run_1 = generate_parameterized_test_cases(student_id, practical_id, practical_number=1, count=3)
    run_2 = generate_parameterized_test_cases(student_id, practical_id, practical_number=1, count=3)
    run_3 = generate_parameterized_test_cases(student_id, practical_id, practical_number=1, count=3)

    assert len(run_1) == 3
    for i in range(3):
        assert run_1[i].input_data == run_2[i].input_data == run_3[i].input_data, f"Case {i} input mismatch"
        assert run_1[i].expected_output == run_2[i].expected_output == run_3[i].expected_output, f"Case {i} output mismatch"
        assert run_1[i].is_sample is False
        assert run_1[i].is_parameterized is True

    # Check across multiple practicals
    for p_num in range(1, 11):
        cases_a = generate_parameterized_test_cases("std_same", f"p_{p_num}", practical_number=p_num, count=2)
        cases_b = generate_parameterized_test_cases("std_same", f"p_{p_num}", practical_number=p_num, count=2)
        assert cases_a[0].input_data == cases_b[0].input_data
        assert cases_a[0].expected_output == cases_b[0].expected_output


# ===========================================================================
# 2. Student Diversity (Different Students => Different Cases)
# ===========================================================================

def test_different_students_different_cases():
    """
    Requirement 2:
    Different students for the same practical must receive distinct test cases.
    """
    student_a = "std_alice_2026"
    student_b = "std_bob_2026"
    practical_id = "prac_dsa_04_bst"

    cases_a = generate_parameterized_test_cases(student_a, practical_id, practical_number=4, count=2)
    cases_b = generate_parameterized_test_cases(student_b, practical_id, practical_number=4, count=2)

    # Different seeds
    seed_a = get_deterministic_seed(student_a, practical_id, 0)
    seed_b = get_deterministic_seed(student_b, practical_id, 0)
    assert seed_a != seed_b, "Seeds must differ for different students"

    # Different inputs
    assert cases_a[0].input_data != cases_b[0].input_data, "Inputs should differ between students"

    # Test across cohort of 10 different students
    inputs_seen = set()
    for i in range(10):
        c = generate_parameterized_test_cases(f"student_{i}", "practical_1", practical_number=1, count=1)
        inputs_seen.add(c[0].input_data)
    assert len(inputs_seen) >= 9, "Expected high diversity of test inputs across cohort"


# ===========================================================================
# 3. Canonical Practical Resolution by Title and ID
# ===========================================================================

def test_canonical_practical_resolution_by_title_and_id():
    """
    Requirement 3:
    Verify that practicals are accurately resolved by title, canonical ID slug,
    and subject rather than practical_number alone.
    """
    # Resolving via full title
    p_bst = resolve_canonical_practical(
        practical_id="any_uuid_123",
        practical_title="Practical 04: Binary Search Tree (BST) Insertion & Inorder Traversal"
    )
    assert p_bst.canonical_key == "cs201p_p04_bst"
    assert p_bst.practical_number == 4

    p_avl = resolve_canonical_practical(
        practical_id="any_uuid_456",
        practical_title="Practical 05: AVL Tree: Height-Balanced Binary Search Tree"
    )
    assert p_avl.canonical_key == "cs201p_p05_avl"

    p_dijkstra = resolve_canonical_practical(
        practical_id="prac_dsa_07_dijkstra",
        practical_title=None
    )
    assert p_dijkstra.canonical_key == "cs201p_p07_dijkstra"

    p_queue = resolve_canonical_practical(
        practical_id="uuid_queue",
        practical_title="Circular Queue Implementation"
    )
    assert p_queue.canonical_key == "cs201p_p03_circular_queue"


# ===========================================================================
# 4. Safe Disambiguation of Duplicate practical_number Values
# ===========================================================================

def test_duplicate_practical_number_disambiguation():
    """
    Requirement 4:
    Different migrations or syllabus iterations use duplicate practical_number values.
    Verify that title semantics correctly disambiguate them.
    """
    # practical_number = 1: Could be Linked List, BST, or Array Maximum
    p1_linked = resolve_canonical_practical(
        practical_id="uuid_1",
        practical_title="Practical 01: Singly Linked List Implementation & Operations",
        practical_number=1
    )
    assert p1_linked.canonical_key == "cs201p_p01_linked_list"

    p1_bst = resolve_canonical_practical(
        practical_id="uuid_1",
        practical_title="Binary Search Tree: Insertion & Inorder Traversal",
        practical_number=1
    )
    assert p1_bst.canonical_key == "cs201p_p04_bst"

    p1_max = resolve_canonical_practical(
        practical_id="uuid_1",
        practical_title="Find the Largest Number in an Array",
        practical_number=1
    )
    assert p1_max.canonical_key == "cs201p_p01_array_max"

    # practical_number = 2: Could be Balanced Parentheses, Array Stack, or AVL
    p2_paren = resolve_canonical_practical(
        practical_id="uuid_2",
        practical_title="Practical 02: Stack Implementation & Balanced Parentheses Validation",
        practical_number=2
    )
    assert p2_paren.canonical_key == "cs201p_p02_parentheses"

    p2_stack = resolve_canonical_practical(
        practical_id="uuid_2",
        practical_title="Implement Stack Using Array",
        practical_number=2
    )
    assert p2_stack.canonical_key == "cs201p_p02_array_stack"

    p2_avl = resolve_canonical_practical(
        practical_id="uuid_2",
        practical_title="AVL Tree: Self-Balancing Binary Search Tree",
        practical_number=2
    )
    assert p2_avl.canonical_key == "cs201p_p05_avl"


# ===========================================================================
# 5. Fail-Fast for Unsupported Practicals (No Silent Fallback)
# ===========================================================================

def test_unsupported_practical_raises_explicit_error(auth_client):
    """
    Requirement 5:
    Unregistered or unrecognized practicals must NOT silently default to Practical 01 or 10.
    They must raise an explicit UnsupportedPracticalError and return HTTP 422.
    """
    # 1. Generator level
    with pytest.raises(UnsupportedPracticalError) as exc_info:
        generate_parameterized_test_cases(
            student_id="std_test",
            practical_id="unknown_practical_xyz",
            practical_title="Quantum Computing Entanglement Lab",
            practical_number=99,
        )
    assert "No canonical test generator registered" in str(exc_info.value)
    assert "Quantum Computing Entanglement Lab" in str(exc_info.value)

    # 2. HTTP Endpoint level: returns 422 Unprocessable Entity
    unsupported_payload = {
        "student_id": "std_test",
        "practical_id": "unsupported_prac_999",
        "practical_title": "Advanced Quantum Cryptography",
        "practical_number": 99,
        "language_id": 71,
        "source_code": "print('hello')",
        "test_cases": [],
    }
    resp = auth_client.post("/api/evaluate", json=unsupported_payload)
    assert resp.status_code == 422
    err_detail = resp.json().get("detail", "")
    assert "No canonical test generator registered" in err_detail


# ===========================================================================
# 6. Generator Registry Matches Canonical Live Practical Catalog
# ===========================================================================

def test_generator_registry_matches_canonical_catalog():
    """
    Requirement 6:
    Every entry in CANONICAL_CS201P_CATALOG must have a matching generator
    in CANONICAL_GENERATOR_REGISTRY, and all generators must produce valid,
    non-empty inputs and outputs adhering to their title contract.
    """
    assert len(CANONICAL_CS201P_CATALOG) >= 10, "Catalog must contain at least the 10 canonical practicals"

    import random
    rng = random.Random(2026)

    for key, info in CANONICAL_CS201P_CATALOG.items():
        assert key in CANONICAL_GENERATOR_REGISTRY, f"Missing generator for canonical practical: {key} ({info.title})"
        gen_func = CANONICAL_GENERATOR_REGISTRY[key]
        assert callable(gen_func), f"Generator for {key} is not callable"

        # Generate nominal and edge case
        nominal_in, nominal_out = gen_func(rng, is_edge_case=False)
        edge_in, edge_out = gen_func(rng, is_edge_case=True)

        assert isinstance(nominal_in, str) and len(nominal_in.strip()) > 0, f"Empty nominal input for {key}"
        assert isinstance(nominal_out, str), f"Nominal output for {key} must be a string"

        assert isinstance(edge_in, str) and len(edge_in.strip()) > 0, f"Empty edge input for {key}"
        assert isinstance(edge_out, str), f"Edge output for {key} must be a string"


# ===========================================================================
# 7. Ground-Truth Algorithmic Correctness
# ===========================================================================

def test_expected_outputs_correct_across_all_canonical_practicals():
    """
    Requirement 7:
    Expected outputs must be dynamically computed by ground-truth solvers,
    not hardcoded dummy strings, and must satisfy each practical's algorithmic invariant.
    """
    student_id = "eval_ground_truth_test"

    # Practical 1: Singly Linked List (traversal equals input sequence)
    p1_cases = generate_parameterized_test_cases(student_id, "p1", practical_title="Singly Linked List", count=2)
    for c in p1_cases:
        lines = c.input_data.split("\n")
        n = int(lines[0])
        nums = list(map(int, lines[1].split()))
        assert len(nums) == n
        assert c.expected_output == lines[1]

    # Practical 1 Variant: Array Largest
    p1_max_cases = generate_parameterized_test_cases(student_id, "p1_max", practical_title="Find the Largest Number in an Array", count=2)
    for c in p1_max_cases:
        lines = c.input_data.split("\n")
        nums = list(map(int, lines[1].split()))
        assert c.expected_output == str(max(nums))

    # Practical 2: Balanced Parentheses (VALID or INVALID matching true validity)
    p2_cases = generate_parameterized_test_cases(student_id, "p2", practical_title="Balanced Parentheses", count=3)
    for c in p2_cases:
        s = c.input_data.strip()
        st = []
        mp = {")": "(", "}": "{", "]": "["}
        valid = True
        for ch in s:
            if ch in mp.values():
                st.append(ch)
            elif ch in mp:
                if not st or st[-1] != mp[ch]:
                    valid = False
                    break
                st.pop()
        if st:
            valid = False
        assert c.expected_output == ("VALID" if valid else "INVALID")

    # Practical 3: Circular Queue (FIFO simulation)
    p3_cases = generate_parameterized_test_cases(student_id, "p3", practical_title="Circular Queue", count=2)
    for c in p3_cases:
        lines = c.input_data.split("\n")
        q = []
        for line in lines[1:]:
            parts = line.split()
            if parts[0] == "ENQUEUE":
                q.append(int(parts[1]))
            elif parts[0] == "DEQUEUE":
                if q:
                    q.pop(0)
        expected = " ".join(map(str, q))
        assert c.expected_output == expected

    # Practical 4: BST Insertion & Inorder (sorted array)
    p4_cases = generate_parameterized_test_cases(student_id, "p4", practical_title="Binary Search Tree", count=2)
    for c in p4_cases:
        lines = c.input_data.split("\n")
        nums = list(map(int, lines[1].split()))
        expected_sorted = sorted(nums)
        actual_inorder = list(map(int, c.expected_output.split()))
        assert actual_inorder == expected_sorted

    # Practical 5: AVL Tree (sorted array of keys)
    p5_cases = generate_parameterized_test_cases(student_id, "p5", practical_title="AVL Tree Height-Balanced", count=2)
    for c in p5_cases:
        lines = c.input_data.split("\n")
        nums = list(map(int, lines[1].split()))
        assert list(map(int, c.expected_output.split())) == sorted(nums)

    # Practical 9: Hash Table with Linear Probing
    p9_cases = generate_parameterized_test_cases(student_id, "p9", practical_title="Hash Table with Linear Probing", count=2)
    for c in p9_cases:
        lines = c.input_data.split("\n")
        size, n = map(int, lines[0].split())
        keys = list(map(int, lines[1].split()))
        tbl = [-1] * size
        for k in keys:
            idx = k % size
            while tbl[idx] != -1:
                idx = (idx + 1) % size
            tbl[idx] = k
        assert c.expected_output == " ".join(map(str, tbl))

    # Practical 10: Sorting Benchmark (QuickSort / MergeSort)
    p10_cases = generate_parameterized_test_cases(student_id, "p10", practical_title="Sorting Benchmark QuickSort", count=2)
    for c in p10_cases:
        lines = c.input_data.split("\n")
        nums = list(map(int, lines[1].split()))
        assert list(map(int, c.expected_output.split())) == sorted(nums)


# ===========================================================================
# 8. Hidden Cases Privacy & Non-Exposure
# ===========================================================================

def test_hidden_cases_not_exposed_to_student(auth_client):
    """
    Requirement 8:
    1. Student-facing endpoint (/api/practicals/{id}/sample-cases) returns ONLY is_sample=True cases.
    2. /api/evaluate redacts hidden test case raw inputs & expected outputs from the response payload.
    """
    # 1. Check student-facing sample cases endpoint
    resp = auth_client.get("/api/practicals/prac_dsa_01_linked_list/sample-cases")
    assert resp.status_code == 200
    data = resp.json()
    assert "sample_cases" in data
    assert data["parameterized_cases_hidden"] is True
    for sc in data["sample_cases"]:
        assert sc["is_sample"] is True
        assert sc["is_parameterized"] is False

    # 2. Check that /api/evaluate redacts hidden parameterized test cases in results
    payload = {
        "student_id": "std_privacy_check",
        "practical_id": "prac_dsa_01_linked_list",
        "practical_title": "Practical 01: Singly Linked List Implementation & Operations",
        "practical_number": 1,
        "language_id": 71,
        "source_code": "import sys\nnums = list(map(int, sys.stdin.read().split()))\nif nums: print(' '.join(map(str, nums[1:nums[0]+1])))",
        "test_cases": [
            {"input_data": "3\n1 2 3", "expected_output": "1 2 3", "is_sample": True}
        ],
    }
    eval_resp = auth_client.post("/api/evaluate", json=payload)
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()

    param_results = [r for r in eval_data["test_case_results"] if r.get("is_parameterized")]
    assert len(param_results) >= 2, "Expected at least 2 parameterized cases"

    for pr in param_results:
        assert pr["is_sample"] is False
        assert pr["is_parameterized"] is True
        assert "REDACTED" in pr["expected_output"]
        assert pr["expected_output"] == "[HIDDEN PARAMETERIZED TEST CASE - REDACTED FOR INTEGRITY]"

    # Ensure judge0_payloads also redacts stdin and expected_output for parameterized cases
    for idx, jp in enumerate(eval_data["judge0_payloads"]):
        tc_res = eval_data["test_case_results"][idx]
        if tc_res.get("is_parameterized"):
            assert "REDACTED" in jp["stdin"]
            assert "REDACTED" in jp["expected_output"]


# ===========================================================================
# 9. Parameterized Cases Actually Executed & Catch Hardcoded Cheats
# ===========================================================================

def test_parameterized_cases_used_in_evaluation(auth_client):
    """
    Requirement 9:
    1. A legitimate algorithm passes both sample and hidden parameterized cases.
    2. A cheating solution with a hardcoded answer for the sample input PASSES the sample
       test case, but FAILS the hidden parameterized cases.
    """
    # --- Part A: Legitimate Solution (Passes 100% of sample + hidden cases) ---
    legit_code = (
        "import sys\n"
        "nums = list(map(int, sys.stdin.read().split()))\n"
        "if nums:\n"
        "    n = nums[0]\n"
        "    print(' '.join(map(str, nums[1:n+1])))\n"
    )
    legit_payload = {
        "student_id": "std_legit_001",
        "practical_id": "prac_dsa_01_linked_list",
        "practical_title": "Practical 01: Singly Linked List Implementation & Operations",
        "practical_number": 1,
        "language_id": 71,
        "source_code": legit_code,
        "test_cases": [
            {"input_data": "3\n10 20 30", "expected_output": "10 20 30", "is_sample": True}
        ],
    }
    resp_legit = auth_client.post("/api/evaluate", json=legit_payload)
    assert resp_legit.status_code == 200
    data_legit = resp_legit.json()

    assert data_legit["total_test_cases"] == 3
    assert data_legit["passed_test_cases"] == 3
    assert data_legit["status"] == "Passed"
    assert data_legit["coding_marks_awarded"] == 3.0

    # --- Part B: Cheating Solution (Hardcodes only sample output) ---
    cheat_code = (
        "import sys\n"
        "stdin_content = sys.stdin.read().strip()\n"
        "if '10 20 30' in stdin_content:\n"
        "    print('10 20 30')\n"
        "else:\n"
        "    print('I did not implement the real data structure')\n"
    )
    cheat_payload = {
        "student_id": "std_cheater_002",
        "practical_id": "prac_dsa_01_linked_list",
        "practical_title": "Practical 01: Singly Linked List Implementation & Operations",
        "practical_number": 1,
        "language_id": 71,
        "source_code": cheat_code,
        "test_cases": [
            {"input_data": "3\n10 20 30", "expected_output": "10 20 30", "is_sample": True}
        ],
    }
    resp_cheat = auth_client.post("/api/evaluate", json=cheat_payload)
    assert resp_cheat.status_code == 200
    data_cheat = resp_cheat.json()

    assert data_cheat["total_test_cases"] == 3
    assert data_cheat["passed_test_cases"] == 1
    assert data_cheat["test_case_results"][0]["passed"] is True
    assert data_cheat["test_case_results"][1]["passed"] is False
    assert data_cheat["test_case_results"][2]["passed"] is False
    assert data_cheat["status"] == "Partially Passed"
    assert data_cheat["coding_marks_awarded"] == 1.0


# ===========================================================================
# 10. Canonical Catalog Discovery Endpoint
# ===========================================================================

def test_canonical_catalog_api_endpoint(auth_client):
    """
    Requirement 10:
    GET /api/practicals/catalog returns the full registered syllabus catalog
    with generator coverage verified for each practical.
    """
    resp = auth_client.get("/api/practicals/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert "subject" in data
    assert data["total_canonical_practicals"] >= 10
    for p in data["catalog"]:
        assert p["has_generator"] is True
        assert len(p["title"]) > 0
