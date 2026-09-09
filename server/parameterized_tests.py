"""
EduLab Parameterized Test Case Generator & Canonical Practical Registry
SIH 2026 - Problem Statement SIH26207

Resolves practicals by canonical ID, title, and subject rather than
practical_number alone. Disambiguates duplicate practical numbers safely,
enforces exact pedagogical input/output contracts, and raises explicit
errors for unsupported practicals (fail-fast, no silent fallbacks).
"""

import hashlib
import random
import re
from typing import List, Tuple, Optional, Dict, Any, Callable
from pydantic import BaseModel, Field


class ParameterizedTestCase(BaseModel):
    __test__ = False
    input_data: str = Field(..., description="Standard input passed to program")
    expected_output: str = Field(..., description="Ground-truth expected stdout")
    is_sample: bool = Field(default=False, description="Always False for hidden cases")
    is_parameterized: bool = Field(default=True, description="Identifies as dynamically generated")
    test_case_label: Optional[str] = Field(default=None, description="e.g. Parameterized Hidden Case #1")


class CanonicalPracticalInfo(BaseModel):
    canonical_key: str
    practical_number: int
    title: str
    subject_code: str
    aim: str


class UnsupportedPracticalError(Exception):
    """Raised when an evaluation request specifies an unmapped or unknown practical."""
    def __init__(self, practical_id: str, title: Optional[str] = None, number: Optional[int] = None, subject: Optional[str] = None):
        msg = (
            f"No canonical test generator registered for practical: "
            f"practical_id='{practical_id}', title='{title}', practical_number={number}, subject='{subject}'. "
            f"Please verify the practical catalog configuration."
        )
        super().__init__(msg)
        self.practical_id = practical_id
        self.title = title
        self.number = number
        self.subject = subject


# ===========================================================================
# 1. Canonical Live Practical Catalog (CS201P Data Structures & Algorithms)
# ===========================================================================

