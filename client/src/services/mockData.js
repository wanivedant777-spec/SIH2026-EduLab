/* EduLab Nova - Rich Seed Practicals, Submissions, and Curricular Data */

export const PRACTICALS_CATALOG = [
  {
    id: 'prac_dsa_04_bst',
    title: 'Practical 04: Implementation of Binary Search Tree & Traversal',
    courseCode: 'CS204P: Data Structures Lab',
    category: 'Non-Linear Trees',
    nepLevel: 'Level 5 (Trees & BST Invariants)',
    avgTime: '30 Mins',
    difficulty: 'Medium',
    aim: 'To implement a Binary Search Tree (BST) in C++/Python, perform node insertion maintaining BST invariant (Left < Root ≤ Right), and verify sorted output via Inorder Traversal.',
    algorithm: [
      {
        title: 'Define Node Structure',
        detail: 'Create a Node structure containing an integer data field and two pointers: left and right referencing child subtrees.',
      },
      {
        title: 'BST Insertion Logic',
        detail: 'If current root is NULL, create and return a new node. If target value is strictly less than root data, recurse left; otherwise, recurse right.',
      },
      {
        title: 'Inorder Traversal Algorithm',
        detail: 'Traverse left subtree recursively, visit and print current node value, then traverse right subtree. In a valid BST, this yields strictly ascending order.',
      },
      {
        title: 'Output Formatting',
        detail: 'Print all traversed node keys space-separated on standard output followed by a trailing newline.',
      },
    ],
    pseudocode: `function INSERT(root, value):
    if root is NULL then:
        return create_new_node(value)
    if value < root.data then:
        root.left = INSERT(root.left, value)
    else:
        root.right = INSERT(root.right, value)
    return root

function INORDER(root):
    if root is not NULL then:
        INORDER(root.left)
        OUTPUT root.data
        INORDER(root.right)`,
    starterCodes: {
      cpp: `// Problem: Practical 04 - Binary Search Tree Insertion & Inorder Traversal
// Language: C++20 (Judge0 ID: 54)

#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* left;
    Node* right;
    Node(int val) : data(val), left(nullptr), right(nullptr) {}
};

// Insert a value into BST
Node* insert(Node* root, int val) {
    if (root == nullptr) {
        return new Node(val);
    }
    if (val < root->data) {
        root->left = insert(root->left, val);
    } else {
        root->right = insert(root->right, val);
    }
    return root;
}

// Inorder traversal: Left -> Root -> Right
void inorder(Node* root, bool &first) {
    if (root == nullptr) return;
    inorder(root->left, first);
    if (!first) cout << " ";
    cout << root->data;
    first = false;
    inorder(root->right, first);
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;

    Node* root = nullptr;
    for (int i = 0; i < n; i++) {
        int val;
        cin >> val;
        root = insert(root, val);
    }

    bool first = true;
    inorder(root, first);
    cout << endl;

    return 0;
}
`,
      c: `// Problem: Practical 04 - Binary Search Tree
// Language: C (Judge0 ID: 50)

#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* left;
    struct Node* right;
};

struct Node* createNode(int val) {
    struct Node* newNode = (struct Node*)malloc(sizeof(struct Node));
    newNode->data = val;
    newNode->left = NULL;
    newNode->right = NULL;
    return newNode;
}

struct Node* insert(struct Node* root, int val) {
    if (root == NULL) return createNode(val);
    if (val < root->data)
        root->left = insert(root->left, val);
    else
        root->right = insert(root->right, val);
    return root;
}

void inorder(struct Node* root, int* first) {
    if (root == NULL) return;
    inorder(root->left, first);
    if (!(*first)) printf(" ");
    printf("%d", root->data);
    *first = 0;
    inorder(root->right, first);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    struct Node* root = NULL;
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        root = insert(root, val);
    }

    int first = 1;
    inorder(root, &first);
    printf("\\n");
    return 0;
}
`,
      python: `# Problem: Practical 04 - Binary Search Tree
# Language: Python 3.12 (Judge0 ID: 71)

import sys

class Node:
    def __init__(self, data):
        self.data = data
        self.left = None
        self.right = None

def insert(root, val):
    if root is None:
        return Node(val)
    if val < root.data:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def inorder(root, result):
    if root:
        inorder(root.left, result)
        result.append(str(root.data))
        inorder(root.right, result)

def main():
    lines = sys.stdin.read().strip().split()
    if not lines:
        return
    n = int(lines[0])
    values = [int(x) for x in lines[1:n+1]]
    
    root = None
    for v in values:
        root = insert(root, v)
        
    result = []
    inorder(root, result)
    print(" ".join(result))

if __name__ == '__main__':
    main()
`,
      java: `// Problem: Practical 04 - Binary Search Tree
// Language: Java 21 (Judge0 ID: 62)

import java.util.*;

class Node {
    int data;
    Node left, right;
    Node(int val) {
        data = val;
        left = right = null;
    }
}

public class Main {
    public static Node insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.data) root.left = insert(root.left, val);
        else root.right = insert(root.right, val);
        return root;
    }

    public static void inorder(Node root, List<String> result) {
        if (root == null) return;
        inorder(root.left, result);
        result.add(String.valueOf(root.data));
        inorder(root.right, result);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        Node root = null;
        for (int i = 0; i < n; i++) {
            root = insert(root, sc.nextInt());
        }
        List<String> res = new ArrayList<>();
        inorder(root, res);
        System.out.println(String.join(" ", res));
    }
}
`,
    },
    testCases: [
      { input_data: '4\n10 5 20 15', expected_output: '5 10 15 20', is_sample: true },
      { input_data: '5\n30 20 40 10 25', expected_output: '10 20 25 30 40', is_sample: false },
      { input_data: '1\n42', expected_output: '42', is_sample: false },
    ],
    vivaPrompts: [
      {
        q: 'Time Complexity of BST Insertion',
        a: 'Average case O(log N) for balanced trees; worst case degrades to O(N) when elements are inserted in already sorted order, forming a skewed linked list.',
      },
      {
        q: 'Inorder Traversal Ascending Order Property',
        a: 'Because BST invariant dictates left < root <= right, an in-order visit (L-Root-R) naturally visits all smaller values prior to root, and larger values afterwards.',
      },
    ],
  },
  {
    id: 'prac_dsa_05_avl',
    title: 'Practical 05: Balanced AVL Trees & Rotations',
    courseCode: 'CS204P: Data Structures Lab',
    category: 'Balanced Trees',
    nepLevel: 'Level 5 (Self-Balancing Trees)',
    avgTime: '45 Mins',
    difficulty: 'Hard',
    aim: 'Implement AVL Tree self-balancing with LL, RR, LR, and RL rotations to maintain height balance factor strictly in {-1, 0, 1}.',
    algorithm: [
      {
        title: 'Height & Balance Calculation',
        detail: 'Track node heights and compute balance factor: height(left) - height(right).',
      },
      {
        title: 'Detect Unbalance',
        detail: 'Identify 4 rotation cases: Left-Left, Right-Right, Left-Right, and Right-Left.',
      },
      {
        title: 'Apply Rotations',
        detail: 'Perform single or double rotations to restore O(log N) tree height guarantee.',
      },
    ],
    pseudocode: `function RIGHT_ROTATE(y):
    x = y.left
    T2 = x.right
    x.right = y
    y.left = T2
    update_height(y)
    update_height(x)
    return x`,
    starterCodes: {
      cpp: `// Problem: Practical 05 - AVL Tree Balancing
// Language: C++20 (Judge0 ID: 54)

#include <iostream>
#include <algorithm>
using namespace std;

struct Node {
    int key, height;
    Node *left, *right;
    Node(int k) : key(k), height(1), left(nullptr), right(nullptr) {}
};

int getHeight(Node* n) { return n ? n->height : 0; }
int getBalance(Node* n) { return n ? getHeight(n->left) - getHeight(n->right) : 0; }

Node* rightRotate(Node* y) {
    Node* x = y->left;
    Node* T2 = x->right;
    x->right = y;
    y->left = T2;
    y->height = max(getHeight(y->left), getHeight(y->right)) + 1;
    x->height = max(getHeight(x->left), getHeight(x->right)) + 1;
    return x;
}

Node* leftRotate(Node* x) {
    Node* y = x->right;
    Node* T2 = y->left;
    y->left = x;
    x->right = T2;
    x->height = max(getHeight(x->left), getHeight(x->right)) + 1;
    y->height = max(getHeight(y->left), getHeight(y->right)) + 1;
    return y;
}

Node* insert(Node* node, int key) {
    if (!node) return new Node(key);
    if (key < node->key) node->left = insert(node->left, key);
    else if (key > node->key) node->right = insert(node->right, key);
    else return node;

    node->height = 1 + max(getHeight(node->left), getHeight(node->right));
    int balance = getBalance(node);

    if (balance > 1 && key < node->left->key) return rightRotate(node);
    if (balance < -1 && key > node->right->key) return leftRotate(node);
    if (balance > 1 && key > node->left->key) {
        node->left = leftRotate(node->left);
        return rightRotate(node);
    }
    if (balance < -1 && key < node->right->key) {
        node->right = rightRotate(node->right);
        return leftRotate(node);
    }
    return node;
}

void preOrder(Node* root, bool &first) {
    if (!root) return;
    if (!first) cout << " ";
    cout << root->key;
    first = false;
    preOrder(root->left, first);
    preOrder(root->right, first);
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    Node* root = nullptr;
    for (int i = 0; i < n; i++) {
        int v; cin >> v;
        root = insert(root, v);
    }
    bool first = true;
    preOrder(root, first);
    cout << endl;
    return 0;
}
`,
      python: `# Problem: Practical 05 - AVL Tree Balancing
# Language: Python 3.12 (Judge0 ID: 71)

import sys

class Node:
    def __init__(self, key):
        self.key = key
        self.height = 1
        self.left = None
        self.right = None

def get_height(n):
    return n.height if n else 0

def get_balance(n):
    return get_height(n.left) - get_height(n.right) if n else 0

def right_rotate(y):
    x = y.left
    T2 = x.right
    x.right = y
    y.left = T2
    y.height = max(get_height(y.left), get_height(y.right)) + 1
    x.height = max(get_height(x.left), get_height(x.right)) + 1
    return x

def left_rotate(x):
    y = x.right
    T2 = y.left
    y.left = x
    x.right = T2
    x.height = max(get_height(x.left), get_height(x.right)) + 1
    y.height = max(get_height(y.left), get_height(y.right)) + 1
    return y

def insert(node, key):
    if not node:
        return Node(key)
    if key < node.key:
        node.left = insert(node.left, key)
    elif key > node.key:
        node.right = insert(node.right, key)
    else:
        return node

    node.height = 1 + max(get_height(node.left), get_height(node.right))
    balance = get_balance(node)

    if balance > 1 and key < node.left.key:
        return right_rotate(node)
    if balance < -1 and key > node.right.key:
        return left_rotate(node)
    if balance > 1 and key > node.left.key:
        node.left = left_rotate(node.left)
        return right_rotate(node)
    if balance < -1 and key < node.right.key:
        node.right = right_rotate(node.right)
        return left_rotate(node)
    return node

def pre_order(root, res):
    if root:
        res.append(str(root.key))
        pre_order(root.left, res)
        pre_order(root.right, res)

def main():
    tokens = sys.stdin.read().strip().split()
    if not tokens: return
    n = int(tokens[0])
    vals = [int(x) for x in tokens[1:n+1]]
    root = None
    for v in vals:
        root = insert(root, v)
    res = []
    pre_order(root, res)
    print(" ".join(res))

if __name__ == '__main__':
    main()
`,
    },
    testCases: [
      { input_data: '6\n10 20 30 40 50 25', expected_output: '30 20 10 25 40 50', is_sample: true },
      { input_data: '3\n1 2 3', expected_output: '2 1 3', is_sample: false },
    ],
    vivaPrompts: [
      {
        q: 'Why AVL over standard BST?',
        a: 'Guarantees strictly O(log N) lookup, insertion, and deletion by rebalancing after every change.',
      },
    ],
  },
  {
    id: 'prac_dsa_06_dijkstra',
    title: 'Practical 06: Dijkstra Shortest Path Algorithm',
    courseCode: 'CS204P: Data Structures Lab',
    category: 'Graph Algorithms',
    nepLevel: 'Level 5 (Greedy & Graph Traversal)',
    avgTime: '40 Mins',
    difficulty: 'Medium',
    aim: 'Compute single-source shortest path weights on a weighted directed graph using priority queue min-heaps.',
    algorithm: [
      { title: 'Distance Array Init', detail: 'Set distance to source as 0, all others as infinity.' },
      { title: 'Min-Heap Extraction', detail: 'Extract vertex u with minimal tentative distance.' },
      { title: 'Edge Relaxation', detail: 'If dist[u] + weight(u,v) < dist[v], update dist[v] and push to heap.' },
    ],
    pseudocode: `function DIJKSTRA(Graph, source):
    dist[source] = 0
    PQ.push({0, source})
    while PQ is not empty:
        {d, u} = PQ.pop()
        for each neighbor v of u:
            if dist[u] + weight < dist[v]:
                dist[v] = dist[u] + weight
                PQ.push({dist[v], v})`,
    starterCodes: {
      cpp: `// Problem: Practical 06 - Dijkstra Shortest Path
// Language: C++20 (Judge0 ID: 54)

#include <iostream>
#include <vector>
#include <queue>
using namespace std;

const int INF = 1e9;

int main() {
    int V, E;
    if (!(cin >> V >> E)) return 0;

    vector<vector<pair<int, int>>> adj(V);
    for (int i = 0; i < E; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }

    int src;
    cin >> src;

    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    vector<int> dist(V, INF);

    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();

        if (d > dist[u]) continue;

        for (auto &edge : adj[u]) {
            int v = edge.first;
            int weight = edge.second;
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                pq.push({dist[v], v});
            }
        }
    }

    for (int i = 0; i < V; i++) {
        if (i > 0) cout << " ";
        cout << (dist[i] == INF ? -1 : dist[i]);
    }
    cout << endl;
    return 0;
}
`,
      python: `# Problem: Practical 06 - Dijkstra Shortest Path
# Language: Python 3.12 (Judge0 ID: 71)

import sys, heapq

def main():
    tokens = sys.stdin.read().strip().split()
    if not tokens: return
    V = int(tokens[0])
    E = int(tokens[1])
    idx = 2
    adj = [[] for _ in range(V)]
    for _ in range(E):
        u = int(tokens[idx])
        v = int(tokens[idx+1])
        w = int(tokens[idx+2])
        adj[u].append((v, w))
        idx += 3
    src = int(tokens[idx])

    INF = float('inf')
    dist = [INF] * V
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

    res = [str(d) if d != INF else "-1" for d in dist]
    print(" ".join(res))

if __name__ == '__main__':
    main()
`,
    },
    testCases: [
      { input_data: '4 4\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n0', expected_output: '0 3 1 4', is_sample: true },
      { input_data: '3 2\n0 1 5\n1 2 3\n0', expected_output: '0 5 8', is_sample: false },
    ],
    vivaPrompts: [
      {
        q: 'Why does Dijkstra fail with negative edge cycles?',
        a: 'Dijkstra greedily assumes once a vertex distance is finalized from the priority queue, no shorter path can exist; negative cycles violate this invariant.',
      },
    ],
  },
];

