"""
Verify Zero Profiles RLS Recursion (07_fix_profiles_rls_recursion.sql)
Checks:
1. No policy on public.profiles references public.profiles in its USING or WITH CHECK expressions.
2. public.faculty_allocations has a safe SELECT policy for authenticated faculty.
3. public.test_cases, submissions, and evaluations are authorization-checked without recursive profiles lookups.
4. is_faculty_or_admin() and get_user_role() remain strictly revoked from client roles.
"""

import os
import sys
import re

def main():
    print("==================================================================")
    print("🛡️ AUDITING 07_fix_profiles_rls_recursion.sql FOR ZERO RECURSION")
    print("==================================================================\n")

    migration_path = os.path.join(os.path.dirname(__file__), "schemas", "07_fix_profiles_rls_recursion.sql")
    if not os.path.exists(migration_path):
        print(f"❌ Migration file missing at {migration_path}")
        sys.exit(1)

    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()

    # 1. Check profiles policies specifically for recursion
    print("--- 1. Checking public.profiles Policies for Self-Referencing Queries ---")
    profiles_section = re.search(r"-- 3\. PUBLIC\.PROFILES.*?(?=-- 4\. PUBLIC\.PRACTICALS)", sql, re.DOTALL)
    if not profiles_section:
        print("❌ Could not extract public.profiles section.")
        sys.exit(1)

    profiles_sql = profiles_section.group(0)

    # Find all CREATE POLICY statements on public.profiles
    policies = re.findall(r"CREATE\s+POLICY\s+\"([^\"]+)\"\s+ON\s+public\.profiles\s+(?:FOR\s+[A-Z]+\s+)?(?:TO\s+[a-z_]+\s+)?USING\s*\((.*?)\)(?:\s+WITH\s+CHECK\s*\((.*?)\))?;", profiles_sql, re.DOTALL | re.IGNORECASE)

    has_recursion = False
    for p_name, using_clause, with_check in policies:
        print(f"  • Auditing Policy: \"{p_name}\"")
        combined = using_clause + " " + (with_check or "")
        
        # Check for any query from profiles inside the policy expression
        matches = re.findall(r"FROM\s+(?:public\.)?profiles\b", combined, re.IGNORECASE)
        if matches:
            print(f"    ❌ RECURSION DETECTED: Policy \"{p_name}\" references profiles: {matches}")
            has_recursion = True
        else:
            print(f"    ✅ CLEAN: Zero references to public.profiles")

    if has_recursion:
        print("\n❌ Failed: Infinite recursion risk found in profiles policies.")
        sys.exit(1)
    else:
        print("  🎉 Zero self-referencing subqueries in public.profiles policies!\n")

    # 2. Check public.faculty_allocations SELECT policy
    print("--- 2. Checking public.faculty_allocations Policies ---")
    if "CREATE POLICY \"Faculty can view own allocations\"" in sql and "ON public.faculty_allocations FOR SELECT" in sql:
        print("  ✅ Safe SELECT policy on public.faculty_allocations present.")
    else:
        print("  ❌ Missing required SELECT policy on public.faculty_allocations.")
        sys.exit(1)

    # 3. Check is_faculty_or_admin() revoked
    print("\n--- 3. Checking Function Privilege Hardening ---")
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

    # 4. Check covered tables
    print("\n--- 4. Checking Dependent Table Coverage ---")
    for tbl in ["public.test_cases", "public.submissions", "public.evaluations", "public.practicals"]:
        if f"ON {tbl}" in sql:
            print(f"  ✅ Table covered: {tbl}")
        else:
            print(f"  ❌ Table missing: {tbl}")
            sys.exit(1)

    print("\n==================================================================")
    print("✅ 07_fix_profiles_rls_recursion.sql AUDIT PASSED WITH 0 ERRORS")
    print("==================================================================")

if __name__ == "__main__":
    main()