CANONICAL_CS201P_CATALOG: Dict[str, CanonicalPracticalInfo] = {
    "cs201p_p01_linked_list": CanonicalPracticalInfo(
        canonical_key="cs201p_p01_linked_list",
        practical_number=1,
        title="Practical 01: Singly Linked List Implementation & Operations",
        subject_code="CS201P",
        aim="Implement a dynamic Singly Linked List supporting head/tail insertion, deletion, and linear traversal.",
    ),
    "cs201p_p01_array_max": CanonicalPracticalInfo(
        canonical_key="cs201p_p01_array_max",
        practical_number=1,
        title="Practical 01: Find the Largest Number in an Array",
        subject_code="CS201P",
        aim="Traverse array maintaining running maximum invariant with O(N) time and O(1) space.",
    ),
    "cs201p_p02_parentheses": CanonicalPracticalInfo(
        canonical_key="cs201p_p02_parentheses",
        practical_number=2,
        title="Practical 02: Stack Implementation & Balanced Parentheses Validation",
        subject_code="CS201P",
        aim="Construct an array-based Stack to validate balanced parentheses strings (), {}, [].",
    ),
    "cs201p_p02_array_stack": CanonicalPracticalInfo(
        canonical_key="cs201p_p02_array_stack",
        practical_number=2,
        title="Practical 02: Implement Stack Using Array",
        subject_code="CS201P",
        aim="Implement basic stack operations PUSH, POP, PEEK with overflow and underflow checks.",
    ),
    "cs201p_p03_circular_queue": CanonicalPracticalInfo(
        canonical_key="cs201p_p03_circular_queue",
        practical_number=3,
        title="Practical 03: Circular Queue & Priority Queue Scheduling",
        subject_code="CS201P",
        aim="Design and implement a Circular Queue using modular arithmetic to prevent false overflow.",
    ),
    "cs201p_p04_bst": CanonicalPracticalInfo(
        canonical_key="cs201p_p04_bst",
        practical_number=4,
        title="Practical 04: Binary Search Tree (BST) Insertion & Inorder Traversal",
        subject_code="CS201P",
        aim="Implement a BST, perform element insertion maintaining BST invariant, and verify sorted output via Inorder Traversal.",
    ),
    "cs201p_p04_search": CanonicalPracticalInfo(
        canonical_key="cs201p_p04_search",
        practical_number=4,
        title="Practical 04: Linear Search and Binary Search",
        subject_code="CS201P",
        aim="Implement Linear Search (unsorted traversal) and Binary Search (sorted divide-and-conquer) and compare their correctness on given arrays.",
    ),
    "cs201p_p05_avl": CanonicalPracticalInfo(
        canonical_key="cs201p_p05_avl",
        practical_number=5,
        title="Practical 05: AVL Tree: Height-Balanced Binary Search Tree",
        subject_code="CS201P",
        aim="Construct an AVL tree supporting LL, RR, LR, and RL rotations to maintain balance factor in [-1, 0, 1].",
    ),
    "cs201p_p06_graph_bfs": CanonicalPracticalInfo(
        canonical_key="cs201p_p06_graph_bfs",
        practical_number=6,
        title="Practical 06: Graph Traversal: Breadth First Search (BFS) & Depth First Search (DFS)",
        subject_code="CS201P",
        aim="Model an undirected graph via adjacency list and execute BFS traversal from vertex 0.",
    ),
    "cs201p_p07_dijkstra": CanonicalPracticalInfo(
        canonical_key="cs201p_p07_dijkstra",
        practical_number=7,
        title="Practical 07: Dijkstra Algorithm: Single-Source Shortest Path",
        subject_code="CS201P",
        aim="Find the shortest distance from source vertex 0 to all other vertices in a non-negative weighted graph.",
    ),
    "cs201p_p08_mst": CanonicalPracticalInfo(
        canonical_key="cs201p_p08_mst",
        practical_number=8,
        title="Practical 08: Minimum Spanning Tree (MST): Kruskal & Prim Algorithms",
        subject_code="CS201P",
        aim="Compute the Minimum Spanning Tree of a connected weighted graph using Kruskal's disjoint set union.",
    ),
    "cs201p_p09_hash_table": CanonicalPracticalInfo(
        canonical_key="cs201p_p09_hash_table",
        practical_number=9,
        title="Practical 09: Hash Table with Open Addressing & Collision Resolution",
        subject_code="CS201P",
        aim="Implement a fixed-size Hash Table with modulo hashing and Linear Probing for collision resolution.",
    ),
    "cs201p_p10_sorting": CanonicalPracticalInfo(
        canonical_key="cs201p_p10_sorting",
        practical_number=10,
        title="Practical 10: Empirical Complexity Analysis: QuickSort vs MergeSort vs HeapSort",
        subject_code="CS201P",
        aim="Implement divide-and-conquer sorting algorithms (QuickSort, MergeSort) and verify sorted output.",
    ),
}


# ===========================================================================
# 2. Canonical Practical Resolver (Multi-Factor Disambiguation)
# ===========================================================================

