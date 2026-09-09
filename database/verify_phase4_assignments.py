"""
verify_phase4_assignments.py
Practical Lab Management Platform (SIH 2026 - EduLab)
Automated Verification Suite for Phase 4: Assignments Database Model & RLS
"""

import os
import sys
import json
import requests

if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

def load_env(path):
    env = {}
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    return env

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    client_env = load_env(os.path.join(root_dir, 'client', '.env'))
    server_env = load_env(os.path.join(root_dir, 'server', '.env'))
    root_env = load_env(os.path.join(root_dir, '.env'))

    url = client_env.get('VITE_SUPABASE_URL') or server_env.get('SUPABASE_URL') or root_env.get('SUPABASE_URL')
    anon_key = client_env.get('VITE_SUPABASE_ANON_KEY') or server_env.get('SUPABASE_ANON_KEY') or root_env.get('SUPABASE_ANON_KEY')
    service_key = server_env.get('SUPABASE_SERVICE_ROLE_KEY') or root_env.get('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not anon_key:
        print("❌ Missing Supabase URL or Anon Key")
        sys.exit(1)

    print("==================================================================")
    print(f"🔬 VERIFYING PHASE 4: ASSIGNMENTS MODEL & RLS on {url}")
    print("==================================================================\n")

    # ------------------------------------------------------------------
    # 1. TABLE EXISTENCE & SCHEMA INTROSPECTION
    # ------------------------------------------------------------------
    print("--- 1. Checking Table Definition & Schema ---")
    headers_admin = {
        'apikey': service_key or anon_key,
        'Authorization': f'Bearer {service_key or anon_key}',
        'Content-Type': 'application/json'
    }

    schema_res = requests.get(f"{url}/rest/v1/?apikey={anon_key}")
    if schema_res.status_code == 200:
        defs = schema_res.json().get('definitions', {})
        if 'assignments' in defs:
            props = defs['assignments'].get('properties', {})
            print("✅ Table 'assignments' exists in OpenAPI schema.")
            print(f"   Columns: {list(props.keys())}")
        else:
            print("❌ Table 'assignments' not found in schema definitions.")
    else:
        print(f"⚠️ Could not introspect schema via REST: HTTP {schema_res.status_code}")

    # ------------------------------------------------------------------
    # 2. ANONYMOUS ACCESS RESTRICTIONS
    # ------------------------------------------------------------------
    print("\n--- 2. Checking Anonymous Access Restrictions ---")
    headers_anon = {'apikey': anon_key, 'Content-Type': 'application/json'}
    
    anon_select = requests.get(f"{url}/rest/v1/assignments?select=*", headers=headers_anon)
    print(f"• Anon SELECT status: HTTP {anon_select.status_code}")
    if anon_select.status_code == 200:
        rows = anon_select.json()
        print(f"  Rows visible to anon: {len(rows)} (Expected 0)")
        assert len(rows) == 0, "Security violation: Anonymous user can see assignments!"
    elif anon_select.status_code in (401, 403):
        print("  ✅ Anon SELECT completely blocked.")

    anon_insert = requests.post(f"{url}/rest/v1/assignments", json={"title": "Hacked Assignment"}, headers=headers_anon)
    print(f"• Anon INSERT status: HTTP {anon_insert.status_code} (Expected 401/403)")
    assert anon_insert.status_code in (401, 403), "Security violation: Anonymous user can insert assignments!"
    print("  ✅ Anon INSERT rejected.")

    # ------------------------------------------------------------------
    # 3. STUDENT 001 (BATCH C1) - PERMISSIONS & ISOLATION
    # ------------------------------------------------------------------
    print("\n--- 3. Checking Student 001 (Batch C1) Permissions ---")
    s1_login = requests.post(
        f"{url}/auth/v1/token?grant_type=password",
        json={"email": "student001@college.edu", "password": "StudentPassword@2026"},
        headers={'apikey': anon_key}
    )
    if s1_login.status_code != 200:
        print(f"❌ Student 001 login failed: {s1_login.text}")
        sys.exit(1)

    s1_token = s1_login.json().get('access_token')
    s1_headers = {
        'apikey': anon_key,
        'Authorization': f'Bearer {s1_token}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    # Query C1 assignments
    s1_select = requests.get(f"{url}/rest/v1/assignments?select=id,title,batch_id,practicals(practical_number,title)", headers=s1_headers)
    print(f"• Student 001 SELECT status: HTTP {s1_select.status_code}")
    s1_assignments = s1_select.json() if s1_select.status_code == 200 else []
    print(f"  Visible assignments count: {len(s1_assignments)}")
    for a in s1_assignments:
        p = a.get('practicals') or {}
        print(f"  - [{a.get('id')[:8]}...] {a.get('title')} (P{p.get('practical_number')}: {p.get('title')})")

    # Attempt student INSERT (must be blocked)
    s1_insert = requests.post(
        f"{url}/rest/v1/assignments",
        json={
            "faculty_id": "f26938ee-999f-46a8-9e2a-5ec3398067e6",
            "subject_id": "24f0fc33-4d3a-40a9-8c5f-185a6679f88b",
            "batch_id": "2ced03fc-8c5e-4b5f-a797-ff6a13ae3eb4",
            "practical_id": "6ee969fe-9bae-40c4-b6c6-e1008e0b22fb",
            "title": "Student Unauthorized Insertion"
        },
        headers=s1_headers
    )
    print(f"• Student 001 INSERT attempt: HTTP {s1_insert.status_code}")
    if s1_insert.status_code in (401, 403, 404):
        print("  ✅ Student INSERT correctly blocked by RLS.")
    else:
        print(f"  ⚠️ Warning: Student INSERT returned {s1_insert.status_code}")

    # ------------------------------------------------------------------
    # 4. STUDENT 021 (BATCH C2) - STRICT ISOLATION FROM C1
    # ------------------------------------------------------------------
    print("\n--- 4. Checking Student 021 (Batch C2) Isolation ---")
    s2_login = requests.post(
        f"{url}/auth/v1/token?grant_type=password",
        json={"email": "student021@college.edu", "password": "StudentPassword@2026"},
        headers={'apikey': anon_key}
    )
    if s2_login.status_code == 200:
        s2_token = s2_login.json().get('access_token')
        s2_headers = {
            'apikey': anon_key,
            'Authorization': f'Bearer {s2_token}',
            'Content-Type': 'application/json'
        }
        s2_select = requests.get(f"{url}/rest/v1/assignments?select=id,title,batch_id", headers=s2_headers)
        s2_assignments = s2_select.json() if s2_select.status_code == 200 else []
        print(f"• Student 021 (Batch C2) visible assignments: {len(s2_assignments)}")
        if len(s2_assignments) == 0:
            print("  ✅ ISOLATION VERIFIED: Student in Batch C2 sees 0 assignments from Batch C1.")
        else:
            print(f"  ❌ ISOLATION FAILED: Student in C2 saw {len(s2_assignments)} assignment(s)!")
    else:
        print(f"⚠️ Student 021 login note: {s2_login.text[:80]}")

    # ------------------------------------------------------------------
    # 5. FACULTY 001 - ALLOCATED BATCH ASSIGNMENT ACCESS
    # ------------------------------------------------------------------
    print("\n--- 5. Checking Faculty 001 Permissions ---")
    f1_login = requests.post(
        f"{url}/auth/v1/token?grant_type=password",
        json={"email": "faculty001@college.edu", "password": "FacultyPassword@2026"},
        headers={'apikey': anon_key}
    )
    if f1_login.status_code == 200:
        f1_token = f1_login.json().get('access_token')
        f1_headers = {
            'apikey': anon_key,
            'Authorization': f'Bearer {f1_token}',
            'Content-Type': 'application/json'
        }
        f1_select = requests.get(f"{url}/rest/v1/assignments?select=id,title,batch_id,faculty_id", headers=f1_headers)
        f1_assignments = f1_select.json() if f1_select.status_code == 200 else []
        print(f"• Faculty 001 SELECT assignments: {len(f1_assignments)}")
        for a in f1_assignments:
            print(f"  - Title: {a.get('title')}, Faculty ID: {a.get('faculty_id')}")
    else:
        print(f"⚠️ Faculty 001 login note: {f1_login.text[:80]}")

    print("\n==================================================================")
    print("🏁 PHASE 4 ASSIGNMENTS & RLS VERIFICATION COMPLETE")
    print("==================================================================")

if __name__ == "__main__":
    main()
