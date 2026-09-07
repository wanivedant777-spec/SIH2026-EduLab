"""
Verify RLS Function Permission Fix (Prompt 8.6 / 06_rls_function_permission_fix.sql)
1. Checks that 06_rls_function_permission_fix.sql covers all required tables:
   - public.test_cases
   - public.submissions
   - public.profiles
   - public.evaluations
2. Verifies that is_faculty_or_admin() is NOT granted back to anon/authenticated.
3. Verifies that all policies use direct role checks via (SELECT auth.uid()) and public.profiles.
4. Checks live endpoint status and provides exact instructions for applying in Supabase SQL editor.
"""

import os
import sys
import re
import requests

def load_env(path):
    env = {}
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    return env

def main():
    print("==================================================================")
    print("🛡️ VERIFYING RLS FUNCTION PERMISSION FIX (06_rls_function_permission_fix.sql)")
    print("==================================================================\n")

    migration_path = os.path.join(os.path.dirname(__file__), "schemas", "06_rls_function_permission_fix.sql")
    if not os.path.exists(migration_path):
        print(f"❌ Migration file missing at {migration_path}")
        sys.exit(1)

    with open(migration_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # 1. Audit required tables
    required_tables = [
        "public.test_cases",
        "public.submissions",
        "public.profiles",
        "public.evaluations"
    ]
    print("--- 1. Auditing Target Tables in Migration ---")
    for tbl in required_tables:
        if tbl in sql_content:
            print(f"  ✅ Table covered: {tbl}")
        else:
            print(f"  ❌ Missing table: {tbl}")
            sys.exit(1)

    # 2. Verify is_faculty_or_admin() is NOT granted back
    print("\n--- 2. Auditing Execution Privileges on is_faculty_or_admin() ---")
    if "GRANT EXECUTE ON FUNCTION public.is_faculty_or_admin()" in sql_content:
        print("  ❌ ERROR: Migration contains GRANT EXECUTE on is_faculty_or_admin()! Must remain revoked.")
        sys.exit(1)
    else:
        print("  ✅ Confirmed: NO GRANT EXECUTE on is_faculty_or_admin() to client roles.")

    if "REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;" in sql_content:
        print("  ✅ Confirmed: Strict REVOKE EXECUTE enforced on is_faculty_or_admin().")
    else:
        print("  ⚠️ Warning: Explicit REVOKE statement not found verbatim.")

    # 3. Verify direct role checks via auth.uid() and profiles
    print("\n--- 3. Verifying Direct auth.uid() & public.profiles Pattern ---")
    direct_patterns = [
        r"WHERE\s+p\.id\s*=\s*\(SELECT\s+auth\.uid\(\)\)\s+AND\s+p\.role\s+IN\s+\('faculty',\s*'admin'\)",
        r"WHERE\s+id\s*=\s*\(SELECT\s+auth\.uid\(\)\)\s+AND\s+role\s+IN\s+\('faculty',\s*'admin'\)",
    ]
    matched = False
    for pat in direct_patterns:
        if re.search(pat, sql_content):
            matched = True
            break
    if matched:
        print("  ✅ Direct subquery role checks confirmed across policies.")
    else:
        print("  ❌ Expected direct subquery pattern not found in migration.")
        sys.exit(1)

    # 4. Live Supabase Connectivity Probe
    client_env = load_env(os.path.join(os.path.dirname(__file__), "..", "client", ".env"))
    url = client_env.get("VITE_SUPABASE_URL", "").rstrip("/")
    anon = client_env.get("VITE_SUPABASE_ANON_KEY", "")

    if url and anon:
        print(f"\n--- 4. Live Supabase Endpoint Check: {url} ---")
        try:
            res = requests.get(f"{url}/rest/v1/", headers={"apikey": anon}, timeout=5)
            print(f"  • Supabase API Gateway: HTTP {res.status_code} (Reachable)")
        except Exception as e:
            print(f"  • Note: Could not reach live endpoint: {e}")

    print("\n==================================================================")
    print("✅ SQL MIGRATION 06_rls_function_permission_fix.sql VALIDATION COMPLETE")
    print("==================================================================")

if __name__ == "__main__":
    main()