def resolve_canonical_practical(
    practical_id: str,
    practical_title: Optional[str] = None,
    practical_number: Optional[int] = None,
    subject_code: Optional[str] = None,
) -> CanonicalPracticalInfo:
    """
    Multi-factor practical resolver. Does NOT rely on practical_number alone.
    Disambiguates duplicate numbers using title keywords and canonical IDs.
    Raises UnsupportedPracticalError if the practical is unmapped or unknown.
    """
    raw_id = str(practical_id or "").strip().lower()
    raw_title = str(practical_title or "").strip().lower()
    combined_text = f"{raw_id} {raw_title}"

    # 1. Direct Canonical Key Match
    if raw_id in CANONICAL_CS201P_CATALOG:
        return CANONICAL_CS201P_CATALOG[raw_id]

    # 2. High-Specificity Semantic Keyword Matching
    # Check Array Maximum vs Linked List (Both might have practical_number=1)
    if "largest" in combined_text or "max val" in combined_text or "maximum" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p01_array_max"]

    if "linked list" in combined_text or "singly linked" in combined_text or "node insertion" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p01_linked_list"]

    # Check Array Stack vs Balanced Parentheses (Both might have practical_number=2)
    if "stack using array" in combined_text or "array stack" in combined_text or ("stack" in combined_text and ("push" in combined_text or "pop" in combined_text or "peek" in combined_text)):
        return CANONICAL_CS201P_CATALOG["cs201p_p02_array_stack"]

    if "parenthes" in combined_text or "bracket" in combined_text or "balanced" in combined_text:
        # Distinguish AVL tree ("balanced avl") from balanced parentheses
        if "avl" not in combined_text:
            return CANONICAL_CS201P_CATALOG["cs201p_p02_parentheses"]

    # Queue
    if "queue" in combined_text or "circular queue" in combined_text or "enqueue" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p03_circular_queue"]

    # AVL Tree (must precede generic BST because AVL is a self-balancing binary search tree)
    if "avl" in combined_text or "rotation" in combined_text or "height-balanced" in combined_text or "height balanced" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p05_avl"]

    # Linear Search and/or Binary Search (the ALGORITHM, not the tree)
    # Must precede BST check: "binary search" is a substring of "binary search tree"
    _is_search_algo = (
        "linear search" in combined_text
        or "linear and binary" in combined_text
        or ("binary search" in combined_text and "tree" not in combined_text and "bst" not in combined_text)
    )
    if _is_search_algo:
        return CANONICAL_CS201P_CATALOG["cs201p_p04_search"]

    # BST (Binary Search Tree)
    if "binary search tree" in combined_text or "bst" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p04_bst"]

    # Graph BFS
    if "bfs" in combined_text or "breadth first" in combined_text or "graph traversal" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p06_graph_bfs"]

    # Dijkstra Shortest Path
    if "dijkstra" in combined_text or "shortest path" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p07_dijkstra"]

    # Minimum Spanning Tree
    if "spanning tree" in combined_text or "mst" in combined_text or "kruskal" in combined_text or "prim" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p08_mst"]

    # Hash Table
    if "hash table" in combined_text or "linear probing" in combined_text or "open addressing" in combined_text or "modulo hashing" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p09_hash_table"]

    # Sorting
    if "sort" in combined_text or "quicksort" in combined_text or "mergesort" in combined_text or "heapsort" in combined_text:
        return CANONICAL_CS201P_CATALOG["cs201p_p10_sorting"]

    # 3. Slug-based Resolution (e.g. prac_dsa_04_bst)
    slug_map = {
        "prac_dsa_01": "cs201p_p01_linked_list",
        "prac_dsa_01_linked_list": "cs201p_p01_linked_list",
        "prac_dsa_02": "cs201p_p02_parentheses",
        "prac_dsa_02_parentheses": "cs201p_p02_parentheses",
        "prac_dsa_03": "cs201p_p03_circular_queue",
        "prac_dsa_03_queue": "cs201p_p03_circular_queue",
        "prac_dsa_04": "cs201p_p04_bst",
        "prac_dsa_04_bst": "cs201p_p04_bst",
        "prac_dsa_05": "cs201p_p05_avl",
        "prac_dsa_05_avl": "cs201p_p05_avl",
        "prac_dsa_06": "cs201p_p06_graph_bfs",
        "prac_dsa_06_bfs": "cs201p_p06_graph_bfs",
        "prac_dsa_06_dijkstra": "cs201p_p07_dijkstra",  # legacy mock mapping
        "prac_dsa_07": "cs201p_p07_dijkstra",
        "prac_dsa_07_dijkstra": "cs201p_p07_dijkstra",
        "prac_dsa_08": "cs201p_p08_mst",
        "prac_dsa_08_mst": "cs201p_p08_mst",
        "prac_dsa_09": "cs201p_p09_hash_table",
        "prac_dsa_09_hash_table": "cs201p_p09_hash_table",
        "prac_dsa_10": "cs201p_p10_sorting",
        "prac_dsa_10_sorting": "cs201p_p10_sorting",
    }
    for slug_prefix, c_key in slug_map.items():
        if slug_prefix in raw_id:
            return CANONICAL_CS201P_CATALOG[c_key]

    # 4. Fallback on explicit practical_number ONLY if no conflicting title was provided
    # and the number maps directly to the standard 10 syllabus practicals
    if practical_number is not None and 1 <= practical_number <= 10:
        num_map = {
            1: "cs201p_p01_linked_list",
            2: "cs201p_p02_parentheses",
            3: "cs201p_p03_circular_queue",
            4: "cs201p_p04_bst",
            5: "cs201p_p05_avl",
            6: "cs201p_p06_graph_bfs",
            7: "cs201p_p07_dijkstra",
            8: "cs201p_p08_mst",
            9: "cs201p_p09_hash_table",
            10: "cs201p_p10_sorting",
        }
        return CANONICAL_CS201P_CATALOG[num_map[practical_number]]

    # 5. Fail-Fast: Do NOT silently map an unknown practical to Practical 01 or 10
    raise UnsupportedPracticalError(
        practical_id=practical_id,
        title=practical_title,
        number=practical_number,
        subject=subject_code,
    )


