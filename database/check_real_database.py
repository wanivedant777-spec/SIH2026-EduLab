"""
Live Supabase Database Inspector
Reads configuration directly from client/.env and queries your real Supabase database live.
Zero hardcoded data - 100% live database query.
"""

import os
import sys
import json
import requests

if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

def load_env(env_path):
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    env_vars[key.strip()] = val.strip()
    return env_vars

def main():
    env_path = os.path.join(os.path.dirname(__file__), "..", "client", ".env")
    env = load_env(env_path)

    supabase_url = env.get("VITE_SUPABASE_URL", "")
    anon_key = env.get("VITE_SUPABASE_ANON_KEY", "")

    if not supabase_url or not anon_key:
        print("❌ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in client/.env")
        return

    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }

    tables = [
        "colleges",
        "departments",
        "divisions",
        "batches",
        "subjects",
        "allowed_faculty",
        "allowed_students",
        "institutional_roster",
        "profiles",
        "practicals",
        "submissions",
        "evaluations"
    ]

    print("==================================================================")
    print(f"📡 Fetching REAL live data from Supabase: {supabase_url}")
    print("==================================================================\n")

    for table in tables:
        endpoint = f"{supabase_url.rstrip('/')}/rest/v1/{table}?select=*"
        try:
            res = requests.get(endpoint, headers=headers, timeout=10)
            if res.status_code == 200:
                rows = res.json()
                print(f"✅ Table '{table}': {len(rows)} row(s) found")
                if rows:
                    for idx, row in enumerate(rows[:3], start=1):
                        print(f"   [Row {idx}]: {json.dumps(row, default=str)}")
                    if len(rows) > 3:
                        print(f"   ... and {len(rows) - 3} more row(s)")
                print()
            elif res.status_code == 404:
                print(f"⚪ Table '{table}': Not found (or not exposed via REST)")
            else:
                print(f"⚠️ Table '{table}': HTTP {res.status_code} - {res.text}")
        except Exception as e:
            print(f"❌ Table '{table}' error: {e}")

if __name__ == "__main__":
    main()
