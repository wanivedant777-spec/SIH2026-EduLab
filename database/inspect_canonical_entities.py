import os
import requests
import json

def load_env(path):
    env = {}
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    return env

client_env = load_env("client/.env")
server_env = load_env("server/.env")
url = client_env.get("VITE_SUPABASE_URL", "").rstrip("/")
anon = client_env.get("VITE_SUPABASE_ANON_KEY", "")
demo_fac_pwd = server_env.get("DEMO_FACULTY_PASSWORD") or os.getenv("DEMO_FACULTY_PASSWORD", "")
demo_std_pwd = server_env.get("DEMO_STUDENT_PASSWORD") or os.getenv("DEMO_STUDENT_PASSWORD", "")

headers = {"apikey": anon}

print("=== CHECKING CANONICAL DATABASE ENTITIES ===")

# Check Subjects
res_subj = requests.get(f"{url}/rest/v1/subjects?select=*", headers=headers)
print("\n1. Anon Subjects:", res_subj.status_code, "Count:", len(res_subj.json()) if res_subj.status_code == 200 else res_subj.text)

# Check Batches
res_batch = requests.get(f"{url}/rest/v1/batches?select=*", headers=headers)
print("\n2. Anon Batches:", res_batch.status_code, "Count:", len(res_batch.json()) if res_batch.status_code == 200 else res_batch.text)
if res_batch.status_code == 200:
    for b in res_batch.json():
        print(f"   • ID: {b.get('id')}, Name: {b.get('name')}, Div: {b.get('division_id')}")

# Check Practicals
res_prac = requests.get(f"{url}/rest/v1/practicals?select=id,title,subject_id,practical_number", headers=headers)
# Check Faculty Login
res_fac = requests.post(f"{url}/auth/v1/token?grant_type=password", json={
    "email": "faculty001@college.edu",
    "password": demo_fac_pwd
}, headers={"apikey": anon, "Content-Type": "application/json"})

if res_fac.status_code == 200:
    fac_user = res_fac.json()["user"]
    print(f"\n4. Authenticated Faculty Account:")
    print(f"   • Auth ID : {fac_user['id']}")
    print(f"   • Email   : {fac_user['email']}")
    
    fac_headers = {
        "apikey": anon,
        "Authorization": f"Bearer {res_fac.json()['access_token']}"
    }
    
    # Try fetching profile
    prof_res = requests.get(f"{url}/rest/v1/profiles?id=eq.{fac_user['id']}&select=*", headers=fac_headers)
    print("   • Faculty Profile Status:", prof_res.status_code)
    if prof_res.status_code == 200 and prof_res.json():
        prof = prof_res.json()[0]
        print("   • Faculty Profile Data:", prof)
        dept_id = prof.get('department_id')
        college_id = prof.get('college_id')
        print(f"   • College ID: {college_id}, Department ID: {dept_id}")

    # Query Subjects as authenticated
    auth_subj = requests.get(f"{url}/rest/v1/subjects?select=*&order=code.asc", headers=fac_headers)
    print("\n5. Authenticated Subjects Status:", auth_subj.status_code)
    if auth_subj.status_code == 200:
        print(f"   • Subjects count: {len(auth_subj.json())}")
        for s in auth_subj.json():
            print(f"     - ID: {s.get('id')}, Code: {s.get('code')}, Name: {s.get('name')}, Dept: {s.get('department_id')}")

    # Query Batches as authenticated
    auth_batch = requests.get(f"{url}/rest/v1/batches?select=*,divisions(*)&order=name.asc", headers=fac_headers)
    print("\n6. Authenticated Batches Status:", auth_batch.status_code)
    if auth_batch.status_code == 200:
        print(f"   • Batches count: {len(auth_batch.json())}")
        for b in auth_batch.json():
            print(f"     - ID: {b.get('id')}, Name: {b.get('name')}, Div: {b.get('divisions', {}).get('name')}")

    # Query Practicals as authenticated
    auth_prac = requests.get(f"{url}/rest/v1/practicals?select=id,title,subject_id,practical_number&order=practical_number.asc", headers=fac_headers)
    print("\n7. Authenticated Practicals Status:", auth_prac.status_code)
    if auth_prac.status_code == 200:
        print(f"   • Practicals count: {len(auth_prac.json())}")
        for p in auth_prac.json()[:3]:
            print(f"     - ID: {p.get('id')}, P{p.get('practical_number')}: {p.get('title')}, SubjectID: {p.get('subject_id')}")

    # Query Faculty Allocations as authenticated
    auth_alloc = requests.get(f"{url}/rest/v1/faculty_allocations?select=*", headers=fac_headers)
    print("\n8. Authenticated Faculty Allocations Status:", auth_alloc.status_code)
    if auth_alloc.status_code == 200:
        print(f"   • Allocations count: {len(auth_alloc.json())}")
        for a in auth_alloc.json():
            print(f"     - {a}")

# Check student account
res_std = requests.post(f"{url}/auth/v1/token?grant_type=password", json={
    "email": "student001@college.edu",
    "password": demo_std_pwd
}, headers={"apikey": anon, "Content-Type": "application/json"})

if res_std.status_code == 200:
    std_user = res_std.json()["user"]
    print(f"\n5. Authenticated Student Account:")
    print(f"   • Auth ID : {std_user['id']}")
    print(f"   • Email   : {std_user['email']}")