# ===========================================================================
# 3. Ground-Truth Algorithmic Solvers
# ===========================================================================

def get_deterministic_seed(student_id: str, practical_id: str, case_idx: int = 0) -> int:
    """Deterministic 64-bit integer seed via SHA-256."""
    token = f"{str(student_id).strip()}::{str(practical_id).strip()}::{case_idx}"
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], byteorder="big")


def generate_p1_singly_linked_list(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 01: Singly Linked List Traversal"""
    if is_edge_case:
        n = rng.choice([1, 2])
        vals = [rng.randint(-50, 50) for _ in range(n)]
    else:
        n = rng.randint(4, 9)
        vals = [rng.randint(1, 200) for _ in range(n)]
    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = " ".join(map(str, vals))
    return input_data, expected_output


def generate_p1_array_max(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 01 Variant: Find the Largest Number in an Array"""
    if is_edge_case:
        n = 1
        vals = [rng.randint(-100, 100)]
    else:
        n = rng.randint(4, 10)
        vals = [rng.randint(-200, 500) for _ in range(n)]
    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = str(max(vals))
    return input_data, expected_output


def generate_p2_balanced_parentheses(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 02: Balanced Parentheses Validation"""
    pairs = [("(", ")"), ("{", "}"), ("[", "]")]

    def make_balanced(depth: int) -> str:
        if depth <= 0:
            return ""
        o, c = rng.choice(pairs)
        inner = make_balanced(depth - 1) if rng.random() > 0.4 else ""
        sibling = make_balanced(depth - 1) if rng.random() > 0.4 else ""
        return f"{o}{inner}{c}{sibling}"

    def is_valid(s: str) -> bool:
        st = []
        mapping = {")": "(", "}": "{", "]": "["}
        for ch in s:
            if ch in mapping.values():
                st.append(ch)
            elif ch in mapping:
                if not st or st[-1] != mapping[ch]:
                    return False
                st.pop()
        return len(st) == 0

    should_be_valid = rng.choice([True, False])
    if should_be_valid:
        s = make_balanced(rng.randint(2, 4)) or "()"
    else:
        base = list(make_balanced(rng.randint(2, 3)) or "()[]")
        if rng.random() > 0.5:
            base.pop(rng.randint(0, len(base) - 1))
        else:
            base[rng.randint(0, len(base) - 1)] = rng.choice([")", "}", "]", "(", "{", "["])
        s = "".join(base) or "(["

    expected = "VALID" if is_valid(s) else "INVALID"
    return s, expected


def generate_p2_array_stack(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 02 Variant: Implement Stack Using Array (PUSH, POP, PEEK)"""
    num_ops = rng.randint(3, 5) if is_edge_case else rng.randint(6, 10)
    st = []
    ops = []
    outs = []

    for _ in range(num_ops):
        action = rng.choice(["PUSH", "PUSH", "POP", "PEEK"])
        if action == "PUSH":
            val = rng.randint(1, 99)
            st.append(val)
            ops.extend(["PUSH", str(val)])
        elif action == "POP":
            ops.append("POP")
            if not st:
                outs.append("Stack Underflow")
            else:
                outs.append(str(st.pop()))
        elif action == "PEEK":
            ops.append("PEEK")
            if not st:
                outs.append("Stack is Empty")
            else:
                outs.append(str(st[-1]))

    input_data = " ".join(ops)
    expected_output = "\n".join(outs)
    return input_data, expected_output


def generate_p3_circular_queue(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 03: Circular Queue"""
    queue: List[int] = []
    ops: List[str] = []
    num_ops = rng.randint(3, 5) if is_edge_case else rng.randint(6, 10)

    for _ in range(num_ops):
        if not queue or rng.random() > 0.4:
            v = rng.randint(5, 99)
            ops.append(f"ENQUEUE {v}")
            queue.append(v)
        else:
            ops.append("DEQUEUE")
            queue.pop(0)

    input_data = f"{len(ops)}\n" + "\n".join(ops)
    expected_output = " ".join(map(str, queue))
    return input_data, expected_output


def generate_p4_bst_inorder(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 04: Binary Search Tree Insertion & Inorder Traversal"""
    n = rng.choice([2, 3]) if is_edge_case else rng.randint(5, 8)
    vals = rng.sample(range(-50, 150), n)
    sorted_vals = sorted(vals)
    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = " ".join(map(str, sorted_vals))
    return input_data, expected_output


def generate_p4_linear_binary_search(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """
    Practical 04 Variant: Linear Search and Binary Search

    Input contract:
      Line 1: n (array size)
      Line 2: n space-separated integers (the array)
      Line 3: target value to search for

    Output contract:
      Line 1: Linear search result — 0-based index of first occurrence, or -1
      Line 2: Binary search result on the SORTED version of the array — 0-based index, or -1

    The program should:
      1. Perform linear search on the ORIGINAL (unsorted) array.
      2. Sort the array.
      3. Perform binary search on the SORTED array.
    """
    if is_edge_case:
        # Edge cases: single element, duplicates, target at boundaries
        edge_type = rng.choice(["single_found", "single_not_found", "duplicates", "first", "last"])
        if edge_type == "single_found":
            val = rng.randint(-50, 50)
            arr = [val]
            target = val
        elif edge_type == "single_not_found":
            val = rng.randint(-50, 50)
            arr = [val]
            target = val + rng.choice([-1, 1])  # guaranteed different
        elif edge_type == "duplicates":
            base = rng.randint(1, 20)
            n = rng.randint(4, 7)
            arr = [base] * n
            # Insert a few distinct values
            for i in range(min(2, n)):
                arr[rng.randint(0, n - 1)] = rng.randint(1, 50)
            target = rng.choice(arr)  # guaranteed present
        elif edge_type == "first":
            n = rng.randint(4, 7)
            arr = sorted([rng.randint(1, 100) for _ in range(n)])
            target = arr[0]
        else:  # last
            n = rng.randint(4, 7)
            arr = sorted([rng.randint(1, 100) for _ in range(n)])
            target = arr[-1]
    else:
        n = rng.randint(5, 10)
        arr = [rng.randint(-50, 200) for _ in range(n)]
        # 60% chance target is in array, 40% chance it's not
        if rng.random() < 0.6:
            target = rng.choice(arr)
        else:
            target = rng.randint(-100, 300)

    # Ground-truth: Linear search on original array
    linear_result = -1
    for i, v in enumerate(arr):
        if v == target:
            linear_result = i
            break

    # Ground-truth: Binary search on sorted array
    sorted_arr = sorted(arr)
    binary_result = -1
    lo, hi = 0, len(sorted_arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if sorted_arr[mid] == target:
            binary_result = mid
            break
        elif sorted_arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1

    input_data = f"{len(arr)}\n{' '.join(map(str, arr))}\n{target}"
    expected_output = f"{linear_result}\n{binary_result}"
    return input_data, expected_output


def generate_p5_avl_tree(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 05: AVL Tree (Height-Balanced BST)"""
    n = rng.choice([2, 3]) if is_edge_case else rng.randint(5, 9)
    vals = rng.sample(range(10, 300), n)
    sorted_vals = sorted(vals)
    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = " ".join(map(str, sorted_vals))
    return input_data, expected_output


def generate_p6_graph_bfs(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 06: Graph Traversal - Breadth First Search (BFS)"""
    V = rng.choice([3, 4]) if is_edge_case else rng.randint(4, 6)
    edges = set()
    nodes = list(range(V))
    rng.shuffle(nodes)
    connected = [nodes[0]]

    for node in nodes[1:]:
        u = rng.choice(connected)
        v = node
        edges.add((min(u, v), max(u, v)))
        connected.append(node)

    extra = 1 if is_edge_case else rng.randint(1, 3)
    for _ in range(extra):
        u = rng.randint(0, V - 1)
        v = rng.randint(0, V - 1)
        if u != v:
            edges.add((min(u, v), max(u, v)))

    adj: Dict[int, List[int]] = {i: [] for i in range(V)}
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    for i in range(V):
        adj[i].sort()

    bfs_res: List[int] = []
    visited = [False] * V
    q = [0]
    visited[0] = True

    while q:
        curr = q.pop(0)
        bfs_res.append(curr)
        for nxt in adj[curr]:
            if not visited[nxt]:
                visited[nxt] = True
                q.append(nxt)

    lines = [f"{V} {len(edges)}"]
    for u, v in sorted(edges):
        lines.append(f"{u} {v}")

    input_data = "\n".join(lines)
    expected_output = " ".join(map(str, bfs_res))
    return input_data, expected_output


def generate_p7_dijkstra(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 07: Dijkstra Single-Source Shortest Path"""
    import heapq

    V = 3 if is_edge_case else rng.randint(4, 5)
    src = 0
    edges: Dict[Tuple[int, int], int] = {}

    for i in range(1, V):
        u = rng.randint(0, i - 1)
        w = rng.randint(1, 10)
        edges[(min(u, i), max(u, i))] = w

    extra = 0 if is_edge_case else rng.randint(1, 2)
    for _ in range(extra):
        u = rng.randint(0, V - 1)
        v = rng.randint(0, V - 1)
        if u != v:
            edges[(min(u, v), max(u, v))] = rng.randint(1, 12)

    adj: Dict[int, List[Tuple[int, int]]] = {i: [] for i in range(V)}
    for (u, v), w in edges.items():
        adj[u].append((v, w))
        adj[v].append((u, w))

    dist = [float("inf")] * V
    dist[src] = 0
    pq = [(0, src)]

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))

    lines = [f"{V} {len(edges)} {src}"]
    for (u, v), w in sorted(edges.items()):
        lines.append(f"{u} {v} {w}")

    res = [str(int(d)) if d != float("inf") else "-1" for d in dist]
    input_data = "\n".join(lines)
    expected_output = " ".join(res)
    return input_data, expected_output


def generate_p8_mst_kruskal(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 08: Minimum Spanning Tree (MST)"""
    V = 3 if is_edge_case else rng.randint(4, 5)
    edges: List[Tuple[int, int, int]] = []
    used_pairs = set()

    for i in range(1, V):
        u = rng.randint(0, i - 1)
        w = rng.randint(1, 15)
        edges.append((u, i, w))
        used_pairs.add((min(u, i), max(u, i)))

    extra = 1 if is_edge_case else rng.randint(2, 4)
    for _ in range(extra):
        u = rng.randint(0, V - 1)
        v = rng.randint(0, V - 1)
        pair = (min(u, v), max(u, v))
        if u != v and pair not in used_pairs:
            w = rng.randint(2, 25)
            edges.append((u, v, w))
            used_pairs.add(pair)

    parent = list(range(V))

    def find(x: int) -> int:
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    sorted_edges = sorted(edges, key=lambda e: e[2])
    total_weight = 0
    edges_count = 0

    for u, v, w in sorted_edges:
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            total_weight += w
            edges_count += 1
            if edges_count == V - 1:
                break

    lines = [f"{V} {len(edges)}"]
    for u, v, w in edges:
        lines.append(f"{u} {v} {w}")

    input_data = "\n".join(lines)
    expected_output = str(total_weight)
    return input_data, expected_output


def generate_p9_hash_table_linear_probing(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 09: Hash Table with Linear Probing"""
    size = rng.choice([4, 5]) if is_edge_case else rng.randint(5, 8)
    n = max(1, size - 2) if is_edge_case else max(1, size - rng.randint(1, 2))
    keys = [rng.randint(1, 99) for _ in range(n)]

    table = [-1] * size
    for k in keys:
        idx = k % size
        while table[idx] != -1:
            idx = (idx + 1) % size
        table[idx] = k

    input_data = f"{size} {n}\n{' '.join(map(str, keys))}"
    expected_output = " ".join(map(str, table))
    return input_data, expected_output


def generate_p10_sorting_benchmark(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """Practical 10: Sorting Benchmark (Merge/Quick/HeapSort)"""
    n = rng.choice([2, 3]) if is_edge_case else rng.randint(6, 12)
    vals = [rng.randint(-50, 100) for _ in range(n)]
    sorted_vals = sorted(vals)

    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = " ".join(map(str, sorted_vals))
    return input_data, expected_output


# ===========================================================================
# 4. Canonical Generator Registry
# ===========================================================================

CANONICAL_GENERATOR_REGISTRY: Dict[str, Callable[[random.Random, bool], Tuple[str, str]]] = {
    "cs201p_p01_linked_list": generate_p1_singly_linked_list,
    "cs201p_p01_array_max": generate_p1_array_max,
    "cs201p_p02_parentheses": generate_p2_balanced_parentheses,
    "cs201p_p02_array_stack": generate_p2_array_stack,
    "cs201p_p03_circular_queue": generate_p3_circular_queue,
    "cs201p_p04_bst": generate_p4_bst_inorder,
    "cs201p_p04_search": generate_p4_linear_binary_search,
    "cs201p_p05_avl": generate_p5_avl_tree,
    "cs201p_p06_graph_bfs": generate_p6_graph_bfs,
    "cs201p_p07_dijkstra": generate_p7_dijkstra,
    "cs201p_p08_mst": generate_p8_mst_kruskal,
    "cs201p_p09_hash_table": generate_p9_hash_table_linear_probing,
    "cs201p_p10_sorting": generate_p10_sorting_benchmark,
}


def generate_parameterized_test_cases(
    student_id: str,
    practical_id: str,
    practical_title: Optional[str] = None,
    practical_number: Optional[int] = None,
    subject_code: Optional[str] = None,
    count: int = 2,
) -> List[ParameterizedTestCase]:
    """
    Resolves the canonical practical via multi-factor matching (ID + title + number).
    Raises UnsupportedPracticalError if the practical is unmapped or unknown.
    Generates deterministic hidden test cases using SHA-256 seeding.
    """
    practical_info = resolve_canonical_practical(
        practical_id=practical_id,
        practical_title=practical_title,
        practical_number=practical_number,
        subject_code=subject_code,
    )

    generator_func = CANONICAL_GENERATOR_REGISTRY.get(practical_info.canonical_key)
    if not generator_func:
        raise UnsupportedPracticalError(
            practical_id=practical_id,
            title=practical_title,
            number=practical_number,
            subject=subject_code,
        )

    results: List[ParameterizedTestCase] = []

    for idx in range(count):
        seed_val = get_deterministic_seed(student_id, practical_id, idx)
        rng = random.Random(seed_val)
        is_edge = (idx > 0)

        in_data, exp_out = generator_func(rng, is_edge_case=is_edge)

        results.append(
            ParameterizedTestCase(
                input_data=in_data.strip(),
                expected_output=exp_out.strip(),
                is_sample=False,
                is_parameterized=True,
                test_case_label=f"Parameterized Hidden Case #{idx + 1} ({practical_info.title})",
            )
        )

    return results
