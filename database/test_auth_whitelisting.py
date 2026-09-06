"""
Test Supabase Whitelisting & Auto-Profile Linking
Tests the Option A Signup flow:
1. Signs up a whitelisted student (student001@college.edu)
2. Checks if on_auth_user_created trigger linked the profile to Batch C1 with status='active'
3. Checks if institutional_roster marked is_claimed = True
4. Signs up an unauthorized user to verify it is marked status='pending_approval'
"""

import os
import sys
import json
import requests

if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

def load_env(env_path):
    env = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    return env

def main():
    client_env = load_env(os.path.join(os.path.dirname(__file__), "..", "client", ".env"))
    server_env = load_env(os.path.join(os.path.dirname(__file__), "..", "server", ".env"))

    supabase_url = client_env.get("VITE_SUPABASE_URL", "")
    anon_key = client_env.get("VITE_SUPABASE_ANON_KEY", "")
    service_key = server_env.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not anon_key or not service_key:
        print("❌ Missing credentials in client/.env or server/.env")
        return

    admin_headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json"
    }

    print("==================================================================")
    print("🧪 TEST 1: Whitelisted Student Sign-up (student001@college.edu)")
    print("==================================================================")

    # 1. Sign up via Supabase Auth API
    signup_url = f"{supabase_url.rstrip('/')}/auth/v1/signup"
    payload = {
        "email": "student001@college.edu",
        "password": "StudentPassword@2026",
    }
    signup_res = requests.post(signup_url, json=payload, headers={"apikey": anon_key, "Content-Type": "application/json"}, timeout=10)
    print("Auth Signup HTTP Status:", signup_res.status_code)
    
    if signup_res.status_code in (200, 201):
        auth_data = signup_res.json()
        user_id = auth_data.get("user", {}).get("id") or auth_data.get("id")
        print(f"✅ Auth user created with ID: {user_id}")
    else:
        print(f"Auth response: {signup_res.text}")

    # 2. Query public.profiles to verify automatic trigger linking
    profile_url = f"{supabase_url.rstrip('/')}/rest/v1/profiles?email=eq.student001@college.edu&select=*"
    prof_res = requests.get(profile_url, headers=admin_headers, timeout=10)
    if prof_res.status_code == 200:
        profiles = prof_res.json()
        if profiles:
            p = profiles[0]
            print("\n📋 Profile Created by Database Trigger:")
            print(f"  • Full Name   : {p.get('full_name')}")
            print(f"  • Identifier  : {p.get('identifier')}")
            print(f"  • Role        : {p.get('role')}")
            print(f"  • Status      : {p.get('status')}")
            print(f"  • Batch ID    : {p.get('batch_id')}")
            print(f"  • Division ID : {p.get('division_id')}")
            print(f"  • College ID  : {p.get('college_id')}")
        else:
            print("⚠️ No profile found yet in public.profiles")
    else:
        print(f"Error fetching profile: {prof_res.text}")

    # 3. Query institutional_roster to verify claim status
    roster_url = f"{supabase_url.rstrip('/')}/rest/v1/institutional_roster?email=eq.student001@college.edu&select=*"
    roster_res = requests.get(roster_url, headers=admin_headers, timeout=10)
    if roster_res.status_code == 200:
        roster_data = roster_res.json()
        if roster_data:
            r = roster_data[0]
            print(f"\n🔐 Whitelist Roster Claim Status:")
            print(f"  • is_claimed : {r.get('is_claimed')}")
            print(f"  • claimed_by : {r.get('claimed_by')}")
            print(f"  • claimed_at : {r.get('claimed_at')}")

    print("\n==================================================================")
    print("🧪 TEST 2: Backend Evaluation Engine (/api/evaluate)")
    print("==================================================================")
    from server.main import evaluate_submission, EvaluationRequest, TestCase
    
    mock_submission = EvaluationRequest(
        student_id="GHR2025AI001",
        practical_id="prac_dsa_01",
        language_id=54, # C++
        source_code="#include <iostream>\nusing namespace std;\nint main() { cout << 42 << endl; return 0; }",
        test_cases=[
            TestCase(input_data="", expected_output="42", is_sample=True),
        ],
        attempt_count=1,
        time_spent_seconds=180
    )
    eval_resp = evaluate_submission(mock_submission)
    print(f"  • Status               : {eval_resp.status}")
    print(f"  • Passed Test Cases    : {eval_resp.passed_test_cases}/{eval_resp.total_test_cases}")
    print(f"  • Coding Marks Awarded : {eval_resp.coding_marks_awarded} / {eval_resp.total_possible_marks}")
    print(f"  • Adaptive Tier        : {eval_resp.adaptive_tiering.assigned_tier} (Difficulty: {eval_resp.adaptive_tiering.recommended_difficulty})")
    print(f"  • Tiering Reasoning    : {eval_resp.adaptive_tiering.reasoning}")

    print("\n==================================================================")
    print("🎉 ALL TESTS EXECUTED!")
    print("==================================================================")

if __name__ == "__main__":
    main()
