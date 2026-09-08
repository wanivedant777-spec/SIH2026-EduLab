"""
EduLab Parameterized Test Case Generator Module
SIH 2026 - Problem Statement SIH26207

Core anti-cheating mechanism:
Generates deterministic, student-specific hidden test cases per practical.
Each student receives different inputs for the same practical, but the inputs
are reproducible for the same student across repeated attempts.

Key Design Principles:
1. Deterministic Seeding: Derived via SHA-256 hash of student_id + practical_id + test_index.
2. Ground-Truth Solvers: Expected outputs are dynamically computed by reference algorithmic
   implementations (never hardcoded strings).
3. Non-Punitive Philosophy: Focuses on verification and learning integrity; no false ML/AI claims.
4. Privacy: Hidden inputs and expected outputs are not exposed in cleartext to the frontend.
"""

import hashlib
import random
import re
from typing import List, Tuple, Optional, Dict, Any
from pydantic import BaseModel, Field


class ParameterizedTestCase(BaseModel):
    input_data: str = Field(..., description="Standard input passed to program")
    expected_output: str = Field(..., description="Ground-truth expected stdout")
    is_sample: bool = Field(default=False, description="Always False for hidden cases")
    is_parameterized: bool = Field(default=True, description="Identifies as dynamically generated")
    test_case_label: Optional[str] = Field(default=None, description="e.g. Parameterized Hidden Case #1")


def get_deterministic_seed(student_id: str, practical_id: str, case_idx: int = 0) -> int:
    """
    Computes a deterministic 64-bit integer seed from student_id, practical_id, and case index.
    Guarantees:
      - Same student + same practical + same index => identical seed.
      - Different student => different seed.
    """
    token = f"{str(student_id).strip()}::{str(practical_id).strip()}::{case_idx}"
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], byteorder="big")


def resolve_practical_number(practical_id: str, practical_number: Optional[int] = None) -> int:
    """
    Resolves the canonical practical number (1 to 10) from practical_number or practical_id.
    Handles identifiers like 'prac_dsa_01', 'p4', UUIDs with known mapping, or digits.
    Defaults to 1 if no number can be determined.
    """
    if practical_number is not None and 1 <= practical_number <= 10:
        return practical_number

    p_str = str(practical_id).lower().strip()

    # Match patterns like prac_dsa_04, practical_4, p02, etc.
    match = re.search(r"(?:practical|prac|p)[_\-\s]*0*(\d+)", p_str)
    if match:
        num = int(match.group(1))
        if 1 <= num <= 10:
            return num

    # Generic digit match
    digits = re.findall(r"\b(\d{1,2})\b", p_str)
    for d in digits:
        val = int(d)
        if 1 <= val <= 10:
            return val

    # Default fallback
    return 1


# ---------------------------------------------------------------------------
# Canonical Ground-Truth Algorithmic Solvers (CS201P Data Structures)
# ---------------------------------------------------------------------------

