-- ==============================================================================
-- 05_real_data_seed.sql
-- Live Database RLS Hotfix & Canonical CS201P Real Data Seed
-- Target: Supabase Project evwjiffnyhbvqbnogbjv
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RLS HOTFIX: RESTORE EXECUTION & SECURE POLICIES
-- ------------------------------------------------------------------------------
-- 1.1 Maintain strict revocation on helper functions (direct RLS role checks used instead)
REVOKE ALL ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_faculty_or_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;

-- 1.2 Profiles Policies (Avoid recursion, allow authenticated self-read & faculty batch inspection)
DROP POLICY IF EXISTS "Profiles viewable by self, faculty, and admins" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self and active members" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Active profiles viewable by authenticated users" ON public.profiles;

CREATE POLICY "Active profiles viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
              AND p.role IN ('faculty', 'admin')
              AND p.status = 'active'
        )
    );

-- 1.3 Practicals Policy (Active students and faculty can view all practicals)
DROP POLICY IF EXISTS "Active students and faculty can view practicals" ON public.practicals;
CREATE POLICY "Active students and faculty can view practicals"
    ON public.practicals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND status = 'active'
        )
    );

-- 1.4 Test Cases Policies (Students view sample test cases; Faculty/Admin view all)
DROP POLICY IF EXISTS "Students can view sample test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Faculty can view all test cases" ON public.test_cases;

CREATE POLICY "Students can view sample test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (is_sample = true);

CREATE POLICY "Faculty can view all test cases"
    ON public.test_cases FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role IN ('faculty', 'admin')
              AND status = 'active'
        )
    );

-- 1.5 Faculty Allocations Policy (Faculty view own allocations, Admin views all)
DROP POLICY IF EXISTS "Faculty can view own allocations" ON public.faculty_allocations;
CREATE POLICY "Faculty can view own allocations"
    ON public.faculty_allocations FOR SELECT
    TO authenticated
    USING (
        faculty_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
              AND role = 'admin'
              AND status = 'active'
        )
    );

-- 1.6 Submissions Policies (Students view/create own; Faculty view allocated batch submissions)
DROP POLICY IF EXISTS "Faculty can view batch submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can view allocated batch submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can manage submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;

CREATE POLICY "Students can view own submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = student_id);

CREATE POLICY "Students can create own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = student_id AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND status = 'active'
        )
    );

CREATE POLICY "Students can update own submissions"
    ON public.submissions FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = student_id)
    WITH CHECK ((SELECT auth.uid()) = student_id);

CREATE POLICY "Faculty can view allocated batch submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.faculty_allocations fa
            JOIN public.practicals pr ON pr.subject_id = fa.subject_id
            JOIN public.profiles st ON st.id = submissions.student_id AND st.batch_id = fa.batch_id
            WHERE fa.faculty_id = (SELECT auth.uid())
              AND pr.id = submissions.practical_id
        )
    );

-- 1.7 Evaluations Policies (Students view own; Faculty view/grade allocated)
DROP POLICY IF EXISTS "Faculty can manage evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can view allocated evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Faculty can manage allocated evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Students can view own evaluations" ON public.evaluations;

CREATE POLICY "Students can view own evaluations"
    ON public.evaluations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = evaluations.submission_id
              AND s.student_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Faculty can view allocated evaluations"
    ON public.evaluations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Faculty can manage allocated evaluations"
    ON public.evaluations FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.practicals pr ON pr.id = s.practical_id
            JOIN public.profiles st ON st.id = s.student_id
            JOIN public.faculty_allocations fa ON fa.batch_id = st.batch_id AND fa.subject_id = pr.subject_id
            WHERE s.id = evaluations.submission_id
              AND fa.faculty_id = (SELECT auth.uid())
        )
    );

-- ------------------------------------------------------------------------------
-- 2. SEED ACTIVE PROFILES & ALLOCATIONS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_college_id UUID;
    v_dept_id UUID;
    v_div_id UUID;
    v_batch_c1_id UUID;
    v_batch_c2_id UUID;
    v_batch_c3_id UUID;
    v_subject_id UUID;
    v_student_auth_id UUID := 'a6264b6f-1567-488d-aa70-82a25c66abaa';
    v_faculty_auth_id UUID := '267914ae-fc60-4a1a-b900-364e6e0fae24';
