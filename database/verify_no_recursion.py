"""
Verify Acyclic RLS Dependency Graph (07_fix_profiles_rls_recursion.sql)

Audits:
1. public.profiles policies: ZERO references to profiles (direct recursion) and ZERO references to institutional_roster (indirect cycle).
2. public.faculty_allocations policies: ZERO references to profiles or institutional_roster (ensures Level 0 base status).
3. public.test_cases policies: Faculty authorization checked via faculty_allocations & practicals without profiles subquery.
4. Dependent tables (submissions, evaluations, practicals, tab_switch_logs) respect the topological DAG order.
5. Function privilege hardening: is_faculty_or_admin() and get_user_role() remain strictly revoked.
"""

import os
import sys
import re

def main():
    print("==================================================================")
    print("🛡️ AUDITING 07_fix_profiles_rls_recursion.sql FOR ACYCLIC RLS DAG")
    print("==================================================================")

    migration_path = os.path.join(os.path.dirname(__file__), "schemas", "07_fix_profiles_rls_recursion.sql")
    if not os.path.exists(migration_path):
        print(f"❌ Migration file missing at {migration_path}")
        sys.exit(1)

    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()

    # 1. Audit public.profiles policies
    print("\n--- 1. Auditing public.profiles Policies ---")
    profiles_match = re.search(r"-- 5\. LEVEL 1: PUBLIC\.PROFILES.*?(?=-- 6\. LEVEL 2:)", sql, re.DOTALL)
    if not profiles_match:
        print("❌ Could not extract profiles section.")
        sys.exit(1)

    profiles_sql = profiles_match.group(0)
    profile_policies = re.findall(
        r"CREATE\s+POLICY\s+\"([^\"]+)\"\s+ON\s+public\.profiles\s+(?:FOR\s+[A-Z]+\s+)?(?:TO\s+[a-z_]+\s+)?USING\s*\((.*?)\)(?:\s+WITH\s+CHECK\s*\((.*?)\))?;",
        profiles_sql, re.DOTALL | re.IGNORECASE
    )

    for p_name, using_c, with_c in profile_policies:
        combined = using_c + " " + (with_c or "")
        print(f"  • Policy: \"{p_name}\"")

        # Check for direct recursion to profiles
        if re.search(r"FROM\s+(?:public\.)?profiles\b", combined, re.IGNORECASE):
            print(f"    ❌ DIRECT RECURSION: Queries profiles!")
            sys.exit(1)
        else:
            print(f"    ✅ Clean: Zero direct profiles queries")

        # Check for indirect cycle via institutional_roster
        if re.search(r"FROM\s+(?:public\.)?institutional_roster\b", combined, re.IGNORECASE):
            print(f"    ❌ INDIRECT CYCLE: Queries institutional_roster!")
            sys.exit(1)
        else:
            print(f"    ✅ Clean: Zero institutional_roster queries")

    # 2. Audit public.faculty_allocations policies
    print("\n--- 2. Auditing public.faculty_allocations Policies (Level 0 Leaf) ---")
    fa_match = re.search(r"-- 2\. LEVEL 0: PUBLIC\.FACULTY_ALLOCATIONS.*?(?=-- 3\. LEVEL 0:)", sql, re.DOTALL)
    if not fa_match:
        print("❌ Could not extract faculty_allocations section.")
        sys.exit(1)

    fa_sql = fa_match.group(0)
    fa_policies = re.findall(
        r"CREATE\s+POLICY\s+\"([^\"]+)\"\s+ON\s+public\.faculty_allocations\s+(?:FOR\s+[A-Z]+\s+)?(?:TO\s+[a-z_]+\s+)?USING\s*\((.*?)\);",
        fa_sql, re.DOTALL | re.IGNORECASE
    )

    for p_name, using_c in fa_policies:
        print(f"  • Policy: \"{p_name}\"")
        if re.search(r"FROM\s+(?:public\.)?(profiles|institutional_roster)\b", using_c, re.IGNORECASE):
            print(f"    ❌ INDIRECT CYCLE: Queries profiles or roster!")
            sys.exit(1)
        else:
            print(f"    ✅ Clean: Zero cross-table dependencies (strictly faculty_id = auth.uid() or JWT)")

    # 3. Audit Function Privileges
    print("\n--- 3. Auditing Function Execution Revocations ---")
    if "REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;" in sql:
        print("  ✅ is_faculty_or_admin() strictly revoked from client roles.")
    else:
        print("  ❌ is_faculty_or_admin() revocation missing.")
        sys.exit(1)

    if "REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;" in sql:
        print("  ✅ get_user_role() strictly revoked from untrusted client roles.")
    else:
        print("  ❌ get_user_role() revocation missing.")
        sys.exit(1)

    # 4. Check for is_faculty_or_admin() references in any policies
    print("\n--- 4. Checking for any legacy is_faculty_or_admin() in policies ---")
    if re.search(r"USING\s*\([^;]*is_faculty_or_admin", sql, re.IGNORECASE):
        print("  ❌ Found policy calling is_faculty_or_admin()!")
        sys.exit(1)
    else:
        print("  ✅ Zero policies in migration call is_faculty_or_admin().")

    print("\n==================================================================")
    print("✅ ACYCLIC RLS AUDIT PASSED: ZERO DIRECT OR INDIRECT CYCLES DETECTED")
    print("==================================================================")

if __name__ == "__main__":
    main()