def generate_p1_singly_linked_list(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """
    Practical 01: Singly Linked List Traversal
    Input: N on first line, followed by N space-separated integers.
    Output: Space-separated traversal.
    """
    if is_edge_case:
        n = rng.choice([1, 2])
        vals = [rng.randint(-50, 50) for _ in range(n)]
    else:
        n = rng.randint(4, 9)
        vals = [rng.randint(1, 200) for _ in range(n)]

    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = " ".join(map(str, vals))
    return input_data, expected_output


def generate_p2_balanced_parentheses(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """
    Practical 02: Balanced Parentheses Validation
    Input: String of brackets (), {}, [].
    Output: 'VALID' or 'INVALID'.
    """
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
        s = make_balanced(rng.randint(2, 4))
        if not s:
            s = "()"
    else:
        # Corrupt a balanced string or construct mismatched brackets
        base = list(make_balanced(rng.randint(2, 3)) or "()[]")
        if rng.random() > 0.5:
            # Drop a character
            idx = rng.randint(0, len(base) - 1)
            base.pop(idx)
        else:
            # Replace character with opposite or wrong bracket
            idx = rng.randint(0, len(base) - 1)
            base[idx] = rng.choice([")", "}", "]", "(", "{", "["])
        s = "".join(base)
        if not s:
            s = "(["

    expected = "VALID" if is_valid(s) else "INVALID"
    return s, expected


def generate_p3_circular_queue(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """
    Practical 03: Circular Queue
    Input: N operations (ENQUEUE <val> or DEQUEUE).
    Output: Space-separated remaining elements in queue, or empty string.
    """
    queue: List[int] = []
    ops: List[str] = []

    num_ops = rng.randint(3, 5) if is_edge_case else rng.randint(6, 10)
    for _ in range(num_ops):
        # Biased towards enqueue if queue empty
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
    """
    Practical 04: Binary Search Tree Insertion & Inorder Traversal
    Input: N followed by N integers.
    Output: Space-separated inorder traversal (sorted order).
    """
    n = rng.choice([2, 3]) if is_edge_case else rng.randint(5, 8)
    vals = rng.sample(range(-50, 150), n)

    # Inorder traversal of BST with distinct keys is strictly ascending
    sorted_vals = sorted(vals)
    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = " ".join(map(str, sorted_vals))
    return input_data, expected_output


def generate_p5_avl_tree(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """
    Practical 05: AVL Tree (Height-Balanced BST)
    Input: N followed by N distinct keys.
    Output: Space-separated inorder traversal.
    """
    n = rng.choice([2, 3]) if is_edge_case else rng.randint(5, 9)
    # Distinct integers to trigger AVL balance rotations
    vals = rng.sample(range(10, 300), n)
    sorted_vals = sorted(vals)

    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = " ".join(map(str, sorted_vals))
    return input_data, expected_output


def generate_p6_graph_bfs(rng: random.Random, is_edge_case: bool = False) -> Tuple[str, str]:
    """
    Practical 06: Graph Traversal - Breadth First Search (BFS)
    Input: V E, followed by E lines of undirected edges (u v).
    Output: BFS traversal starting at vertex 0 with neighbors processed in ascending order.
    """
    V = rng.choice([3, 4]) if is_edge_case else rng.randint(4, 6)
    # Build a connected spanning tree first, then add extra edges
    edges = set()
    nodes = list(range(V))
    rng.shuffle(nodes)
    connected = [nodes[0]]

    for node in nodes[1:]:
        u = rng.choice(connected)
        v = node
        edge = (min(u, v), max(u, v))
        edges.add(edge)
        connected.append(node)

    # Add a few random edges
    extra = 1 if is_edge_case else rng.randint(1, 3)
    for _ in range(extra):
        u = rng.randint(0, V - 1)
        v = rng.randint(0, V - 1)
        if u != v:
            edges.add((min(u, v), max(u, v)))

    # Ground-truth BFS from 0
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
    """
    Practical 07: Dijkstra Single-Source Shortest Path
    Input: V E src, followed by E lines of u v w.
    Output: Space-separated shortest distances from src to 0..V-1 (-1 if unreachable).
    """
    import heapq

    V = 3 if is_edge_case else rng.randint(4, 5)
    src = 0
    edges: Dict[Tuple[int, int], int] = {}

    # Spanning tree
    for i in range(1, V):
        u = rng.randint(0, i - 1)
        w = rng.randint(1, 10)
        edges[(min(u, i), max(u, i))] = w

    # Additional edges
    extra = 0 if is_edge_case else rng.randint(1, 2)
    for _ in range(extra):
        u = rng.randint(0, V - 1)
        v = rng.randint(0, V - 1)
        if u != v:
            edges[(min(u, v), max(u, v))] = rng.randint(1, 12)

    # Reference Dijkstra
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
    """
    Practical 08: Minimum Spanning Tree (MST)
    Input: V E, followed by E lines of u v w.
    Output: Integer representing total MST weight.
    """
    V = 3 if is_edge_case else rng.randint(4, 5)
    edges: List[Tuple[int, int, int]] = []
    used_pairs = set()

    # Ensure connected graph
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

    # Reference Kruskal's Algorithm
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
    """
    Practical 09: Hash Table with Linear Probing
    Input: size n, followed by n keys.
    Output: Space-separated table array with -1 for unoccupied slots.
    """
    size = rng.choice([4, 5]) if is_edge_case else rng.randint(5, 8)
    n = max(1, size - 2) if is_edge_case else max(1, size - rng.randint(1, 2))
    keys = [rng.randint(1, 99) for _ in range(n)]

    # Ground truth: modulo hashing + linear probing
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
    """
    Practical 10: Sorting Benchmark (Merge/Quick/HeapSort)
    Input: N, followed by N integers (supports negative values and duplicates).
    Output: Space-separated sorted sequence.
    """
    n = rng.choice([2, 3]) if is_edge_case else rng.randint(6, 12)
    vals = [rng.randint(-50, 100) for _ in range(n)]
    sorted_vals = sorted(vals)

    input_data = f"{n}\n{' '.join(map(str, vals))}"
    expected_output = " ".join(map(str, sorted_vals))
    return input_data, expected_output


# Generator dispatch registry
GENERATOR_MAP = {
    1: generate_p1_singly_linked_list,
    2: generate_p2_balanced_parentheses,
    3: generate_p3_circular_queue,
    4: generate_p4_bst_inorder,
    5: generate_p5_avl_tree,
    6: generate_p6_graph_bfs,
    7: generate_p7_dijkstra,
    8: generate_p8_mst_kruskal,
    9: generate_p9_hash_table_linear_probing,
    10: generate_p10_sorting_benchmark,
}


def generate_parameterized_test_cases(
    student_id: str,
    practical_id: str,
    practical_number: Optional[int] = None,
    count: int = 2,
) -> List[ParameterizedTestCase]:
    """
    Generates deterministic hidden parameterized test cases for a given student and practical.
    - Uses SHA-256(student_id + practical_id + case_idx) as seed.
    - Generates 1 nominal case and (count - 1) edge cases.
    - Returns ParameterizedTestCase objects with is_sample=False, is_parameterized=True.
    """
    p_num = resolve_practical_number(practical_id, practical_number)
    generator_func = GENERATOR_MAP.get(p_num, generate_p10_sorting_benchmark)

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
                test_case_label=f"Parameterized Hidden Case #{idx + 1}",
            )
        )

    return results