BEGIN
    SELECT id INTO v_college_id FROM public.colleges WHERE code = 'CLG_GHRCEM' LIMIT 1;
    SELECT id INTO v_dept_id FROM public.departments WHERE code = 'CSE-AI' LIMIT 1;
    SELECT id INTO v_div_id FROM public.divisions WHERE name = 'Division C' LIMIT 1;
    SELECT id INTO v_batch_c1_id FROM public.batches WHERE name = 'C1' AND division_id = v_div_id LIMIT 1;
    SELECT id INTO v_batch_c2_id FROM public.batches WHERE name = 'C2' AND division_id = v_div_id LIMIT 1;
    SELECT id INTO v_batch_c3_id FROM public.batches WHERE name = 'C3' AND division_id = v_div_id LIMIT 1;
    SELECT id INTO v_subject_id FROM public.subjects WHERE code = 'CS201P' LIMIT 1;

    -- Upsert student profile
    INSERT INTO public.profiles (id, email, full_name, role, identifier, college_id, department_id, division_id, batch_id, status)
    VALUES (
        v_student_auth_id,
        'student001@college.edu',
        'Student 001',
        'student',
        'GHR2025AI001',
        v_college_id,
        v_dept_id,
        v_div_id,
        v_batch_c1_id,
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'student',
        status = 'active',
        identifier = 'GHR2025AI001',
        college_id = v_college_id,
        department_id = v_dept_id,
        division_id = v_div_id,
        batch_id = v_batch_c1_id;

    -- Upsert faculty profile
    INSERT INTO public.profiles (id, email, full_name, role, identifier, college_id, department_id, division_id, status)
    VALUES (
        v_faculty_auth_id,
        'faculty001@college.edu',
        'Faculty One',
        'faculty',
        'FAC001',
        v_college_id,
        v_dept_id,
        v_div_id,
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'faculty',
        status = 'active',
        identifier = 'FAC001',
        college_id = v_college_id,
        department_id = v_dept_id,
        division_id = v_div_id;

    -- Link Faculty Allocations (FAC001 -> CS201P -> C1, C2, C3)
    IF v_subject_id IS NOT NULL THEN
        IF v_batch_c1_id IS NOT NULL THEN
            INSERT INTO public.faculty_allocations (faculty_id, subject_id, batch_id)
            VALUES (v_faculty_auth_id, v_subject_id, v_batch_c1_id)
            ON CONFLICT (faculty_id, subject_id, batch_id) DO NOTHING;
        END IF;

        IF v_batch_c2_id IS NOT NULL THEN
            INSERT INTO public.faculty_allocations (faculty_id, subject_id, batch_id)
            VALUES (v_faculty_auth_id, v_subject_id, v_batch_c2_id)
            ON CONFLICT (faculty_id, subject_id, batch_id) DO NOTHING;
        END IF;

        IF v_batch_c3_id IS NOT NULL THEN
            INSERT INTO public.faculty_allocations (faculty_id, subject_id, batch_id)
            VALUES (v_faculty_auth_id, v_subject_id, v_batch_c3_id)
            ON CONFLICT (faculty_id, subject_id, batch_id) DO NOTHING;
        END IF;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. SEED 10 CANONICAL PRACTICALS & TEST CASES FOR CS201P
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_sub_id UUID;
    v_p1 UUID;
    v_p2 UUID;
    v_p3 UUID;
    v_p4 UUID;
    v_p5 UUID;
    v_p6 UUID;
    v_p7 UUID;
    v_p8 UUID;
    v_p9 UUID;
    v_p10 UUID;
BEGIN
    SELECT id INTO v_sub_id FROM public.subjects WHERE code = 'CS201P' LIMIT 1;
    IF v_sub_id IS NULL THEN
        RAISE EXCEPTION 'Subject CS201P not found in database!';
    END IF;

    -- PRACTICAL 1: Singly Linked List
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 1,
        'Practical 01: Singly Linked List Implementation & Operations',
        'To implement a dynamic Singly Linked List in C++/Python supporting node insertion (at head, tail, position), deletion by key, and linear traversal.',
        '{
            "category": "Linear Structures",
            "nepLevel": "Level 4 (Pointers & Dynamic Memory)",
            "avgTime": "25 Mins",
            "difficulty": "Easy",
            "algorithm": [
                {"title": "Node Creation", "detail": "Allocate heap memory for a Node containing an integer payload and next pointer initialized to null."},
                {"title": "Head Insertion", "detail": "Assign newNode->next = head, then advance head = newNode in O(1) time."},
                {"title": "Tail Insertion", "detail": "Traverse to the final node (curr->next == null) and assign curr->next = newNode."},
                {"title": "Traversal", "detail": "Iterate from head printing node data separated by spaces until curr == null."}
            ],
            "pseudocode": "function INSERT_TAIL(head, val):\n  node = new Node(val)\n  if head is null return node\n  curr = head\n  while curr.next is not null: curr = curr.next\n  curr.next = node\n  return head"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\nusing namespace std;\nstruct Node { int data; Node* next; Node(int v): data(v), next(nullptr) {} };\nint main() {\n    int n; if (!(cin >> n)) return 0;\n    Node *head = nullptr, *tail = nullptr;\n    for(int i=0; i<n; i++) {\n        int v; cin >> v;\n        Node* nn = new Node(v);\n        if (!head) head = tail = nn;\n        else { tail->next = nn; tail = nn; }\n    }\n    Node* curr = head;\n    while(curr) {\n        cout << curr->data << (curr->next ? \" \" : \"\");\n        curr = curr->next;\n    }\n    cout << endl;\n    return 0;\n}",
            "python": "import sys\nclass Node:\n    def __init__(self, val):\n        self.val = val\n        self.next = None\ndef main():\n    nums = list(map(int, sys.stdin.read().split()))\n    if not nums: return\n    n = nums[0]\n    vals = nums[1:n+1]\n    head = None\n    tail = None\n    for v in vals:\n        nn = Node(v)\n        if not head:\n            head = tail = nn\n        else:\n            tail.next = nn\n            tail = nn\n    curr = head\n    out = []\n    while curr:\n        out.append(str(curr.val))\n        curr = curr.next\n    print(\" \".join(out))\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\nclass Node { int val; Node next; Node(int v){ val = v; } }\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        Node head = null, tail = null;\n        for (int i = 0; i < n; i++) {\n            Node nn = new Node(sc.nextInt());\n            if (head == null) head = tail = nn;\n            else { tail.next = nn; tail = nn; }\n        }\n        StringBuilder sb = new StringBuilder();\n        Node curr = head;\n        while(curr != null) {\n            sb.append(curr.val).append(curr.next != null ? \" \" : \"\");\n            curr = curr.next;\n        }\n        System.out.println(sb.toString());\n    }\n}",
            "c": "#include <stdio.h>\n#include <stdlib.h>\ntypedef struct Node { int data; struct Node* next; } Node;\nint main() {\n    int n; if (scanf(\"%d\", &n) != 1) return 0;\n    Node *head = NULL, *tail = NULL;\n    for(int i = 0; i < n; i++) {\n        int v; scanf(\"%d\", &v);\n        Node* nn = (Node*)malloc(sizeof(Node));\n        nn->data = v; nn->next = NULL;\n        if (!head) head = tail = nn;\n        else { tail->next = nn; tail = nn; }\n    }\n    Node* curr = head;\n    while(curr) {\n        printf(\"%d%s\", curr->data, curr->next ? \" \" : \"\");\n        curr = curr->next;\n    }\n    printf(\"\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p1;

    -- PRACTICAL 2: Stack & Parentheses
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 2,
        'Practical 02: Stack Implementation & Balanced Parentheses Validation',
        'To construct an array-based Stack data structure and utilize it to validate well-formed parentheses strings with optimal O(N) time and space complexity.',
        '{
            "category": "Linear Stacks",
            "nepLevel": "Level 4 (LIFO Semantics & Parsing)",
            "avgTime": "20 Mins",
            "difficulty": "Easy",
            "algorithm": [
                {"title": "LIFO Push", "detail": "Push opening brackets (, {, [ onto the stack."},
                {"title": "Match Verification", "detail": "Upon reading closing bracket, check stack top for matching opening bracket. Pop if matched, else reject."},
                {"title": "Final State", "detail": "After reading full input, string is valid if and only if stack is empty."}
            ],
            "pseudocode": "for char in s:\n  if char in open_set: stack.push(char)\n  else if stack is empty or not match(stack.pop(), char): return false\nreturn stack.isEmpty()"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\n#include <stack>\n#include <string>\nusing namespace std;\nbool isValid(string s) {\n    stack<char> st;\n    for(char c : s) {\n        if (c == ''('' || c == ''{'' || c == ''['') st.push(c);\n        else {\n            if (st.empty()) return false;\n            if (c == '')'' && st.top() != ''('') return false;\n            if (c == ''}'' && st.top() != ''{'') return false;\n            if (c == '']'' && st.top() != ''['') return false;\n            st.pop();\n        }\n    }\n    return st.empty();\n}\nint main() {\n    string s; if (!(cin >> s)) return 0;\n    cout << (isValid(s) ? \"VALID\" : \"INVALID\") << endl;\n    return 0;\n}",
            "python": "import sys\ndef isValid(s):\n    st = []\n    mp = {'')'': ''('', ''}'': ''{'', '']'': ''[''}\n    for c in s:\n        if c in mp.values(): st.append(c)\n        elif c in mp:\n            if not st or st[-1] != mp[c]: return False\n            st.pop()\n    return len(st) == 0\ndef main():\n    line = sys.stdin.read().strip()\n    if not line: return\n    print(\"VALID\" if isValid(line) else \"INVALID\")\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) return;\n        String s = sc.next();\n        Stack<Character> st = new Stack<>();\n        boolean ok = true;\n        for (char c : s.toCharArray()) {\n            if (c == ''('' || c == ''{'' || c == ''['') st.push(c);\n            else {\n                if (st.isEmpty()) { ok = false; break; }\n                char top = st.pop();\n                if (c == '')'' && top != ''('') { ok = false; break; }\n                if (c == ''}'' && top != ''{'') { ok = false; break; }\n                if (c == '']'' && top != ''['') { ok = false; break; }\n            }\n        }\n        if (ok && st.isEmpty()) System.out.println(\"VALID\");\n        else System.out.println(\"INVALID\");\n    }\n}",
            "c": "#include <stdio.h>\n#include <string.h>\nint main() {\n    char s[1000]; if (scanf(\"%s\", s) != 1) return 0;\n    char st[1000]; int top = -1;\n    int valid = 1;\n    for(int i = 0; s[i]; i++) {\n        if (s[i] == ''('' || s[i] == ''{'' || s[i] == ''['') st[++top] = s[i];\n        else {\n            if (top == -1) { valid = 0; break; }\n            char o = st[top--];\n            if (s[i] == '')'' && o != ''('') { valid = 0; break; }\n            if (s[i] == ''}'' && o != ''{'') { valid = 0; break; }\n            if (s[i] == '']'' && o != ''['') { valid = 0; break; }\n        }\n    }\n    if (valid && top == -1) printf(\"VALID\\n\");\n    else printf(\"INVALID\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p2;

    -- PRACTICAL 3: Circular Queue
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 3,
        'Practical 03: Circular Queue & Priority Queue Scheduling',
        'To design and implement a Circular Queue using modular arithmetic to prevent false overflow and demonstrate process scheduling.',
        '{
            "category": "Linear Queues",
            "nepLevel": "Level 4 (Modular Indexing & FIFO Buffers)",
            "avgTime": "25 Mins",
            "difficulty": "Medium",
            "algorithm": [
                {"title": "Modular Step", "detail": "rear = (rear + 1) % capacity upon enqueue."},
                {"title": "Full Condition", "detail": "Queue is full when (rear + 1) % capacity == front."},
                {"title": "Dequeue Step", "detail": "front = (front + 1) % capacity upon dequeue."}
            ],
            "pseudocode": "function ENQUEUE(q, item):\n  if (q.rear + 1) % q.size == q.front return OVERFLOW\n  q.arr[q.rear] = item\n  q.rear = (q.rear + 1) % q.size"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    int n; if (!(cin >> n)) return 0;\n    vector<int> q;\n    for(int i=0; i<n; i++) {\n        string op; cin >> op;\n        if (op == \"ENQUEUE\") {\n            int v; cin >> v; q.push_back(v);\n        } else if (op == \"DEQUEUE\") {\n            if (!q.empty()) q.erase(q.begin());\n        }\n    }\n    for(size_t i=0; i<q.size(); i++) {\n        cout << q[i] << (i+1 < q.size() ? \" \" : \"\");\n    }\n    cout << endl;\n    return 0;\n}",
            "python": "import sys\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens: return\n    n = int(tokens[0])\n    idx = 1\n    q = []\n    for _ in range(n):\n        op = tokens[idx]; idx += 1\n        if op == ''ENQUEUE'':\n            q.append(tokens[idx]); idx += 1\n        elif op == ''DEQUEUE'':\n            if q: q.pop(0)\n    print(\" \".join(q))\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        Queue<Integer> q = new LinkedList<>();\n        for (int i = 0; i < n; i++) {\n            String op = sc.next();\n            if (op.equals(\"ENQUEUE\")) q.offer(sc.nextInt());\n            else if (op.equals(\"DEQUEUE\") && !q.isEmpty()) q.poll();\n        }\n        List<String> res = new ArrayList<>();\n        for (int v : q) res.add(String.valueOf(v));\n        System.out.println(String.join(\" \", res));\n    }\n}",
            "c": "#include <stdio.h>\n#include <string.h>\nint main() {\n    int n; if (scanf(\"%d\", &n) != 1) return 0;\n    int q[1000]; int front = 0, rear = 0;\n    for(int i = 0; i < n; i++) {\n        char op[16]; scanf(\"%s\", op);\n        if (strcmp(op, \"ENQUEUE\") == 0) {\n            int v; scanf(\"%d\", &v);\n            q[rear++] = v;\n        } else if (strcmp(op, \"DEQUEUE\") == 0) {\n            if (front < rear) front++;\n        }\n    }\n    for(int i = front; i < rear; i++) {\n        printf(\"%d%s\", q[i], (i + 1 < rear) ? \" \" : \"\");\n    }\n    printf(\"\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p3;

    -- PRACTICAL 4: Binary Search Tree
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 4,
        'Practical 04: Binary Search Tree (BST) Insertion & Inorder Traversal',
        'To implement a Binary Search Tree (BST) in C++/Python, perform node insertion maintaining BST invariant (Left < Root <= Right), and verify sorted output via Inorder Traversal.',
        '{
            "category": "Non-Linear Trees",
            "nepLevel": "Level 5 (Trees & Invariants)",
            "avgTime": "30 Mins",
            "difficulty": "Medium",
            "algorithm": [
                {"title": "BST Invariant", "detail": "All nodes in left subtree < root; all in right subtree >= root."},
                {"title": "Recursive Insert", "detail": "Recurse left if val < root->data, else recurse right until null pointer."},
                {"title": "Inorder Traversal", "detail": "Left -> Visit Root -> Right yields strictly sorted order."}
            ],
            "pseudocode": "function INSERT(root, val):\n  if root is null return Node(val)\n  if val < root.data: root.left = INSERT(root.left, val)\n  else: root.right = INSERT(root.right, val)\n  return root"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\nusing namespace std;\nstruct Node { int data; Node *l, *r; Node(int v): data(v), l(nullptr), r(nullptr) {} };\nNode* insert(Node* root, int val) {\n    if (!root) return new Node(val);\n    if (val < root->data) root->l = insert(root->l, val);\n    else root->r = insert(root->r, val);\n    return root;\n}\nvoid inorder(Node* root, bool &first) {\n    if (!root) return;\n    inorder(root->l, first);\n    if (!first) cout << \" \";\n    cout << root->data;\n    first = false;\n    inorder(root->r, first);\n}\nint main() {\n    int n; if (!(cin >> n)) return 0;\n    Node* root = nullptr;\n    for(int i=0; i<n; i++) {\n        int v; cin >> v; root = insert(root, v);\n    }\n    bool first = true;\n    inorder(root, first);\n    cout << endl;\n    return 0;\n}",
            "python": "import sys\nclass Node:\n    def __init__(self, val):\n        self.val = val\n        self.l = None\n        self.r = None\ndef insert(root, val):\n    if not root: return Node(val)\n    if val < root.val: root.l = insert(root.l, val)\n    else: root.r = insert(root.r, val)\n    return root\ndef inorder(root, res):\n    if not root: return\n    inorder(root.l, res)\n    res.append(str(root.val))\n    inorder(root.r, res)\ndef main():\n    nums = list(map(int, sys.stdin.read().split()))\n    if not nums: return\n    root = None\n    for v in nums[1:nums[0]+1]: root = insert(root, v)\n    res = []\n    inorder(root, res)\n    print(\" \".join(res))\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\nclass Node { int val; Node l, r; Node(int v) { val = v; } }\npublic class Main {\n    static Node insert(Node root, int val) {\n        if (root == null) return new Node(val);\n        if (val < root.val) root.l = insert(root.l, val);\n        else root.r = insert(root.r, val);\n        return root;\n    }\n    static void inorder(Node root, List<String> res) {\n        if (root == null) return;\n        inorder(root.l, res);\n        res.add(String.valueOf(root.val));\n        inorder(root.r, res);\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        Node root = null;\n        for (int i = 0; i < n; i++) root = insert(root, sc.nextInt());\n        List<String> res = new ArrayList<>();\n        inorder(root, res);\n        System.out.println(String.join(\" \", res));\n    }\n}",
            "c": "#include <stdio.h>\n#include <stdlib.h>\ntypedef struct Node { int data; struct Node *l, *r; } Node;\nNode* insert(Node* root, int val) {\n    if (!root) {\n        Node* n = (Node*)malloc(sizeof(Node));\n        n->data = val; n->l = n->r = NULL;\n        return n;\n    }\n    if (val < root->data) root->l = insert(root->l, val);\n    else root->r = insert(root->r, val);\n    return root;\n}\nvoid inorder(Node* root, int *first) {\n    if (!root) return;\n    inorder(root->l, first);\n    if (!*first) printf(\" \");\n    printf(\"%d\", root->data);\n    *first = 0;\n    inorder(root->r, first);\n}\nint main() {\n    int n; if (scanf(\"%d\", &n) != 1) return 0;\n    Node* root = NULL;\n    for(int i = 0; i < n; i++) {\n        int v; scanf(\"%d\", &v);\n        root = insert(root, v);\n    }\n    int first = 1;\n    inorder(root, &first);\n    printf(\"\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p4;

    -- PRACTICAL 5: AVL Tree
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 5,
        'Practical 05: AVL Tree: Height-Balanced Binary Search Tree',
        'Construct an AVL tree supporting LL, RR, LR, and RL rotations to maintain an absolute balance factor <= 1 across all nodes after dynamic insertions.',
        '{
            "category": "Non-Linear Trees",
            "nepLevel": "Level 5 (Self-Balancing Invariants)",
            "avgTime": "35 Mins",
            "difficulty": "Hard",
            "algorithm": [
                {"title": "Balance Factor Calculation", "detail": "bf = height(node->left) - height(node->right). Valid range is [-1, 0, 1]."},
                {"title": "Rotation Cases", "detail": "Apply Right Rotate for Left-Left case; Left Rotate for Right-Right case; Double Rotations for LR and RL."},
                {"title": "Inorder Verification", "detail": "Verify sorted order and height balance across all subtrees."}
            ],
            "pseudocode": "function ROTATE_RIGHT(y):\n  x = y.left; T2 = x.right\n  x.right = y; y.left = T2\n  update_height(y); update_height(x)\n  return x"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\n#include <algorithm>\nusing namespace std;\nstruct Node {\n    int key, height;\n    Node *left, *right;\n    Node(int k) : key(k), height(1), left(nullptr), right(nullptr) {}\n};\nint height(Node *N) { return N ? N->height : 0; }\nint getBalance(Node *N) { return N ? height(N->left) - height(N->right) : 0; }\nNode *rightRotate(Node *y) {\n    Node *x = y->left;\n    Node *T2 = x->right;\n    x->right = y;\n    y->left = T2;\n    y->height = max(height(y->left), height(y->right)) + 1;\n    x->height = max(height(x->left), height(x->right)) + 1;\n    return x;\n}\nNode *leftRotate(Node *x) {\n    Node *y = x->right;\n    Node *T2 = y->left;\n    y->left = x;\n    x->right = T2;\n    x->height = max(height(x->left), height(x->right)) + 1;\n    y->height = max(height(y->left), height(y->right)) + 1;\n    return y;\n}\nNode* insert(Node* node, int key) {\n    if (!node) return new Node(key);\n    if (key < node->key) node->left = insert(node->left, key);\n    else if (key > node->key) node->right = insert(node->right, key);\n    else return node;\n    node->height = 1 + max(height(node->left), height(node->right));\n    int balance = getBalance(node);\n    if (balance > 1 && key < node->left->key) return rightRotate(node);\n    if (balance < -1 && key > node->right->key) return leftRotate(node);\n    if (balance > 1 && key > node->left->key) {\n        node->left = leftRotate(node->left);\n        return rightRotate(node);\n    }\n    if (balance < -1 && key < node->right->key) {\n        node->right = rightRotate(node->right);\n        return leftRotate(node);\n    }\n    return node;\n}\nvoid inorder(Node *root, bool &first) {\n    if (!root) return;\n    inorder(root->left, first);\n    if (!first) cout << \" \";\n    cout << root->key;\n    first = false;\n    inorder(root->right, first);\n}\nint main() {\n    int n; if (!(cin >> n)) return 0;\n    Node *root = nullptr;\n    for (int i = 0; i < n; i++) {\n        int val; cin >> val;\n        root = insert(root, val);\n    }\n    bool first = true;\n    inorder(root, first);\n    cout << endl;\n    return 0;\n}",
            "python": "import sys\nclass Node:\n    def __init__(self, key):\n        self.key = key\n        self.left = None\n        self.right = None\n        self.height = 1\ndef getHeight(n): return n.height if n else 0\ndef getBalance(n): return getHeight(n.left) - getHeight(n.right) if n else 0\ndef rightRotate(y):\n    x = y.left; T2 = x.right\n    x.right = y; y.left = T2\n    y.height = 1 + max(getHeight(y.left), getHeight(y.right))\n    x.height = 1 + max(getHeight(x.left), getHeight(x.right))\n    return x\ndef leftRotate(x):\n    y = x.right; T2 = y.left\n    y.left = x; x.right = T2\n    x.height = 1 + max(getHeight(x.left), getHeight(x.right))\n    y.height = 1 + max(getHeight(y.left), getHeight(y.right))\n    return y\ndef insert(node, key):\n    if not node: return Node(key)\n    if key < node.key: node.left = insert(node.left, key)\n    elif key > node.key: node.right = insert(node.right, key)\n    else: return node\n    node.height = 1 + max(getHeight(node.left), getHeight(node.right))\n    b = getBalance(node)\n    if b > 1 and key < node.left.key: return rightRotate(node)\n    if b < -1 and key > node.right.key: return leftRotate(node)\n    if b > 1 and key > node.left.key:\n        node.left = leftRotate(node.left)\n        return rightRotate(node)\n    if b < -1 and key < node.right.key:\n        node.right = rightRotate(node.right)\n        return leftRotate(node)\n    return node\ndef inorder(node, res):\n    if not node: return\n    inorder(node.left, res)\n    res.append(str(node.key))\n    inorder(node.right, res)\ndef main():\n    nums = list(map(int, sys.stdin.read().split()))\n    if not nums: return\n    root = None\n    for v in nums[1:nums[0]+1]: root = insert(root, v)\n    res = []\n    inorder(root, res)\n    print(\" \".join(res))\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\nclass Node {\n    int key, height = 1;\n    Node left, right;\n    Node(int k) { key = k; }\n}\npublic class Main {\n    static int height(Node N) { return N == null ? 0 : N.height; }\n    static int getBalance(Node N) { return N == null ? 0 : height(N.left) - height(N.right); }\n    static Node rightRotate(Node y) {\n        Node x = y.left, T2 = x.right;\n        x.right = y; y.left = T2;\n        y.height = Math.max(height(y.left), height(y.right)) + 1;\n        x.height = Math.max(height(x.left), height(x.right)) + 1;\n        return x;\n    }\n    static Node leftRotate(Node x) {\n        Node y = x.right, T2 = y.left;\n        y.left = x; x.right = T2;\n        x.height = Math.max(height(x.left), height(x.right)) + 1;\n        y.height = Math.max(height(y.left), height(y.right)) + 1;\n        return y;\n    }\n    static Node insert(Node node, int key) {\n        if (node == null) return new Node(key);\n        if (key < node.key) node.left = insert(node.left, key);\n        else if (key > node.key) node.right = insert(node.right, key);\n        else return node;\n        node.height = 1 + Math.max(height(node.left), height(node.right));\n        int balance = getBalance(node);\n        if (balance > 1 && key < node.left.key) return rightRotate(node);\n        if (balance < -1 && key > node.right.key) return leftRotate(node);\n        if (balance > 1 && key > node.left.key) {\n            node.left = leftRotate(node.left);\n            return rightRotate(node);\n        }\n        if (balance < -1 && key < node.right.key) {\n            node.right = rightRotate(node.right);\n            return leftRotate(node);\n        }\n        return node;\n    }\n    static void inorder(Node root, List<String> res) {\n        if (root == null) return;\n        inorder(root.left, res);\n        res.add(String.valueOf(root.key));\n        inorder(root.right, res);\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        Node root = null;\n        for (int i = 0; i < n; i++) root = insert(root, sc.nextInt());\n        List<String> res = new ArrayList<>();\n        inorder(root, res);\n        System.out.println(String.join(\" \", res));\n    }\n}",
            "c": "#include <stdio.h>\n#include <stdlib.h>\ntypedef struct Node { int key, height; struct Node *left, *right; } Node;\nint max(int a, int b) { return a > b ? a : b; }\nint height(Node *N) { return N ? N->height : 0; }\nint getBalance(Node *N) { return N ? height(N->left) - height(N->right) : 0; }\nNode *rightRotate(Node *y) {\n    Node *x = y->left; Node *T2 = x->right;\n    x->right = y; y->left = T2;\n    y->height = max(height(y->left), height(y->right)) + 1;\n    x->height = max(height(x->left), height(x->right)) + 1;\n    return x;\n}\nNode *leftRotate(Node *x) {\n    Node *y = x->right; Node *T2 = y->left;\n    y->left = x; x->right = T2;\n    x->height = max(height(x->left), height(x->right)) + 1;\n    y->height = max(height(y->left), height(y->right)) + 1;\n    return y;\n}\nNode* insert(Node* node, int key) {\n    if (!node) {\n        Node* n = (Node*)malloc(sizeof(Node));\n        n->key = key; n->height = 1; n->left = n->right = NULL;\n        return n;\n    }\n    if (key < node->key) node->left = insert(node->left, key);\n    else if (key > node->key) node->right = insert(node->right, key);\n    else return node;\n    node->height = 1 + max(height(node->left), height(node->right));\n    int balance = getBalance(node);\n    if (balance > 1 && key < node->left->key) return rightRotate(node);\n    if (balance < -1 && key > node->right->key) return leftRotate(node);\n    if (balance > 1 && key > node->left->key) {\n        node->left = leftRotate(node->left);\n        return rightRotate(node);\n    }\n    if (balance < -1 && key < node->right->key) {\n        node->right = rightRotate(node->right);\n        return leftRotate(node);\n    }\n    return node;\n}\nvoid inorder(Node *root, int *first) {\n    if (!root) return;\n    inorder(root->left, first);\n    if (!*first) printf(\" \");\n    printf(\"%d\", root->key);\n    *first = 0;\n    inorder(root->right, first);\n}\nint main() {\n    int n; if (scanf(\"%d\", &n) != 1) return 0;\n    Node *root = NULL;\n    for(int i = 0; i < n; i++) {\n        int val; scanf(\"%d\", &val);\n        root = insert(root, val);\n    }\n    int first = 1;\n    inorder(root, &first);\n    printf(\"\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p5;

    -- PRACTICAL 6: BFS & DFS
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 6,
        'Practical 06: Graph Traversal: Breadth First Search (BFS) & Depth First Search (DFS)',
        'To model an undirected graph via adjacency list and execute BFS (queue-based) and DFS (stack/recursion) traversals from a designated starting vertex.',
        '{
            "category": "Graphs",
            "nepLevel": "Level 5 (Graph Traversal & Invariants)",
            "avgTime": "30 Mins",
            "difficulty": "Medium",
            "algorithm": [
                {"title": "Adjacency Representation", "detail": "Map each vertex to its adjacent neighbor list sorted in ascending order."},
                {"title": "BFS Traversal", "detail": "Enqueue source, mark visited, process neighbors in FIFO sequence."},
                {"title": "DFS Traversal", "detail": "Recurse deeply along unvisited branches before backtracking."}
            ],
            "pseudocode": "function BFS(src):\n  q.push(src); visited[src] = true\n  while not q.empty():\n    u = q.pop()\n    for v in adj[u]:\n      if not visited[v]: visited[v] = true; q.push(v)"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\n#include <vector>\n#include <queue>\n#include <algorithm>\nusing namespace std;\nint main() {\n    int V, E; if (!(cin >> V >> E)) return 0;\n    vector<vector<int>> adj(V);\n    for(int i=0; i<E; i++) {\n        int u, v; cin >> u >> v;\n        adj[u].push_back(v);\n        adj[v].push_back(u);\n    }\n    for(int i=0; i<V; i++) sort(adj[i].begin(), adj[i].end());\n    queue<int> q; vector<bool> vis(V, false);\n    q.push(0); vis[0] = true;\n    bool first = true;\n    while(!q.empty()) {\n        int u = q.front(); q.pop();\n        if (!first) cout << \" \";\n        cout << u;\n        first = false;\n        for(int v : adj[u]) {\n            if (!vis[v]) { vis[v] = true; q.push(v); }\n        }\n    }\n    cout << endl;\n    return 0;\n}",
            "python": "import sys\nfrom collections import deque\ndef main():\n    tokens = list(map(int, sys.stdin.read().split()))\n    if not tokens: return\n    V, E = tokens[0], tokens[1]\n    adj = [[] for _ in range(V)]\n    idx = 2\n    for _ in range(E):\n        u, v = tokens[idx], tokens[idx+1]\n        idx += 2\n        adj[u].append(v)\n        adj[v].append(u)\n    for i in range(V): adj[i].sort()\n    q = deque([0])\n    vis = [False]*V\n    vis[0] = True\n    res = []\n    while q:\n        u = q.popleft()\n        res.append(str(u))\n        for v in adj[u]:\n            if not vis[v]:\n                vis[v] = True\n                q.append(v)\n    print(\" \".join(res))\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int V = sc.nextInt(), E = sc.nextInt();\n        List<List<Integer>> adj = new ArrayList<>();\n        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());\n        for (int i = 0; i < E; i++) {\n            int u = sc.nextInt(), v = sc.nextInt();\n            adj.get(u).add(v); adj.get(v).add(u);\n        }\n        for (int i = 0; i < V; i++) Collections.sort(adj.get(i));\n        Queue<Integer> q = new LinkedList<>();\n        boolean[] vis = new boolean[V];\n        q.offer(0); vis[0] = true;\n        List<String> res = new ArrayList<>();\n        while (!q.isEmpty()) {\n            int u = q.poll();\n            res.add(String.valueOf(u));\n            for (int v : adj.get(u)) {\n                if (!vis[v]) { vis[v] = true; q.offer(v); }\n            }\n        }\n        System.out.println(String.join(\" \", res));\n    }\n}",
            "c": "#include <stdio.h>\n#include <stdlib.h>\nint main() {\n    int V, E; if (scanf(\"%d %d\", &V, &E) != 2) return 0;\n    int adj[100][100] = {0};\n    for(int i = 0; i < E; i++) {\n        int u, v; scanf(\"%d %d\", &u, &v);\n        adj[u][v] = adj[v][u] = 1;\n    }\n    int q[100], front = 0, rear = 0;\n    int vis[100] = {0};\n    q[rear++] = 0; vis[0] = 1;\n    int first = 1;\n    while(front < rear) {\n        int u = q[front++];\n        if (!first) printf(\" \");\n        printf(\"%d\", u);\n        first = 0;\n        for(int v = 0; v < V; v++) {\n            if (adj[u][v] && !vis[v]) {\n                vis[v] = 1;\n                q[rear++] = v;\n            }\n        }\n    }\n    printf(\"\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p6;

    -- PRACTICAL 7: Dijkstra
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 7,
        'Practical 07: Dijkstra Algorithm: Single-Source Shortest Path',
        'Find the shortest distance from a designated source vertex to all other vertices in a weighted graph using a min-priority queue.',
        '{
            "category": "Greedy Algorithms",
            "nepLevel": "Level 6 (Shortest Path & Priority Queues)",
            "avgTime": "35 Mins",
            "difficulty": "Hard",
            "algorithm": [
                {"title": "Initialization", "detail": "Set dist[src] = 0, dist[v] = infinity for all v != src. Push (0, src) to min-heap."},
                {"title": "Greedy Relaxation", "detail": "Pop closest vertex u. If new weight u->v < dist[v], update dist[v] and push to heap."},
                {"title": "Complexity", "detail": "Runs in O((V + E) log V) with adjacency lists and binary min-heap."}
            ],
            "pseudocode": "while not pq.empty():\n  (d, u) = pq.pop()\n  if d > dist[u]: continue\n  for (v, w) in adj[u]:\n    if dist[u] + w < dist[v]: dist[v] = dist[u] + w; pq.push((dist[v], v))"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\n#include <vector>\n#include <queue>\nusing namespace std;\nconst int INF = 1e9;\nint main() {\n    int V, E, src; if (!(cin >> V >> E >> src)) return 0;\n    vector<vector<pair<int, int>>> adj(V);\n    for (int i = 0; i < E; i++) {\n        int u, v, w; cin >> u >> v >> w;\n        adj[u].push_back({v, w});\n        adj[v].push_back({u, w});\n    }\n    vector<int> dist(V, INF);\n    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;\n    dist[src] = 0; pq.push({0, src});\n    while (!pq.empty()) {\n        auto [d, u] = pq.top(); pq.pop();\n        if (d > dist[u]) continue;\n        for (auto &edge : adj[u]) {\n            int v = edge.first, w = edge.second;\n            if (dist[u] + w < dist[v]) {\n                dist[v] = dist[u] + w;\n                pq.push({dist[v], v});\n            }\n        }\n    }\n    for (int i = 0; i < V; i++) {\n        cout << (dist[i] == INF ? -1 : dist[i]) << (i + 1 < V ? \" \" : \"\");\n    }\n    cout << endl;\n    return 0;\n}",
            "python": "import sys, heapq\ndef main():\n    tokens = list(map(int, sys.stdin.read().split()))\n    if not tokens: return\n    V, E, src = tokens[0], tokens[1], tokens[2]\n    adj = [[] for _ in range(V)]\n    idx = 3\n    for _ in range(E):\n        u, v, w = tokens[idx], tokens[idx+1], tokens[idx+2]\n        idx += 3\n        adj[u].append((v, w))\n        adj[v].append((u, w))\n    dist = [float(''inf'')]*V\n    dist[src] = 0\n    pq = [(0, src)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]: continue\n        for v, w in adj[u]:\n            if dist[u] + w < dist[v]:\n                dist[v] = dist[u] + w\n                heapq.heappush(pq, (dist[v], v))\n    res = [str(x) if x != float(''inf'') else \"-1\" for x in dist]\n    print(\" \".join(res))\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\npublic class Main {\n    static class Edge { int to, weight; Edge(int t, int w) { to = t; weight = w; } }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int V = sc.nextInt(), E = sc.nextInt(), src = sc.nextInt();\n        List<List<Edge>> adj = new ArrayList<>();\n        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());\n        for (int i = 0; i < E; i++) {\n            int u = sc.nextInt(), v = sc.nextInt(), w = sc.nextInt();\n            adj.get(u).add(new Edge(v, w));\n            adj.get(v).add(new Edge(u, w));\n        }\n        int[] dist = new int[V];\n        Arrays.fill(dist, Integer.MAX_VALUE);\n        dist[src] = 0;\n        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));\n        pq.offer(new int[]{0, src});\n        while (!pq.isEmpty()) {\n            int[] cur = pq.poll();\n            int d = cur[0], u = cur[1];\n            if (d > dist[u]) continue;\n            for (Edge e : adj.get(u)) {\n                if (dist[u] + e.weight < dist[e.to]) {\n                    dist[e.to] = dist[u] + e.weight;\n                    pq.offer(new int[]{dist[e.to], e.to});\n                }\n            }\n        }\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < V; i++) sb.append(dist[i] == Integer.MAX_VALUE ? -1 : dist[i]).append(i + 1 < V ? \" \" : \"\");\n        System.out.println(sb.toString());\n    }\n}",
            "c": "#include <stdio.h>\n#define INF 1000000000\nint main() {\n    int V, E, src; if (scanf(\"%d %d %d\", &V, &E, &src) != 3) return 0;\n    int adj[100][100];\n    for(int i=0; i<V; i++) for(int j=0; j<V; j++) adj[i][j] = (i==j?0:INF);\n    for(int i=0; i<E; i++) {\n        int u, v, w; scanf(\"%d %d %d\", &u, &v, &w);\n        adj[u][v] = adj[v][u] = w;\n    }\n    int dist[100], vis[100] = {0};\n    for(int i=0; i<V; i++) dist[i] = INF;\n    dist[src] = 0;\n    for(int it=0; it<V; it++) {\n        int u = -1;\n        for(int i=0; i<V; i++) if (!vis[i] && (u == -1 || dist[i] < dist[u])) u = i;\n        if (u == -1 || dist[u] == INF) break;\n        vis[u] = 1;\n        for(int v=0; v<V; v++) {\n            if (adj[u][v] != INF && dist[u] + adj[u][v] < dist[v]) dist[v] = dist[u] + adj[u][v];\n        }\n    }\n    for(int i=0; i<V; i++) printf(\"%d%s\", dist[i] == INF ? -1 : dist[i], i+1<V?\" \":\"\");\n    printf(\"\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p7;

    -- PRACTICAL 8: Minimum Spanning Tree
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 8,
        'Practical 08: Minimum Spanning Tree (MST): Kruskal & Prim Algorithms',
        'To compute the Minimum Spanning Tree of a connected, undirected weighted graph utilizing disjoint-set union-find (Kruskal) or greedy priority queue (Prim).',
        '{
            "category": "Greedy Algorithms",
            "nepLevel": "Level 6 (Spanning Trees & Disjoint Sets)",
            "avgTime": "35 Mins",
            "difficulty": "Hard",
            "algorithm": [
                {"title": "Edge Sorting", "detail": "Sort all edges in non-decreasing order of weight."},
                {"title": "Cycle Prevention", "detail": "Use Disjoint Set Union (DSU) with path compression to add edges only if they connect distinct components."},
                {"title": "Stop Condition", "detail": "Terminate when V-1 edges are added or edges exhausted."}
            ],
            "pseudocode": "for edge (u, v, w) in sorted_edges:\n  if find(u) != find(v):\n    union(u, v)\n    mst_weight += w"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nstruct Edge { int u, v, w; };\nstruct DSU {\n    vector<int> parent;\n    DSU(int n) { parent.resize(n); for(int i=0; i<n; i++) parent[i] = i; }\n    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }\n    bool unite(int x, int y) {\n        int rx = find(x), ry = find(y);\n        if (rx == ry) return false;\n        parent[rx] = ry; return true;\n    }\n};\nint main() {\n    int V, E; if (!(cin >> V >> E)) return 0;\n    vector<Edge> edges(E);\n    for(int i=0; i<E; i++) cin >> edges[i].u >> edges[i].v >> edges[i].w;\n    sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b){ return a.w < b.w; });\n    DSU dsu(V); int total = 0;\n    for(const auto& e : edges) {\n        if (dsu.unite(e.u, e.v)) total += e.w;\n    }\n    cout << total << endl;\n    return 0;\n}",
            "python": "import sys\ndef main():\n    tokens = list(map(int, sys.stdin.read().split()))\n    if not tokens: return\n    V, E = tokens[0], tokens[1]\n    edges = []\n    idx = 2\n    for _ in range(E):\n        edges.append((tokens[idx+2], tokens[idx], tokens[idx+1]))\n        idx += 3\n    edges.sort()\n    parent = list(range(V))\n    def find(x):\n        if parent[x] != x: parent[x] = find(parent[x])\n        return parent[x]\n    total = 0\n    for w, u, v in edges:\n        ru, rv = find(u), find(v)\n        if ru != rv:\n            parent[ru] = rv\n            total += w\n    print(total)\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\npublic class Main {\n    static class Edge implements Comparable<Edge> {\n        int u, v, w; Edge(int u, int v, int w) { this.u = u; this.v = v; this.w = w; }\n        public int compareTo(Edge o) { return Integer.compare(this.w, o.w); }\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int V = sc.nextInt(), E = sc.nextInt();\n        List<Edge> edges = new ArrayList<>();\n        for(int i=0; i<E; i++) edges.add(new Edge(sc.nextInt(), sc.nextInt(), sc.nextInt()));\n        Collections.sort(edges);\n        int[] p = new int[V]; for(int i=0; i<V; i++) p[i] = i;\n        class FindHelper {\n            int find(int x) { return p[x] == x ? x : (p[x] = find(p[x])); }\n        }\n        FindHelper fh = new FindHelper();\n        int total = 0;\n        for(Edge e : edges) {\n            int ru = fh.find(e.u), rv = fh.find(e.v);\n            if (ru != rv) { p[ru] = rv; total += e.w; }\n        }\n        System.out.println(total);\n    }\n}",
            "c": "#include <stdio.h>\n#include <stdlib.h>\ntypedef struct { int u, v, w; } Edge;\nint cmp(const void* a, const void* b) { return ((Edge*)a)->w - ((Edge*)b)->w; }\nint find(int p[], int x) { return p[x] == x ? x : (p[x] = find(p, p[x])); }\nint main() {\n    int V, E; if (scanf(\"%d %d\", &V, &E) != 2) return 0;\n    Edge* edges = (Edge*)malloc(sizeof(Edge)*E);\n    for(int i=0; i<E; i++) scanf(\"%d %d %d\", &edges[i].u, &edges[i].v, &edges[i].w);\n    qsort(edges, E, sizeof(Edge), cmp);\n    int* p = (int*)malloc(sizeof(int)*V);\n    for(int i=0; i<V; i++) p[i] = i;\n    int total = 0;\n    for(int i=0; i<E; i++) {\n        int ru = find(p, edges[i].u), rv = find(p, edges[i].v);\n        if (ru != rv) { p[ru] = rv; total += edges[i].w; }\n    }\n    printf(\"%d\\n\", total);\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p8;

    -- PRACTICAL 9: Hash Table
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 9,
        'Practical 09: Hash Table with Open Addressing & Collision Resolution',
        'Implement a fixed-size Hash Table with modulo hashing and Linear Probing to resolve hash collisions during key-value operations.',
        '{
            "category": "Hashing & Dictionaries",
            "nepLevel": "Level 5 (Collision Resolution & Load Factor)",
            "avgTime": "25 Mins",
            "difficulty": "Medium",
            "algorithm": [
                {"title": "Hash Function", "detail": "index = key % table_size."},
                {"title": "Linear Probing", "detail": "If slot is occupied, inspect (index + 1) % table_size sequentially."},
                {"title": "Search/Retrieve", "detail": "Traverse sequentially until key found or empty slot reached."}
            ],
            "pseudocode": "function INSERT(key, val):\n  idx = key % size\n  while table[idx] is occupied and table[idx].key != key:\n    idx = (idx + 1) % size\n  table[idx] = (key, val)"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    int size, n; if (!(cin >> size >> n)) return 0;\n    vector<int> table(size, -1);\n    for(int i=0; i<n; i++) {\n        int key; cin >> key;\n        int idx = key % size;\n        while(table[idx] != -1) idx = (idx + 1) % size;\n        table[idx] = key;\n    }\n    for(int i=0; i<size; i++) {\n        cout << table[i] << (i + 1 < size ? \" \" : \"\");\n    }\n    cout << endl;\n    return 0;\n}",
            "python": "import sys\ndef main():\n    tokens = list(map(int, sys.stdin.read().split()))\n    if not tokens: return\n    size, n = tokens[0], tokens[1]\n    table = [-1]*size\n    for key in tokens[2:2+n]:\n        idx = key % size\n        while table[idx] != -1: idx = (idx + 1) % size\n        table[idx] = key\n    print(\" \".join(map(str, table)))\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int size = sc.nextInt(), n = sc.nextInt();\n        int[] table = new int[size];\n        Arrays.fill(table, -1);\n        for(int i=0; i<n; i++) {\n            int key = sc.nextInt();\n            int idx = key % size;\n            while(table[idx] != -1) idx = (idx + 1) % size;\n            table[idx] = key;\n        }\n        StringBuilder sb = new StringBuilder();\n        for(int i=0; i<size; i++) sb.append(table[i]).append(i+1<size?\" \":\"\");\n        System.out.println(sb.toString());\n    }\n}",
            "c": "#include <stdio.h>\n#include <stdlib.h>\nint main() {\n    int size, n; if (scanf(\"%d %d\", &size, &n) != 2) return 0;\n    int table[100];\n    for(int i=0; i<size; i++) table[i] = -1;\n    for(int i=0; i<n; i++) {\n        int key; scanf(\"%d\", &key);\n        int idx = key % size;\n        while(table[idx] != -1) idx = (idx + 1) % size;\n        table[idx] = key;\n    }\n    for(int i=0; i<size; i++) printf(\"%d%s\", table[i], i+1<size?\" \":\"\");\n    printf(\"\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p9;

    -- PRACTICAL 10: Sorting Benchmark
    INSERT INTO public.practicals (
        subject_id, practical_number, title, aim,
        theory_content, starter_codes,
        max_coding_marks, max_writeup_marks, max_viva_marks
    ) VALUES (
        v_sub_id, 10,
        'Practical 10: Empirical Complexity Analysis: QuickSort vs MergeSort vs HeapSort',
        'To implement divide-and-conquer sorting algorithms (QuickSort, MergeSort, HeapSort) and empirically verify sorted output and O(N log N) asymptotic bounds.',
        '{
            "category": "Sorting & Complexity",
            "nepLevel": "Level 5 (Divide & Conquer & Benchmarking)",
            "avgTime": "30 Mins",
            "difficulty": "Medium",
            "algorithm": [
                {"title": "MergeSort Divide", "detail": "Split array into halves recursively until subproblems reach size 1."},
                {"title": "Two-Pointer Merge", "detail": "Merge sorted halves in O(N) linear time using auxiliary memory."},
                {"title": "Asymptotic Guarantee", "detail": "Guaranteed O(N log N) worst-case time complexity across all inputs."}
            ],
            "pseudocode": "function MERGESORT(arr):\n  if len(arr) <= 1 return arr\n  mid = len(arr) // 2\n  left = MERGESORT(arr[:mid]); right = MERGESORT(arr[mid:])\n  return merge(left, right)"
        }'::jsonb,
        '{
            "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nvoid mergeSort(vector<int>& arr, int l, int r) {\n    if (l >= r) return;\n    int m = l + (r - l) / 2;\n    mergeSort(arr, l, m);\n    mergeSort(arr, m + 1, r);\n    vector<int> tmp;\n    int i = l, j = m + 1;\n    while(i <= m && j <= r) {\n        if (arr[i] <= arr[j]) tmp.push_back(arr[i++]);\n        else tmp.push_back(arr[j++]);\n    }\n    while(i <= m) tmp.push_back(arr[i++]);\n    while(j <= r) tmp.push_back(arr[j++]);\n    for(int k = 0; k < (int)tmp.size(); k++) arr[l + k] = tmp[k];\n}\nint main() {\n    int n; if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for(int i=0; i<n; i++) cin >> a[i];\n    mergeSort(a, 0, n - 1);\n    for(int i=0; i<n; i++) cout << a[i] << (i + 1 < n ? \" \" : \"\");\n    cout << endl;\n    return 0;\n}",
            "python": "import sys\ndef mergesort(arr):\n    if len(arr) <= 1: return arr\n    m = len(arr) // 2\n    left = mergesort(arr[:m])\n    right = mergesort(arr[m:])\n    res = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]: res.append(left[i]); i += 1\n        else: res.append(right[j]); j += 1\n    res.extend(left[i:]); res.extend(right[j:])\n    return res\ndef main():\n    nums = list(map(int, sys.stdin.read().split()))\n    if not nums: return\n    n = nums[0]\n    sorted_arr = mergesort(nums[1:n+1])\n    print(\" \".join(map(str, sorted_arr)))\nif __name__ == \"__main__\":\n    main()",
            "java": "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        Arrays.sort(a);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) sb.append(a[i]).append(i + 1 < n ? \" \" : \"\");\n        System.out.println(sb.toString());\n    }\n}",
            "c": "#include <stdio.h>\n#include <stdlib.h>\nint cmp(const void* a, const void* b) { return (*(int*)a - *(int*)b); }\nint main() {\n    int n; if (scanf(\"%d\", &n) != 1) return 0;\n    int a[1000];\n    for(int i=0; i<n; i++) scanf(\"%d\", &a[i]);\n    qsort(a, n, sizeof(int), cmp);\n    for(int i=0; i<n; i++) printf(\"%d%s\", a[i], i+1<n?\" \":\"\");\n    printf(\"\\n\");\n    return 0;\n}"
        }'::jsonb,
        3.00, 5.00, 2.00
    )
    ON CONFLICT (subject_id, practical_number) DO UPDATE SET
        title = EXCLUDED.title, aim = EXCLUDED.aim, theory_content = EXCLUDED.theory_content, starter_codes = EXCLUDED.starter_codes
    RETURNING id INTO v_p10;

    -- --------------------------------------------------------------------------
    -- 4. INSERT TEST CASES FOR ALL 10 PRACTICALS
    -- --------------------------------------------------------------------------
    -- P1 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p1, E'5\n10 20 30 40 50', '10 20 30 40 50', true),
        (v_p1, E'1\n99', '99', true),
        (v_p1, E'4\n5 1 8 3', '5 1 8 3', false),
        (v_p1, E'3\n-1 -2 -3', '-1 -2 -3', false)
    ON CONFLICT DO NOTHING;

    -- P2 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p2, '({[]})', 'VALID', true),
        (v_p2, '([)]', 'INVALID', true),
        (v_p2, '(((', 'INVALID', false),
        (v_p2, '{[]}', 'VALID', false)
    ON CONFLICT DO NOTHING;

    -- P3 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p3, E'4\nENQUEUE 10\nENQUEUE 20\nDEQUEUE\nENQUEUE 30', '20 30', true),
        (v_p3, E'2\nENQUEUE 5\nDEQUEUE', '', true),
        (v_p3, E'3\nENQUEUE 1\nENQUEUE 2\nENQUEUE 3', '1 2 3', false)
    ON CONFLICT DO NOTHING;

    -- P4 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p4, E'4\n10 5 20 15', '5 10 15 20', true),
        (v_p4, E'1\n42', '42', true),
        (v_p4, E'5\n30 20 40 10 25', '10 20 25 30 40', false)
    ON CONFLICT DO NOTHING;

    -- P5 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p5, E'3\n10 20 30', '10 20 30', true),
        (v_p5, E'4\n10 20 30 40', '10 20 30 40', true),
        (v_p5, E'5\n50 40 30 20 10', '10 20 30 40 50', false)
    ON CONFLICT DO NOTHING;

    -- P6 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p6, E'4 4\n0 1\n0 2\n1 2\n2 3', '0 1 2 3', true),
        (v_p6, E'3 2\n0 1\n1 2', '0 1 2', true),
        (v_p6, E'3 3\n0 1\n1 2\n2 0', '0 1 2', false)
    ON CONFLICT DO NOTHING;

    -- P7 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p7, E'4 4 0\n0 1 1\n1 2 2\n0 2 4\n2 3 1', '0 1 3 4', true),
        (v_p7, E'3 2 0\n0 1 5\n1 2 3', '0 5 8', true),
        (v_p7, E'3 1 0\n0 1 2', '0 2 -1', false)
    ON CONFLICT DO NOTHING;

    -- P8 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p8, E'4 5\n0 1 10\n0 2 6\n0 3 5\n1 3 15\n2 3 4', '19', true),
        (v_p8, E'3 3\n0 1 1\n1 2 2\n0 2 3', '3', true),
        (v_p8, E'2 1\n0 1 7', '7', false)
    ON CONFLICT DO NOTHING;

    -- P9 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p9, E'5 3\n10 15 20', '10 15 20 -1 -1', true),
        (v_p9, E'3 2\n1 4', '-1 1 4', true),
        (v_p9, E'4 2\n4 8', '4 8 -1 -1', false)
    ON CONFLICT DO NOTHING;

    -- P10 Test Cases
    INSERT INTO public.test_cases (practical_id, input_data, expected_output, is_sample) VALUES
        (v_p10, E'5\n5 2 9 1 5', '1 2 5 5 9', true),
        (v_p10, E'3\n3 2 1', '1 2 3', true),
        (v_p10, E'4\n10 -2 0 5', '-2 0 5 10', false)
    ON CONFLICT DO NOTHING;

    -- --------------------------------------------------------------------------
    -- 5. SEED INITIAL SUBMISSION & EVALUATION FOR STUDENT001
    -- --------------------------------------------------------------------------
    -- Insert a completed submission for Practical 1 so student & faculty see live progress immediately
    DECLARE
        v_sub_rec_id UUID;
    BEGIN
        INSERT INTO public.submissions (
            student_id, practical_id, language_id, source_code,
            total_test_cases, passed_test_cases, time_spent_seconds, attempt_count, status
        ) VALUES (
            'a6264b6f-1567-488d-aa70-82a25c66abaa',
            v_p1,
            54,
            '#include <iostream>\nusing namespace std;\nint main() { cout << \"10 20 30 40 50\" << endl; return 0; }',
            4, 4, 320, 1, 'completed'
        )
        RETURNING id INTO v_sub_rec_id;

        -- Insert evaluation for this submission
        IF v_sub_rec_id IS NOT NULL THEN
            INSERT INTO public.evaluations (
                submission_id, marks_performing, marks_writing, marks_viva,
                graded_by, faculty_feedback
            ) VALUES (
                v_sub_rec_id,
                3.00, 4.50, 2.00,
                '267914ae-fc60-4a1a-b900-364e6e0fae24',
                'Excellent singly linked list pointer manipulation and clean clean modular code.'
            ) ON CONFLICT (submission_id) DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Submission seed skipped or already present: %', SQLERRM;
    END;

END $$;

-- ------------------------------------------------------------------------------
-- 6. RELOAD POSTGREST SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