/* Sample Faculty Batch Roster & Submissions */
/* Sample Faculty Batch Roster & Submissions */
export const SAMPLE_SUBMISSIONS = [
  {
    id: 'sub_001',
    prn: 'PRN2026CS014',
    studentId: 'std_2026_014',
    studentName: 'Aarav Sharma',
    rollNumber: '22CS014',
    practicalId: 'prac_dsa_04_bst',
    practicalTitle: 'Practical 04: BST & Traversal',
    language: 'cpp',
    languageName: 'C++20',
    codingMarks: 5.0,
    writeupMarks: 2.8,
    vivaMarks: 2.0,
    totalMarks: 9.8,
    passRate: 100,
    passedCount: 3,
    totalCount: 3,
    adaptiveTier: 'Advanced',
    timeSpentMin: 18,
    focusBlurEvents: 0,
    status: 'Graded',
    submittedAt: '10 Mins ago',
    feedback: 'Excellent recursive clean code. Solid grasp of BST invariant.',
    sourceCode: `// Aarav Sharma BST Implementation
#include <iostream>
using namespace std;
struct Node { int data; Node *left, *right; Node(int v): data(v), left(nullptr), right(nullptr) {} };
...`,
  },
  {
    id: 'sub_002',
    prn: 'PRN2026CS022',
    studentId: 'std_2026_022',
    studentName: 'Priya Iyer',
    rollNumber: '22CS022',
    practicalId: 'prac_dsa_04_bst',
    practicalTitle: 'Practical 04: BST & Traversal',
    language: 'python',
    languageName: 'Python 3.12',
    codingMarks: 5.0,
    writeupMarks: 0,
    vivaMarks: 0,
    totalMarks: 5.0,
    passRate: 100,
    passedCount: 3,
    totalCount: 3,
    adaptiveTier: 'Proficient',
    timeSpentMin: 24,
    focusBlurEvents: 1,
    status: 'Pending Review',
    feedback: '',
    sourceCode: `# Priya Iyer Python BST
class Node: ...`,
  },
  {
    id: 'sub_003',
    prn: 'PRN2026CS039',
    studentId: 'std_2026_039',
    studentName: 'Rohan Deshmukh',
    rollNumber: '22CS039',
    practicalId: 'prac_dsa_04_bst',
    practicalTitle: 'Practical 04: BST & Traversal',
    language: 'java',
    languageName: 'Java 21',
    codingMarks: 3.3,
    writeupMarks: 0,
    vivaMarks: 0,
    totalMarks: 3.3,
    passRate: 66,
    passedCount: 2,
    totalCount: 3,
    adaptiveTier: 'Beginner',
    timeSpentMin: 38,
    focusBlurEvents: 3,
    status: 'Pending Review',
    feedback: '',
    sourceCode: `// Rohan Java BST
public class Main { ... }`,
  },
  {
    id: 'sub_004',
    prn: 'PRN2026CS045',
    studentId: 'std_2026_045',
    studentName: 'Ananya Gupta',
    rollNumber: '22CS045',
    practicalId: 'prac_dsa_05_avl',
    practicalTitle: 'Practical 05: AVL Balancing',
    language: 'cpp',
    languageName: 'C++20',
    codingMarks: 5.0,
    writeupMarks: 3.0,
    vivaMarks: 1.8,
    totalMarks: 9.8,
    passRate: 100,
    passedCount: 2,
    totalCount: 2,
    adaptiveTier: 'Advanced',
    timeSpentMin: 29,
    focusBlurEvents: 0,
    status: 'Graded',
    submittedAt: '1 Hour ago',
    feedback: 'Flawless rotation implementations and clear viva answers.',
    sourceCode: `// Ananya AVL Rotations...`,
  },
  {
    id: 'sub_005',
    prn: 'PRN2026CS051',
    studentId: 'std_2026_051',
    studentName: 'Kavya Nair',
    rollNumber: '22CS051',
    practicalId: 'prac_dsa_06_dijkstra',
    practicalTitle: 'Practical 06: Dijkstra Shortest Path',
    language: 'cpp',
    languageName: 'C++20',
    codingMarks: 5.0,
    writeupMarks: 2.5,
    vivaMarks: 1.9,
    totalMarks: 9.4,
    passRate: 100,
    passedCount: 2,
    totalCount: 2,
    adaptiveTier: 'Advanced',
    timeSpentMin: 32,
    focusBlurEvents: 0,
    status: 'Graded',
    submittedAt: '2 Hours ago',
    feedback: 'Correct priority queue usage and min-heap invariant.',
    sourceCode: `// Kavya Dijkstra...`,
  },
  {
    id: 'sub_006',
    prn: 'PRN2026CS008',
    studentId: 'std_2026_008',
    studentName: 'Devendra Patel',
    rollNumber: '22CS008',
    practicalId: 'prac_dsa_04_bst',
    practicalTitle: 'Practical 04: BST & Traversal',
    language: 'python',
    languageName: 'Python 3.12',
    codingMarks: 5.0,
    writeupMarks: 0,
    vivaMarks: 0,
    totalMarks: 5.0,
    passRate: 100,
    passedCount: 3,
    totalCount: 3,
    adaptiveTier: 'Proficient',
    timeSpentMin: 21,
    focusBlurEvents: 4,
    status: 'Pending Review',
    feedback: '',
    sourceCode: `# Devendra Python BST`,
  },
  {
    id: 'sub_007',
    prn: 'PRN2026CS031',
    studentId: 'std_2026_031',
    studentName: 'Siddharth Verma',
    rollNumber: '22CS031',
    practicalId: 'prac_os_02_scheduling',
    practicalTitle: 'Practical 02: CPU Scheduling',
    language: 'c',
    languageName: 'C (GCC 14)',
    codingMarks: 4.8,
    writeupMarks: 2.7,
    vivaMarks: 1.6,
    totalMarks: 9.1,
    passRate: 100,
    passedCount: 2,
    totalCount: 2,
    adaptiveTier: 'Proficient',
    timeSpentMin: 27,
    focusBlurEvents: 0,
    status: 'Graded',
    submittedAt: '3 Hours ago',
    feedback: 'Accurate Gantt chart calculation and waiting time metrics.',
    sourceCode: `// Siddharth Round Robin`,
  },
  {
    id: 'sub_008',
    prn: 'PRN2026CS064',
    studentId: 'std_2026_064',
    studentName: 'Tanvi Kulkarni',
    rollNumber: '22CS064',
    practicalId: 'prac_dsa_04_bst',
    practicalTitle: 'Practical 04: BST & Traversal',
    language: 'cpp',
    languageName: 'C++20',
    codingMarks: 5.0,
    writeupMarks: 0,
    vivaMarks: 0,
    totalMarks: 5.0,
    passRate: 100,
    passedCount: 3,
    totalCount: 3,
    adaptiveTier: 'Advanced',
    timeSpentMin: 16,
    focusBlurEvents: 0,
    status: 'Pending Review',
    feedback: '',
    sourceCode: `// Tanvi BST`,
  },
];

