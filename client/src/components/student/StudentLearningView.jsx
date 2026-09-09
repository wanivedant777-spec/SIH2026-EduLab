import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Code2,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Hero3DObject from './Hero3DObject';

// Curricular Step-by-Step Visualization Data
const ALGORITHM_VISUALIZATION_STEPS = {
  bst: [
    {
      step: 0,
      activeNodeId: 0,
      visitedNodeIds: [],
      currentNode: '50 (Root)',
      stack: '[50]',
      traversalOrder: '[]',
      stateSummary: 'At Root node 50. Left subtree is non-empty; recurse left.',
      explanation: 'Begin inorder traversal at Root node 50. Push 50 onto the call stack and descend into left child 25.'
    },
    {
      step: 1,
      activeNodeId: 1,
      visitedNodeIds: [],
      currentNode: '25',
      stack: '[50, 25]',
      traversalOrder: '[]',
      stateSummary: 'At Node 25 (25 < 50). Recurse to left child 12.',
      explanation: 'Examine node 25. Satisfies BST invariant (Left < Root). Push 25 onto the call stack and recurse left.'
    },
    {
      step: 2,
      activeNodeId: 3,
      visitedNodeIds: [3],
      currentNode: '12 (Leaf)',
      stack: '[50, 25]',
      traversalOrder: '[12]',
      stateSummary: 'Reached leftmost leaf 12. Left is null; visit 12.',
      explanation: 'Node 12 has no left child. Emit 12 to output. Right child is null; pop from stack and backtrack.'
    },
    {
      step: 3,
      activeNodeId: 1,
      visitedNodeIds: [3, 1],
      currentNode: '25',
      stack: '[50]',
      traversalOrder: '[12, 25]',
      stateSummary: 'Backtrack to 25. Visit 25, then explore right child 35.',
      explanation: 'Left subtree of 25 is fully explored. Visit node 25, emit to output, and explore right child 35.'
    },
    {
      step: 4,
      activeNodeId: 4,
      visitedNodeIds: [3, 1, 4],
      currentNode: '35 (Leaf)',
      stack: '[50]',
      traversalOrder: '[12, 25, 35]',
      stateSummary: 'Visit right leaf 35 (25 < 35 < 50). Backtrack to root.',
      explanation: 'Node 35 has no children. Visit 35, emit to output. Both subtrees of 25 are complete; pop and return to root 50.'
    },
    {
      step: 5,
      activeNodeId: 0,
      visitedNodeIds: [3, 1, 4, 0],
      currentNode: '50 (Root)',
      stack: '[]',
      traversalOrder: '[12, 25, 35, 50]',
      stateSummary: 'Left subtree complete. Visit root 50, descend to right child 75.',
      explanation: 'Entire left subtree of root is complete. Visit Root node 50, emit to output, then begin traversal of right subtree at node 75.'
    },
    {
      step: 6,
      activeNodeId: 2,
      visitedNodeIds: [3, 1, 4, 0, 5, 2, 6],
      currentNode: '90 (Final Leaf)',
      stack: '[]',
      traversalOrder: '[12, 25, 35, 50, 60, 75, 90]',
      stateSummary: 'Traversal complete! Result is strictly ascending.',
      explanation: 'Visit 60, 75, and 90 in order. Traversal finished! Output is sorted in strictly ascending order: [12, 25, 35, 50, 60, 75, 90].'
    }
  ],
  dijkstra: [
    {
      step: 0,
      activeNodeId: 0,
      visitedNodeIds: [],
      currentNode: 'S (Source, d=0)',
      stack: 'PQ: {(0, S)}',
      traversalOrder: '[]',
      stateSummary: 'Initialize distances: dist[S]=0, dist[others]=∞.',
      explanation: 'Initialize single-source shortest path distances. Insert source S into priority queue with distance 0.'
    },
    {
      step: 1,
      activeNodeId: 2,
      visitedNodeIds: [0],
      currentNode: 'Relax (S, B) & (S, A)',
      stack: 'PQ: {(2, B), (4, A)}',
      traversalOrder: '[S]',
      stateSummary: 'Relax edge (S, B) with weight 2, and (S, A) with weight 4.',
      explanation: 'Extract min node S. Relax neighbor B to dist=2 and neighbor A to dist=4. Mark S as visited.'
    },
    {
      step: 2,
      activeNodeId: 2,
      visitedNodeIds: [0, 2],
      currentNode: 'B (d=2)',
      stack: 'PQ: {(3, A), (10, D)}',
      traversalOrder: '[S, B]',
      stateSummary: 'Extract min B. Edge (B, A) relaxes A: 2+1=3 < 4!',
      explanation: 'Extract minimum distance node B (d=2). Check edge (B, A) with weight 1. New path to A is 2+1=3, which improves over 4! Decrease-key A to 3.'
    },
    {
      step: 3,
      activeNodeId: 1,
      visitedNodeIds: [0, 2, 1],
      currentNode: 'A (d=3)',
      stack: 'PQ: {(8, C), (10, D)}',
      traversalOrder: '[S, B, A]',
      stateSummary: 'Extract A (d=3). Relax edge (A, C) to dist 3+5=8.',
      explanation: 'Extract node A (d=3). Relax neighbor C via edge weight 5: dist[C] = 3+5 = 8. Push C to priority queue.'
    },
    {
      step: 4,
      activeNodeId: 4,
      visitedNodeIds: [0, 2, 1, 4],
      currentNode: 'D (d=5 via B)',
      stack: 'PQ: {(8, C), (8, T)}',
      traversalOrder: '[S, B, A, D]',
      stateSummary: 'Extract D. Edge (D, T) with weight 3 yields dist[T]=8.',
      explanation: 'Extract node D. Relax edge (D, T) to target: dist[T] = 5 + 3 = 8. Target reached with optimal candidate cost!'
    },
    {
      step: 5,
      activeNodeId: 5,
      visitedNodeIds: [0, 2, 1, 4, 3, 5],
      currentNode: 'T (Target, d=8)',
      stack: 'PQ: {}',
      traversalOrder: '[S, B, A, D, C, T]',
      stateSummary: 'Optimal shortest path verified: S → B → D → T (Cost: 8).',
      explanation: 'Extract target T with distance 8. Shortest path tree is settled. Optimal routing: S → B → D → T with total weight 8.'
    }
  ],
  avl: [
    {
      step: 0,
      activeNodeId: 0,
      visitedNodeIds: [0],
      currentNode: '30 [BF: 0]',
      stack: 'Root: 30',
      traversalOrder: '[30]',
      stateSummary: 'Insert 30 as root. Height: 1, Balance Factor: 0.',
      explanation: 'Insert 30 into empty tree. Node becomes root with height 1 and balance factor BF(30) = 0 (Balanced).'
    },
    {
      step: 1,
      activeNodeId: 1,
      visitedNodeIds: [0, 1],
      currentNode: '20 [BF: +1]',
      stack: 'Path: 30 → 20',
      traversalOrder: '[20, 30]',
      stateSummary: 'Insert 20 < 30. BF(30) becomes +1.',
      explanation: 'Insert 20 to the left of 30. Height of left subtree increases. BF(30) = height(L) - height(R) = 1 - 0 = +1 (Within bounds [-1, 1]).'
    },
    {
      step: 2,
      activeNodeId: 3,
      visitedNodeIds: [0, 1, 3],
      currentNode: '10 [BF: +2 at 30]',
      stack: 'Path: 30 → 20 → 10',
      traversalOrder: '[10, 20, 30]',
      stateSummary: 'Insert 10 < 20. Left-Left heavy imbalance detected at 30!',
      explanation: 'Insert 10 to left of 20. Now height(L)=2 at node 30. BF(30) = 2 - 0 = +2. An imbalance violates AVL invariant! LL case detected.'
    },
    {
      step: 3,
      activeNodeId: 1,
      visitedNodeIds: [1, 3, 0],
      currentNode: 'Right Rotate(30)',
      stack: 'New Root: 20',
      traversalOrder: '[10, 20, 30]',
      stateSummary: 'Perform Right Rotation on 30. Node 20 becomes new root.',
      explanation: 'Execute single Right Rotation at 30: Node 20 pivots upwards to become new root; node 30 becomes right child of 20.'
    },
    {
      step: 4,
      activeNodeId: 1,
      visitedNodeIds: [1, 3, 0],
      currentNode: '20 (Balanced)',
      stack: 'Tree Balanced',
      traversalOrder: '[10, 20, 30]',
      stateSummary: 'Balanced AVL Tree restored. All BF = 0.',
      explanation: 'Tree height is minimized. BF(20) = 0, BF(10) = 0, BF(30) = 0. Maximum search complexity guaranteed O(log N).'
    }
  ]
};

