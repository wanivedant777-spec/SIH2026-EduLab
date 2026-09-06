"""
Fetch Full Supabase Database
Bypasses RLS using the service_role key to retrieve the complete schema,
all tables, and all records live from Supabase.
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
    env_file = os.path.join(os.path.dirname(__file__), "..", "server", ".env")
    env = load_env(env_file)

    supabase_url = env.get("SUPABASE_URL", "")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        print("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in server/.env")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }

    # 1. Fetch OpenAPI definition to discover all tables in the public schema
    print("==================================================================")
    print("🔍 Discovering all tables in the public schema...")
    print("==================================================================")

    root_url = f"{supabase_url.rstrip('/')}/rest/v1/"
    try:
        spec_res = requests.get(root_url, headers=headers, timeout=10)
        tables = []
        if spec_res.status_code == 200:
            spec = spec_res.json()
            definitions = spec.get("definitions", {})
            tables = sorted(list(definitions.keys()))
            print(f"Discovered {len(tables)} tables: {', '.join(tables)}\n")
        else:
            print(f"Could not fetch OpenAPI spec (Status {spec_res.status_code}). Using known tables list.")
            tables = [
                "allowed_faculty", "allowed_students", "colleges", "departments",
                "divisions", "batches", "subjects", "faculty_allocations",
                "faculty_batches", "institutional_roster", "profiles", "practicals",
                "test_cases", "submissions", "evaluations", "tab_switch_logs"
            ]
    except Exception as e:
        print(f"Error querying OpenAPI spec: {e}")
        tables = [
            "allowed_faculty", "allowed_students", "colleges", "departments",
            "divisions", "batches", "subjects", "faculty_allocations",
            "faculty_batches", "institutional_roster", "profiles", "practicals",
            "test_cases", "submissions", "evaluations", "tab_switch_logs"
        ]

    # 2. Fetch rows and columns for each discovered table
    print("==================================================================")
    print(f"📊 Querying Tables in Database: {supabase_url}")
    print("==================================================================\n")

    summary = {}

    for t in tables:
        url = f"{supabase_url.rstrip('/')}/rest/v1/{t}?select=*"
        try:
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code == 200:
                data = r.json()
                summary[t] = len(data)
                print(f"📁 Table [{t}]: {len(data)} row(s)")
                if data:
                    print("   Columns:", list(data[0].keys()))
                    for idx, row in enumerate(data[:5], start=1):
                        print(f"   Row {idx}: {json.dumps(row, default=str)}")
                    if len(data) > 5:
                        print(f"   ... ({len(data) - 5} more rows)")
                else:
                    print("   (Empty table)")
                print()
            else:
                print(f"⚠️ Table [{t}]: HTTP {r.status_code} - {r.text[:100]}")
        except Exception as e:
            print(f"❌ Table [{t}] error: {e}")

    print("==================================================================")
    print("📋 SUMMARY REPORT")
    print("==================================================================")
    for t, count in summary.items():
        print(f"  • {t:<25} : {count} rows")
    print("==================================================================")

if __name__ == "__main__":
    main()
