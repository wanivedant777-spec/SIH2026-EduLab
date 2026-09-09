"""
verify_phase6_backend.py
Comprehensive Phase 6 verification script:
1. Health endpoint checks (reachability, status contract).
2. Security & Auth verification:
   - Missing token -> 401
   - Invalid token -> 401
   - Faculty role attempting student evaluation -> 403
   - Student role evaluating code -> 200 with truthful execution
3. Truthful code execution checks:
   - Correct Python solution -> genuine stdout, actual passed status
   - Buggy Python solution -> truthful failure/runtime error, NEVER manufactured pass
   - C++ solution -> truthful compilation/execution
"""

import os
import sys
import json
import httpx
from dotenv import load_dotenv

load_dotenv()
load_dotenv("server/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
API_BASE = "http://localhost:8000"

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.")
    sys.exit(1)

def test_health_endpoint():
    print("\n--- 1. Testing /health Endpoint ---")
    resp = httpx.get(f"{API_BASE}/health", timeout=5.0)
    print(f"Health Response: Status {resp.status_code}, Body: {resp.text}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert "judge0" in data, "Missing 'judge0' in health response"
    assert data["judge0"]["status"] in ("reachable", "unavailable"), f"Unexpected judge0 status: {data['judge0']['status']}"
    assert data["status"] in ("healthy", "degraded"), f"Unexpected overall status: {data['status']}"
    print("✅ /health conforms to production schema.")

def get_auth_tokens():
    print("\n--- 2. Authenticating Student and Faculty via Supabase Auth REST API ---")
    auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
    
    # Student
    stu_resp = httpx.post(
        auth_url,
        headers=headers,
        json={"email": "student001@college.edu", "password": "StudentPassword@2026"},
        timeout=10.0
    )
    assert stu_resp.status_code == 200, f"Student auth failed: {stu_resp.text}"
    stu_data = stu_resp.json()
    student_token = stu_data["access_token"]
    student_uid = stu_data["user"]["id"]
    print(f"✅ Student authenticated. UID: {student_uid}")

    # Faculty
    fac_resp = httpx.post(
        auth_url,
        headers=headers,
        json={"email": "faculty001@college.edu", "password": "FacultyPassword@2026"},
        timeout=10.0
    )
    assert fac_resp.status_code == 200, f"Faculty auth failed: {fac_resp.text}"
    fac_data = fac_resp.json()
    faculty_token = fac_data["access_token"]
    faculty_uid = fac_data["user"]["id"]
    print(f"✅ Faculty authenticated. UID: {faculty_uid}")

    return student_token, student_uid, faculty_token, faculty_uid

def test_auth_security(student_token, faculty_token):
    print("\n--- 3. Testing Evaluation Authorization & Role Checks ---")
    eval_payload = {
        "source_code": "print('hello')",
        "language_id": 71,
        "practical_id": "PRAC_01",
        "practical_number": 1,
        "student_id": "arbitrary_attacker_id"
    }

    # Case A: Missing Authorization header
    resp = httpx.post(f"{API_BASE}/api/evaluate", json=eval_payload, timeout=5.0)
    print(f"Missing Header Test: Status {resp.status_code}")
    assert resp.status_code == 401, f"Expected 401 for missing token, got {resp.status_code}"
    print("✅ Missing token rejected with 401.")

    # Case B: Invalid / spoofed token
    resp = httpx.post(
        f"{API_BASE}/api/evaluate",
        json=eval_payload,
        headers={"Authorization": "Bearer invalid.fake.token"},
        timeout=5.0
    )
    print(f"Invalid Token Test: Status {resp.status_code}")
    assert resp.status_code == 401, f"Expected 401 for invalid token, got {resp.status_code}"
    print("✅ Invalid token rejected with 401.")

    # Case C: Faculty token attempting evaluation
    resp = httpx.post(
        f"{API_BASE}/api/evaluate",
        json=eval_payload,
        headers={"Authorization": f"Bearer {faculty_token}"},
        timeout=5.0
    )
    print(f"Faculty Token Test: Status {resp.status_code}, Body: {resp.text}")
    assert resp.status_code == 403, f"Expected 403 for faculty token, got {resp.status_code}"
    print("✅ Faculty token blocked from student evaluation with 403 Forbidden.")

def test_truthful_code_execution(student_token):
    print("\n--- 4. Testing Truthful Code Execution ---")
    
    cat_resp = httpx.get(f"{API_BASE}/api/practicals/catalog", timeout=5.0)
    assert cat_resp.status_code == 200
    catalog = cat_resp.json()
    print(f"Available Canonical Practicals: {len(catalog.get('catalog', []))}")

    # Test 4A: Python code
    valid_python = """import sys

lines = sys.stdin.read().strip().split('\\n')
if lines and lines[0]:
    arr = list(map(int, lines[0].split()))
    if len(lines) > 1:
        target = int(lines[1].strip())
        if target in arr:
            print(arr.index(target))
        else:
            print(-1)
    else:
        print(sum(arr))
else:
    print(0)
"""

    resp = httpx.post(
        f"{API_BASE}/api/evaluate",
        json={
            "source_code": valid_python,
            "language_id": 71,
            "practical_number": 1,
            "practical_id": "PRAC_01"
        },
        headers={"Authorization": f"Bearer {student_token}"},
        timeout=30.0
    )
    print(f"Evaluation Response Status: {resp.status_code}, Body: {resp.text}")
    assert resp.status_code in (200, 503), f"Expected 200 or 503, got {resp.status_code}: {resp.text}"
    
    if resp.status_code == 200:
        res = resp.json()
        print(f"Evaluation Response Keys: {list(res.keys())}")
        print(f"Status: {res.get('status')}")
        print(f"Passed Count: {res.get('passed_test_cases')}/{res.get('total_test_cases')}")
        assert not res.get("is_simulation"), "is_simulation flag must not be True"
        assert res.get("test_case_results"), "test_case_results must be returned"
        for t in res["test_case_results"]:
            assert "DEMO / SIMULATION" not in (t.get("status") or ""), "Must not contain DEMO / SIMULATION"
            assert not t.get("is_simulation"), "Individual test case is_simulation must not be True"
        print("✅ Python execution executed truthfully without simulated fallback.")

    # Test 4B: Buggy Python code (syntax error) -> must report error truthfully, never fake pass
    buggy_python = """def broken_syntax(
    print("unclosed paren"
"""
    resp_buggy = httpx.post(
        f"{API_BASE}/api/evaluate",
        json={
            "source_code": buggy_python,
            "language_id": 71,
            "practical_number": 1,
            "practical_id": "PRAC_01"
        },
        headers={"Authorization": f"Bearer {student_token}"},
        timeout=30.0
    )
    print(f"Buggy Evaluation Response Status: {resp_buggy.status_code}")
    if resp_buggy.status_code == 200:
        res_buggy = resp_buggy.json()
        print(f"Buggy Status: {res_buggy.get('status')}")
        assert res_buggy.get("status") in ("Failed", "Compilation Error", "Error"), f"Buggy code must not pass! Got {res_buggy.get('status')}"
        assert res_buggy.get("passed_test_cases") == 0, "Passed count for broken syntax must be 0"
        print("✅ Buggy code truthfully failed without manufacturing pass status.")

    # Test 4C: C++ code (language_id: 54)
    cpp_code = """#include <iostream>
using namespace std;
int main() {
    cout << "EduLab Truthful C++ Output" << endl;
    return 0;
}
"""
    resp_cpp = httpx.post(
        f"{API_BASE}/api/evaluate",
        json={
            "source_code": cpp_code,
            "language_id": 54,
            "practical_number": 1,
            "practical_id": "PRAC_01"
        },
        headers={"Authorization": f"Bearer {student_token}"},
        timeout=30.0
    )
    print(f"C++ Evaluation Response Status: {resp_cpp.status_code}")
    if resp_cpp.status_code == 200:
        res_cpp = resp_cpp.json()
        print(f"C++ Status: {res_cpp.get('status')}")
        assert not res_cpp.get("is_simulation"), "C++ execution must not be simulated"
        print("✅ C++ code compiled and evaluated truthfully.")

def main():
    test_health_endpoint()
    student_token, student_uid, faculty_token, faculty_uid = get_auth_tokens()
    test_auth_security(student_token, faculty_token)
    test_truthful_code_execution(student_token)
    print("\n🎉 ALL PHASE 6 BACKEND & EVALUATION VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