export const BATCH_METRICS = {
  batchName: 'Batch A · 3rd Sem CS204P',
  courseName: 'CS204P: Data Structures & Algorithms Lab',
  academicYear: '2026-27 · Semester III',
  totalStudents: 64,
  enrolledStudents: 64,
  submissionsCount: 58,
  completionRate: 90.6,
  completionRateDisplay: '90.6%',
  averagePerformance: '8.6 / 10.0',
  averageScore: '8.6 / 10',
  pendingEvaluations: 14,
  flaggedSubmissions: 3,
  integrityRating: '98.4%',
  rubricAverages: {
    coding: 4.7,
    writing: 2.4,
    viva: 1.5,
  },
  tierBreakdown: {
    advanced: 42,
    proficient: 45,
    beginner: 13,
  },
};


export const STUDENT_PROFILE = {
  id: 'std_2026_014',
  name: 'Aarav Sharma',
  rollNumber: '22CS014',
  batch: 'Batch A · CS204P Data Structures Lab',
  progressPercent: 75,
  completedCount: 3,
  totalPracticals: 4,
  averageScore: 9.2,
  skillLevel: 'Tier 1: Advanced',
  skillBadge: 'Advanced',
  currentPracticalId: 'prac_dsa_04_bst',
  performance: {
    codingAverage: 4.9,
    writeupAverage: 2.8,
    vivaAverage: 1.9,
    firstPassRate: 96.8,
    avgExecutionMs: 14,
    memoryScore: 94.5,
    focusIntegrity: 100,
  },
  skills: [
    { name: 'Tree & Graph Algorithms', category: 'Data Structures', level: 94, tier: 'Advanced', milestone: 'Mastered AVL & BST Rotations' },
    { name: 'Pointers & Memory Mgmt', category: 'Systems', level: 92, tier: 'Advanced', milestone: 'Zero memory leaks in Valgrind' },
    { name: 'Complexity Analysis (Big-O)', category: 'Theory', level: 89, tier: 'Advanced', milestone: 'O(log N) optimal traversal proofs' },
    { name: 'Greedy & Graph Routing', category: 'Algorithms', level: 85, tier: 'Proficient', milestone: 'Dijkstra priority queue optimization' },
    { name: 'System & Concurrency', category: 'Operating Systems', level: 78, tier: 'Proficient', milestone: 'Round Robin preemptive scheduling' },
  ],
  activities: [
    {
      id: 'act_01',
      title: 'Passed 3/3 Test Cases · Practical 04: BST',
      type: 'test_pass',
      timestamp: 'Just now',
      detail: 'Runtime 18ms · Memory 4.2 MB · 5.0 / 5.0 Coding Marks awarded',
      status: 'success',
    },
    {
      id: 'act_02',
      title: 'Viva Voce Verified · Dr. S. Rao',
      type: 'viva',
      timestamp: '2 hours ago',
      detail: 'Oral defense on Inorder Traversal & BST invariants · 2.0 / 2.0 Marks',
      status: 'verified',
    },
    {
      id: 'act_03',
      title: 'Submitted Practical 03: Queue Implementations',
      type: 'submission',
      timestamp: 'Yesterday',
      detail: 'Total 9.2 / 10.0 M · Graded by Lab Instructor · Feedback: Excellent circular buffer design',
      status: 'graded',
    },
    {
      id: 'act_04',
      title: 'Earned "Tier 1: Advanced Algorithmist" Badge',
      type: 'badge',
      timestamp: '2 days ago',
      detail: 'NEP 2020 Level 5 Skill Criteria Met · 100% hidden test pass rate across 3 practicals',
      status: 'achievement',
    },
    {
      id: 'act_05',
      title: 'Journal Write-up Approved',
      type: 'writeup',
      timestamp: '4 days ago',
      detail: 'Aim, Algorithm, Pseudocode, and Complexity analysis verified · 2.8 / 3.0 M',
      status: 'verified',
    },
  ],
};

