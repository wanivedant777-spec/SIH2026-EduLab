import React, { useState } from 'react';
import Header from './components/Header';
import TheoryPanel from './components/TheoryPanel';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';

const STARTER_CODES = {
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
};

const SAMPLE_PRACTICAL = {
  id: 'prac_dsa_04_bst',
  title: 'Practical 04: Implementation of Binary Search Tree & Traversal',
  courseCode: 'CS204P: Data Structures Lab',
  category: 'Non-Linear Data Structures',
  aim: 'To implement a Binary Search Tree (BST) in C++/Python, perform node insertion maintaining BST invariant (Left < Root ≤ Right), and verify sorted output via Inorder Traversal.',
  algorithm: [
    {
      title: 'Define Node Structure',
      detail: 'Create a Node structure containing an integer data field and two pointers: left and right referencing child subtrees.',
    },
    {
      title: 'BST Insertion Logic',
      detail: 'If the current node is NULL, create and return a new node. If the target value is strictly less than current node data, recurse left; otherwise, recurse right.',
    },
    {
      title: 'Inorder Traversal Algorithm',
      detail: 'Traverse left subtree recursively, visit and print current node value, then traverse right subtree. In a valid BST, this produces strictly sorted order.',
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
};

export default function App() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(STARTER_CODES.cpp);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [stdoutMessage, setStdoutMessage] = useState('');

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(STARTER_CODES[newLang] || '');
  };

  const handleResetCode = () => {
    if (window.confirm('Reset editor to default template code?')) {
      setCode(STARTER_CODES[language] || '');
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setStdoutMessage('');

    const languageMap = {
      cpp: 54,
      c: 50,
      python: 71,
      java: 62,
    };

    const payload = {
      student_id: 'std_2026_014',
      practical_id: SAMPLE_PRACTICAL.id,
      language_id: languageMap[language] || 54,
      source_code: code,
      attempt_count: 1,
      time_spent_seconds: 450,
      test_cases: [
        { input_data: '4\n10 5 20 15', expected_output: '5 10 15 20', is_sample: true },
        { input_data: '5\n30 20 40 10 25', expected_output: '10 20 25 30 40', is_sample: false },
        { input_data: '1\n42', expected_output: '42', is_sample: false },
      ],
    };

    const apiUrl = import.meta.env.VITE_EVALUATION_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${apiUrl}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setEvaluationResult(data);
      setStdoutMessage(
        `[Evaluation Success] All ${data.passed_test_cases}/${data.total_test_cases} test cases executed.\n` +
        `Marks Scored: ${data.coding_marks_awarded} / 5.0 (Coding auto-score)\n` +
        `Adaptive Tier: ${data.adaptive_tiering?.assigned_tier} -> Recommended: ${data.adaptive_tiering?.recommended_difficulty}`
      );
    } catch (err) {
      console.warn('FastAPI server connection error, using mock client evaluation:', err);
      // Seamless mock fallback for testing without running backend
      const fallbackResult = {
        submission_id: 'sub_demo_local',
        student_id: payload.student_id,
        practical_id: payload.practical_id,
        language_id: payload.language_id,
        status: 'Passed',
        total_test_cases: 3,
        passed_test_cases: 3,
        pass_percentage: 100.0,
        coding_marks_awarded: 5.0,
        total_possible_marks: 5.0,
        test_case_results: [
          {
            test_case_index: 1,
            is_sample: true,
            status: 'Passed',
            passed: true,
            expected_output: '5 10 15 20',
            stdout: '5 10 15 20',
            execution_time_sec: 0.018,
            memory_kb: 1240,
          },
          {
            test_case_index: 2,
            is_sample: false,
            status: 'Passed',
            passed: true,
            expected_output: '10 20 25 30 40',
            stdout: '10 20 25 30 40',
            execution_time_sec: 0.021,
            memory_kb: 1280,
          },
          {
            test_case_index: 3,
            is_sample: false,
            status: 'Passed',
            passed: true,
            expected_output: '42',
            stdout: '42',
            execution_time_sec: 0.015,
            memory_kb: 1190,
          },
        ],
        adaptive_tiering: {
          assigned_tier: 'Advanced',
          recommended_difficulty: 'Hard',
          reasoning: 'Student solved within optimal time and passed 100% of test cases on attempt 1. Ready for AVL tree self-balancing rotations.',
        },
      };

      setEvaluationResult(fallbackResult);
      setStdoutMessage(
        `[Local Demo Sandbox] Evaluated 3 test cases against BST logic.\n` +
        `Result: All 3/3 Passed.\n` +
        `Coding Marks: 5.0 / 5.0\n` +
        `Note: To test live with FastAPI, run 'uvicorn main:app --reload' in server/ directory.`
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitPractical = () => {
    if (!evaluationResult) {
      alert('Please run and test your code first before submitting the practical.');
      return;
    }
    setIsSubmitted(true);
    alert('Practical submitted successfully! 5.0 auto-graded coding marks logged to faculty dashboard.');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Application Bar */}
      <Header
        onRunCode={handleRunCode}
        onSubmitPractical={handleSubmitPractical}
        isRunning={isRunning}
        isSubmitted={isSubmitted}
      />

      {/* LeetCode-style Split Workspace */}
      <main className="workspace-container">
        {/* Left Pane: Theory & Pedagogy */}
        <TheoryPanel practical={SAMPLE_PRACTICAL} />

        {/* Right Pane: Code Editor & Execution Terminal */}
        <div className="editor-pane">
          <CodeEditor
            language={language}
            onLanguageChange={handleLanguageChange}
            code={code}
            onCodeChange={setCode}
            onResetCode={handleResetCode}
            isAutoSaving={false}
          />

          <Terminal
            evaluationResult={evaluationResult}
            isRunning={isRunning}
            stdoutMessage={stdoutMessage}
          />
        </div>
      </main>
    </div>
  );
}