export default function StudentLearningView({
  practical,
  practicals = [],
  submissions = [],
  onSelectPractical,
  onGoToWorkspace,
  selectedSubject,
}) {
  // Selected practical fallback
  const [selectedId, setSelectedId] = useState(practical?.id || practicals[0]?.id || null);

  const activePractical = useMemo(() => {
    if (practical) return practical;
    if (selectedId) {
      const found = practicals.find((p) => p.id === selectedId);
      if (found) return found;
    }
    return practicals[0] || null;
  }, [practical, selectedId, practicals]);

  // Pseudocode copied state
  const [copied, setCopied] = useState(false);

  // Visualization Stepping Controls State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackTimerRef = useRef(null);

  // Practice check accordion state
  const [revealedAnswers, setRevealedAnswers] = useState({});

  // Determine visualization steps array for this practical
  const activeSteps = useMemo(() => {
    if (!activePractical) return [];
    const pracId = (activePractical.id || '').toLowerCase();
    const title = (activePractical.title || '').toLowerCase();

    if (pracId.includes('dijkstra') || title.includes('dijkstra') || title.includes('shortest path')) {
      return ALGORITHM_VISUALIZATION_STEPS.dijkstra;
    }
    if (pracId.includes('avl') || title.includes('avl') || title.includes('balanced tree')) {
      return ALGORITHM_VISUALIZATION_STEPS.avl;
    }
    // Default to BST steps or dynamically construct from algorithm steps
    if (activePractical.algorithm && activePractical.algorithm.length > 0) {
      if (pracId.includes('bst') || title.includes('binary search tree')) {
        return ALGORITHM_VISUALIZATION_STEPS.bst;
      }
      return activePractical.algorithm.map((step, idx) => ({
        step: idx,
        activeNodeId: idx,
        visitedNodeIds: Array.from({ length: idx }, (_, i) => i),
        currentNode: `Node P${idx + 1}`,
        stack: `Step ${idx + 1} / ${activePractical.algorithm.length}`,
        traversalOrder: `Invariants verified`,
        stateSummary: step.title || `Algorithm Step ${idx + 1}`,
        explanation: step.detail || `Execute algorithmic step ${idx + 1}.`,
      }));
    }
    return ALGORITHM_VISUALIZATION_STEPS.bst;
  }, [activePractical]);

  // Reset stepping when practical changes (React recommended pattern for state adjustment from prop)
  const [prevPracticalId, setPrevPracticalId] = useState(activePractical?.id);
  if (activePractical?.id !== prevPracticalId) {
    setPrevPracticalId(activePractical?.id);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }

  // Playback timer effect
  useEffect(() => {
    if (isPlaying && activeSteps.length > 1) {
      playbackTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= activeSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, Math.max(800, 2400 / playbackSpeed));
    } else {
      clearInterval(playbackTimerRef.current);
    }
    return () => clearInterval(playbackTimerRef.current);
  }, [isPlaying, activeSteps.length, playbackSpeed]);

  const currentStepData = activeSteps[currentStepIndex] || activeSteps[0] || {
    step: 0,
    currentNode: 'Root',
    stack: '[]',
    traversalOrder: '[]',
    stateSummary: 'Ready to trace invariants',
    explanation: 'Step through the visualization controls above to observe state transitions.',
  };

  const handleCopyPseudocode = () => {
    if (!activePractical?.pseudocode) return;
    navigator.clipboard.writeText(activePractical.pseudocode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAnswerReveal = (idx) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Real progress determination from submissions
  const practicalSubmission = useMemo(() => {
    if (!activePractical || submissions.length === 0) return null;
    return submissions.find((s) => s.practicalId === activePractical.id) || null;
  }, [activePractical, submissions]);

  const progressStatus = useMemo(() => {
    if (!practicalSubmission) return { label: 'Not Started', variant: 'neutral' };
    if (practicalSubmission.passedCount === practicalSubmission.totalCount || parseFloat(practicalSubmission.codingMarks) >= 2.8) {
      return { label: 'Mastered', variant: 'success' };
    }
    if (practicalSubmission.status === 'evaluated' || practicalSubmission.codingMarks) {
      return { label: 'Evaluated', variant: 'info' };
    }
    return { label: 'Submitted', variant: 'warning' };
  }, [practicalSubmission]);

  // Extract structured learning metadata from practical
  const practicalNumber = activePractical?.practicalNumber || 1;
  const practicalTitle = activePractical?.title || 'Practical Laboratory Exercise';
  const topicName = activePractical?.category || activePractical?.topic || selectedSubject?.name || 'Data Structures & Algorithms';
  const difficulty = activePractical?.difficulty || 'Medium';
  const estimatedTime = activePractical?.avgTime || '30 Mins';
  const aimText = activePractical?.aim || 'Implement the algorithmic procedure satisfying time and space bounds.';

  // Curricular Objectives derived from practical
  const objectives = useMemo(() => {
    return [
      `Analyze the fundamental structural invariant and pointer mechanics of ${topicName}.`,
      'Implement memory-efficient recursive and iterative operations conforming to curriculum standards.',
      'Validate time and space complexity bounds under automated compiler test suites.',
      'Prepare for viva examination by articulating invariant proofs and trade-offs.',
    ];
  }, [topicName]);

  // Prerequisites
  const prerequisites = useMemo(() => {
    return [
      'Basic programming syntax (C++20 / Python 3 / Java)',
      'Memory management & pointers / reference mechanics',
      'Asymptotic Big-O notation & recursion fundamentals',
    ];
  }, []);

  // Complexities
  const complexities = useMemo(() => {
    const isTree = topicName.toLowerCase().includes('tree') || topicName.toLowerCase().includes('bst');
    const isGraph = topicName.toLowerCase().includes('graph') || topicName.toLowerCase().includes('dijkstra');

    if (isGraph) {
      return {
        bestTime: 'O(V + E)',
        avgTime: 'O((V + E) log V)',
        worstTime: 'O(V²)',
        space: 'O(V + E) Adjacency Heap',
      };
    }
    if (isTree) {
      return {
        bestTime: 'O(1) Root Lookup',
        avgTime: 'O(log N) Balanced',
        worstTime: 'O(N) Skewed Case',
        space: 'O(H) Call Stack Depth',
      };
    }
    return {
      bestTime: 'O(1)',
      avgTime: 'O(N)',
      worstTime: 'O(N)',
      space: 'O(1) Auxiliary Memory',
    };
  }, [topicName]);

  // Key terminology
  const terminology = useMemo(() => {
    const isTree = topicName.toLowerCase().includes('tree') || topicName.toLowerCase().includes('bst');
    const isGraph = topicName.toLowerCase().includes('graph') || topicName.toLowerCase().includes('dijkstra');

    if (isGraph) {
      return ['Vertex (V)', 'Edge (E)', 'Weight Function', 'Priority Queue', 'Relaxation Invariant', 'Greedy Choice'];
    }
    if (isTree) {
      return ['Root Node', 'Subtree', 'Leaf Node', 'BST Invariant (L < Root ≤ R)', 'Inorder Traversal', 'Tree Height'];
    }
    return ['Head Pointer', 'Node Structure', 'Next Pointer', 'Traversal Invariant', 'Memory Allocation', 'NULL Sentinel'];
  }, [topicName]);

  // Worked example data (real sample test case)
  const sampleTestCase = useMemo(() => {
    if (activePractical?.testCases && activePractical.testCases.length > 0) {
      return activePractical.testCases[0];
    }
    return {
      input_data: '5\n30 20 40 10 25',
      expected_output: '10 20 25 30 40',
    };
  }, [activePractical]);

  // Viva prompts for Practice Check
  const practicePrompts = useMemo(() => {
    if (activePractical?.vivaPrompts && activePractical.vivaPrompts.length > 0) {
      return activePractical.vivaPrompts;
    }
    return [
      {
        q: 'What is the primary invariant maintained by this data structure?',
        a: 'The invariant ensures that all elements in the left subtree remain strictly less than the node key, while right subtree elements are greater than or equal, guaranteeing deterministic O(log N) lookup in balanced states.',
      },
      {
        q: 'Under what conditions does performance degrade to worst-case O(N)?',
        a: 'When elements are inserted in monotonically increasing or decreasing order, the structure degrades into a single linked chain, making the height H = N and search linear.',
      },
    ];
  }, [activePractical]);

  return (
    <div className="learning-view-page" id="student-learning-root">
      {/* Top Header */}
      <PageHeader
        title="Practical Learning Experience"
        subtitle="Structured laboratory pedagogical track: Learn theory, trace 3D spatial invariants, test concepts, and implement in Code Lab."
        badge={
          <Badge variant="primary" size="sm">
            AICTE / NEP 2020 Framework
          </Badge>
        }
        actions={
          activePractical && onGoToWorkspace ? (
            <Button
              variant="primary"
              size="md"
              icon={Code2}
              iconRight={ArrowRight}
              onClick={() => onGoToWorkspace(activePractical)}
            >
              Open in Code Lab
            </Button>
          ) : null
        }
      />

      <div className="learning-view-content">
        {/* Progression Flow Tracker: LEARN -> VISUALIZE -> PRACTICE -> CODE */}
        <div className="learning-progression-rail" aria-label="Curriculum Progress Steps">
          <div className="progression-step-item step-active">
            <span className="progression-step-pill">1</span>
            <span>LEARN CONCEPT</span>
          </div>
          <span className="progression-arrow">→</span>
          <div className="progression-step-item step-active">
            <span className="progression-step-pill">2</span>
            <span>VISUALIZE STEPPING</span>
          </div>
          <span className="progression-arrow">→</span>
          <div className="progression-step-item step-active">
            <span className="progression-step-pill">3</span>
            <span>PRACTICE CHECK</span>
          </div>
          <span className="progression-arrow">→</span>
          <div className="progression-step-item step-active">
            <span className="progression-step-pill">4</span>
            <span>CODE LAB</span>
          </div>
        </div>

        {/* Practical Switcher Bar (if multiple practicals are allocated) */}
        {practicals.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
              Curriculum Experiment:
            </span>
            {practicals.map((p) => {
              const isSelected = p.id === activePractical?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(p.id);
                    if (onSelectPractical) onSelectPractical(p);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '1px solid var(--primary-border, #93C5FD)' : '1px solid var(--border-subtle, #E7E5DD)',
                    background: isSelected ? 'rgba(29, 78, 216, 0.08)' : '#FFFFFF',
                    color: isSelected ? 'var(--primary, #1D4ED8)' : 'var(--text-secondary, #57534E)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  P{String(p.practicalNumber || 1).padStart(2, '0')}: {p.title?.split(':')[0] || p.title}
                </button>
              );
            })}
          </div>
        )}

        {/* =========================================================
            1. PRACTICAL HEADER
            ========================================================= */}
        <section aria-label="Practical Overview Header">
          <Card surface="white" className="practical-header-card">
            <div className="practical-header-top">
              <div className="practical-header-details">
                <div className="practical-header-title-row">
                  <span className="practical-header-num-tag font-mono">
                    PRAC-{String(practicalNumber).padStart(2, '0')}
                  </span>
                  <Badge variant={progressStatus.variant} size="sm">
                    {progressStatus.label}
                  </Badge>
                  <Badge
                    variant={
                      difficulty.toLowerCase() === 'hard'
                        ? 'danger'
                        : difficulty.toLowerCase() === 'easy'
                        ? 'neutral'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {difficulty}
                  </Badge>
                </div>
                <h1 className="practical-header-title">{practicalTitle}</h1>
                <div className="practical-header-meta-row">
                  <span className="practical-header-meta-item">
                    <Layers size={13} color="var(--primary)" />
                    <strong>Topic:</strong> {topicName}
                  </span>
                  <span>•</span>
                  <span className="practical-header-meta-item">
                    <Clock size={13} color="var(--text-muted)" />
                    <strong>Est. Time:</strong> {estimatedTime}
                  </span>
                  <span>•</span>
                  <span className="practical-header-meta-item">
                    <Award size={13} color="var(--primary)" />
                    <strong>Rubric:</strong> 3M Code (Auto) + 5M Writeup + 2M Viva
                  </span>
                </div>
              </div>

              {onGoToWorkspace && (
                <Button
                  variant="primary"
                  size="lg"
                  icon={Code2}
                  iconRight={ArrowRight}
                  onClick={() => onGoToWorkspace(activePractical)}
                >
                  Open in Code Lab
                </Button>
              )}
            </div>
          </Card>
        </section>

        {/* =========================================================
            2. LEARNING OVERVIEW
            ========================================================= */}
        <section aria-label="Learning Overview">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <BookOpen size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Learning Overview &amp; Curriculum Objectives</h2>
            </div>
          </div>

          <div className="overview-card-grid">
            <Card surface="white" className="overview-card-col">
              <span className="overview-col-label">Laboratory Aim</span>
              <p className="overview-aim-text">{aimText}</p>
            </Card>

            <Card surface="white" className="overview-card-col">
              <span className="overview-col-label">Core Objectives</span>
              <ul className="overview-bullet-list">
                {objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </Card>

            <Card surface="white" className="overview-card-col">
              <span className="overview-col-label">Prerequisites</span>
              <ul className="overview-bullet-list">
                {prerequisites.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* =========================================================
            3. CONCEPT
            ========================================================= */}
        <section aria-label="Concept & Theoretical Invariants">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <Zap size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Concept &amp; Asymptotic Complexity</h2>
            </div>
          </div>

          <div className="concept-content-grid">
            <Card surface="white" className="concept-theory-card">
              <span className="overview-col-label">Theoretical Specification</span>
              <p className="concept-theory-p">
                This laboratory exercise focuses on maintaining deterministic structural invariants during dynamic memory updates. Every operation guarantees correct pointer manipulation without dangling references, memory leaks, or invariant violations.
              </p>

              <span className="overview-col-label" style={{ marginTop: '6px' }}>Key Technical Terminology</span>
              <div className="terminology-chip-wrap">
                {terminology.map((term, i) => (
                  <span key={i} className="terminology-chip font-mono">
                    {term}
                  </span>
                ))}
              </div>
            </Card>

            <Card surface="white" className="concept-complexity-card">
              <span className="overview-col-label">Asymptotic Complexity Bounds</span>
              <div className="complexity-metric-row">
                <span className="complexity-metric-name">Best Case Time:</span>
                <span className="complexity-metric-val font-mono">{complexities.bestTime}</span>
              </div>
              <div className="complexity-metric-row">
                <span className="complexity-metric-name">Average Case Time:</span>
                <span className="complexity-metric-val font-mono">{complexities.avgTime}</span>
              </div>
              <div className="complexity-metric-row">
                <span className="complexity-metric-name">Worst Case Time:</span>
                <span className="complexity-metric-val font-mono">{complexities.worstTime}</span>
              </div>
              <div className="complexity-metric-row">
                <span className="complexity-metric-name">Auxiliary Space:</span>
                <span className="complexity-metric-val font-mono">{complexities.space}</span>
              </div>
            </Card>
          </div>
        </section>

        {/* =========================================================
            4. ALGORITHM
            ========================================================= */}
        <section aria-label="Algorithm & Pseudocode">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <CheckCircle2 size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Algorithm Procedure &amp; Pseudocode</h2>
            </div>
          </div>

          <div className="algorithm-content-grid">
            <Card surface="white" className="algorithm-steps-card">
              <span className="overview-col-label">Numbered Procedural Steps</span>
              <div className="algo-step-list">
                {(activePractical?.algorithm && activePractical.algorithm.length > 0
                  ? activePractical.algorithm
                  : [
                      { title: 'Initialize Data Structure', detail: 'Allocate memory and initialize pointer references to sentinel / null states.' },
                      { title: 'Evaluate Input Arguments', detail: 'Verify input bounds and maintain structural invariants before insertion/traversal.' },
                      { title: 'Execute Core Traversal', detail: 'Traverse structure respecting deterministic ordering constraints.' },
                      { title: 'Emit Verified Output', detail: 'Format standard output matching test suite specifications.' },
                    ]
                ).map((step, idx) => (
                  <div key={idx} className="algo-step-item">
                    <div className="algo-step-num font-mono">{idx + 1}</div>
                    <div className="algo-step-body">
                      <h3 className="algo-step-title">{step.title}</h3>
                      <p className="algo-step-detail">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card surface="white" className="pseudocode-card">
              <div className="pseudocode-head-bar">
                <span className="overview-col-label">Algorithmic Pseudocode</span>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={copied ? Check : Copy}
                  onClick={handleCopyPseudocode}
                >
                  {copied ? 'Copied' : 'Copy Code'}
                </Button>
              </div>
              <pre className="pseudocode-pre">
                {activePractical?.pseudocode ||
`function EXECUTE_ALGORITHM(root, input):
    if root is NULL then:
        return CREATE_NODE(input)
    if input < root.value then:
        root.left = EXECUTE_ALGORITHM(root.left, input)
    else:
        root.right = EXECUTE_ALGORITHM(root.right, input)
    return root`}
              </pre>
            </Card>
          </div>
        </section>

        {/* =========================================================
            5. INTERACTIVE VISUALIZATION (VISUAL CENTERPIECE)
            ========================================================= */}
        <section aria-label="Interactive Visualizer">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <Sparkles size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Interactive 3D Algorithm Simulation (Visual Centerpiece)</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Drag to orbit in 3D • Use playback controls to step through invariants
            </span>
          </div>

          <Card surface="white" className="visualization-centerpiece-card">
            {/* Playback Controls Toolbar */}
            <div className="vis-toolbar-bar">
              <div className="vis-controls-cluster">
                <Button
                  variant={isPlaying ? 'primary' : 'secondary'}
                  size="sm"
                  icon={isPlaying ? Pause : Play}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? 'Pause' : 'Play Trace'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={currentStepIndex === 0}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
                  }}
                  title="Previous Step"
                >
                  Prev
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  iconRight={ChevronRight}
                  disabled={currentStepIndex >= activeSteps.length - 1}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex((prev) => Math.min(activeSteps.length - 1, prev + 1));
                  }}
                  title="Next Step"
                >
                  Next
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(0);
                  }}
                  title="Reset to Step 0"
                >
                  Reset
                </Button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="vis-step-display-pill font-mono">
                  Step {currentStepIndex + 1} of {activeSteps.length}
                </span>

                {/* Speed Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {[0.5, 1, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      style={{
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-xs)',
                        border: playbackSpeed === spd ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: playbackSpeed === spd ? 'rgba(29, 78, 216, 0.1)' : 'var(--bg-canvas)',
                        color: playbackSpeed === spd ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3D WebGL Canvas */}
            <div className="vis-canvas-container">
              <Hero3DObject
                practical={activePractical}
                controlledStep={currentStepIndex}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                activeNodeId={currentStepData.activeNodeId}
                visitedNodeIds={currentStepData.visitedNodeIds || []}
                hideOverlays={true}
              />
            </div>

            {/* Synchronized State Readout & Step Explanation */}
            <div className="vis-state-and-explanation">
              <div className="vis-state-readout-col font-mono">
                <span className="overview-col-label">Active State Machine</span>
                <div className="vis-state-row">
                  <span className="vis-state-key">Current Node:</span>
                  <span className="vis-state-val">{currentStepData.currentNode}</span>
                </div>
                <div className="vis-state-row">
                  <span className="vis-state-key">Call Stack / PQ:</span>
                  <span className="vis-state-val">{currentStepData.stack}</span>
                </div>
                <div className="vis-state-row">
                  <span className="vis-state-key">Traversal Output:</span>
                  <span className="vis-state-val">{currentStepData.traversalOrder}</span>
                </div>
                <div className="vis-state-row">
                  <span className="vis-state-key">Invariant Status:</span>
                  <span className="vis-state-val" style={{ color: '#16A34A' }}>Verified Valid</span>
                </div>
              </div>

              <div className="vis-explanation-col">
                <span className="overview-col-label">Step Execution Narrative</span>
                <p className="vis-explanation-text">
                  <strong>{currentStepData.stateSummary}:</strong> {currentStepData.explanation}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* =========================================================
            6. WORKED EXAMPLE
            ========================================================= */}
        <section aria-label="Worked Example">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <Code2 size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Worked Example: Input → Process → Output</h2>
            </div>
          </div>

          <Card surface="white" className="worked-example-card">
            <div className="worked-example-grid">
              <div className="worked-box">
                <span className="worked-box-label">Standard Input (STDIN)</span>
                <pre className="worked-box-content">{sampleTestCase.input_data}</pre>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Array / node sequence to process
                </span>
              </div>

              <div className="worked-box" style={{ background: '#FFFFFF' }}>
                <span className="worked-box-label">Algorithmic Process Walkthrough</span>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  1. Parse elements sequentially from standard input.<br />
                  2. For each element, traverse pointer hierarchy and link into position maintaining invariant ordering.<br />
                  3. Perform required traversal (Inorder / Relaxation) collecting visited node keys.<br />
                  4. Verify that the output meets format requirements with single trailing newline.
                </p>
              </div>

              <div className="worked-box">
                <span className="worked-box-label">Verified Output (STDOUT)</span>
                <pre className="worked-box-content" style={{ color: 'var(--primary)' }}>
                  {sampleTestCase.expected_output}
                </pre>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Evaluated with automated test harness
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* =========================================================
            7. PRACTICE CHECK
            ========================================================= */}
        <section aria-label="Practice Check">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <HelpCircle size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Practice Check &amp; Viva Prompts (2 Marks)</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Test your conceptual understanding before opening Code Lab
            </span>
          </div>

          <Card surface="white" className="practice-check-card">
            {practicePrompts.map((prompt, idx) => {
              const isRevealed = Boolean(revealedAnswers[idx]);
              return (
                <div key={idx} className="practice-check-item">
                  <h3 className="practice-check-q">
                    Q{idx + 1}: {prompt.q}
                  </h3>
                  <button
                    type="button"
                    className="practice-check-toggle-btn"
                    onClick={() => toggleAnswerReveal(idx)}
                  >
                    {isRevealed ? (
                      <>
                        <ChevronUp size={14} />
                        <span>Hide Model Answer</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        <span>Show Model Answer / Invariant Explanation</span>
                      </>
                    )}
                  </button>
                  {isRevealed && (
                    <div className="practice-answer-box">
                      <strong>Model Answer: </strong>{prompt.a}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </section>

        {/* =========================================================
            8. START CODING CTA (STRONGEST ACTION)
            ========================================================= */}
        <section aria-label="Start Coding in Workspace">
          <div className="start-coding-surface">
            <div className="start-coding-text-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="practical-header-num-tag font-mono">STEP 4: IMPLEMENT</span>
                <Badge variant="primary" size="sm">Code Lab Ready</Badge>
              </div>
              <h2 className="start-coding-title">Ready to Write &amp; Test Your Code?</h2>
              <p className="start-coding-desc">
                Starter templates, compilation toolchains (C++20, Python 3, Java), and automated Judge0 test harnesses are pre-loaded in your Code Lab environment.
              </p>
            </div>

            {onGoToWorkspace && (
              <Button
                variant="primary"
                size="lg"
                icon={Code2}
                iconRight={ArrowRight}
                onClick={() => onGoToWorkspace(activePractical)}
              >
                Open in Code Lab
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
