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
  ExternalLink,
  Maximize2,
  X,
  Video,
  GitBranch,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Hero3DObject from './Hero3DObject';

// Curricular Fallback Step-by-Step Visualization Data (Only for legacy fallback)
const FALLBACK_VISUALIZATION_STEPS = {
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

// Safe helper to extract embeddable YouTube URL
function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }
  return null;
}

// Format key helper (e.g. 'linear_search' -> 'Linear Search')
function formatLabel(key) {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  // Raw Database Content Extraction (Source of Truth)
  const theoryContent = useMemo(() => {
    return activePractical?.theory_content || activePractical?.theoryContent || {};
  }, [activePractical]);

  // Algorithm data handling: can be array of strings, object of arrays, or array of step objects
  const rawAlgorithm = useMemo(() => {
    return theoryContent?.algorithm !== undefined
      ? theoryContent.algorithm
      : (activePractical?.algorithm || null);
  }, [theoryContent, activePractical]);

  const algorithmVariants = useMemo(() => {
    if (!rawAlgorithm) return {};
    if (Array.isArray(rawAlgorithm)) {
      return { 'Algorithm Procedure': rawAlgorithm };
    }
    if (typeof rawAlgorithm === 'object') {
      return rawAlgorithm;
    }
    return {};
  }, [rawAlgorithm]);

  const algorithmKeys = useMemo(() => Object.keys(algorithmVariants), [algorithmVariants]);
  const [selectedAlgoKey, setSelectedAlgoKey] = useState(algorithmKeys[0] || null);

  useEffect(() => {
    setSelectedAlgoKey(algorithmKeys[0] || null);
  }, [algorithmKeys]);

  const currentAlgoSteps = useMemo(() => {
    if (!algorithmKeys.length) return [];
    const key = selectedAlgoKey && algorithmVariants[selectedAlgoKey] ? selectedAlgoKey : algorithmKeys[0];
    const steps = algorithmVariants[key] || [];
    return Array.isArray(steps) ? steps : [];
  }, [algorithmVariants, algorithmKeys, selectedAlgoKey]);

  // Pseudocode data handling: can be string or object of variants
  const rawPseudocode = useMemo(() => {
    return theoryContent?.pseudocode !== undefined
      ? theoryContent.pseudocode
      : (activePractical?.pseudocode || '');
  }, [theoryContent, activePractical]);

  const pseudocodeVariants = useMemo(() => {
    if (!rawPseudocode) return {};
    if (typeof rawPseudocode === 'string') {
      return { 'Canonical Pseudocode': rawPseudocode };
    }
    if (typeof rawPseudocode === 'object') {
      return rawPseudocode;
    }
    return {};
  }, [rawPseudocode]);

  const pseudocodeKeys = useMemo(() => Object.keys(pseudocodeVariants), [pseudocodeVariants]);
  const [selectedPseudoKey, setSelectedPseudoKey] = useState(pseudocodeKeys[0] || null);

  useEffect(() => {
    setSelectedPseudoKey(pseudocodeKeys[0] || null);
  }, [pseudocodeKeys]);

  const currentPseudocodeText = useMemo(() => {
    if (!pseudocodeKeys.length) return '';
    const key = selectedPseudoKey && pseudocodeVariants[selectedPseudoKey] ? selectedPseudoKey : pseudocodeKeys[0];
    const val = pseudocodeVariants[key];
    return typeof val === 'string' ? val : JSON.stringify(val, null, 2);
  }, [pseudocodeVariants, pseudocodeKeys, selectedPseudoKey]);

  // Pseudocode copied state
  const [copied, setCopied] = useState(false);

  // Flowchart URL & state
  const flowchartUrl = activePractical?.flowchartUrl || activePractical?.flowchart_url || theoryContent?.flowchart_url || null;
  const [flowchartLoading, setFlowchartLoading] = useState(true);
  const [flowchartError, setFlowchartError] = useState(false);
  const [isFlowchartModalOpen, setIsFlowchartModalOpen] = useState(false);

  // Video URL
  const videoUrl = activePractical?.videoUrl || activePractical?.video_url || theoryContent?.video_url || null;
  const youtubeEmbedUrl = useMemo(() => getYouTubeEmbedUrl(videoUrl), [videoUrl]);

  // Visualization Stepping Controls State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackTimerRef = useRef(null);

  // Practice check accordion state
  const [revealedAnswers, setRevealedAnswers] = useState({});

  // Reset stepping and media states when practical changes
  const [prevPracticalId, setPrevPracticalId] = useState(activePractical?.id);
  if (activePractical?.id !== prevPracticalId) {
    setPrevPracticalId(activePractical?.id);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setFlowchartLoading(true);
    setFlowchartError(false);
  }

  // Derive data-driven visualization steps from the current practical's real algorithm
  const activeSteps = useMemo(() => {
    if (!activePractical) return [];

    // If practical provides real algorithm steps in database, use them directly!
    if (currentAlgoSteps && currentAlgoSteps.length > 0) {
      return currentAlgoSteps.map((stepItem, idx) => {
        const isString = typeof stepItem === 'string';
        const title = isString ? stepItem : (stepItem.title || `Step ${idx + 1}`);
        const detail = isString ? stepItem : (stepItem.detail || stepItem.title || '');

        return {
          step: idx,
          activeNodeId: idx,
          visitedNodeIds: Array.from({ length: idx }, (_, i) => i),
          currentNode: `Step ${idx + 1}`,
          stack: `State Machine [${idx + 1} / ${currentAlgoSteps.length}]`,
          traversalOrder: `Invariants active`,
          stateSummary: title,
          explanation: detail,
        };
      });
    }

    // Fallback only if practical has NO database algorithm at all
    const pracId = (activePractical.id || '').toLowerCase();
    const title = (activePractical.title || '').toLowerCase();
    if (pracId.includes('dijkstra') || title.includes('dijkstra') || title.includes('shortest path')) {
      return FALLBACK_VISUALIZATION_STEPS.dijkstra;
    }
    if (pracId.includes('avl') || title.includes('avl') || title.includes('balanced tree')) {
      return FALLBACK_VISUALIZATION_STEPS.avl;
    }
    return FALLBACK_VISUALIZATION_STEPS.bst;
  }, [activePractical, currentAlgoSteps]);

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
    currentNode: 'Active',
    stack: '[]',
    traversalOrder: '[]',
    stateSummary: 'Ready to trace procedure',
    explanation: 'Step through controls to inspect state transitions.',
  };

  const handleCopyPseudocode = () => {
    if (!currentPseudocodeText) return;
    navigator.clipboard.writeText(currentPseudocodeText);
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

  // Structured learning metadata extracted directly from database record
  const practicalNumber = activePractical?.practicalNumber || 1;
  const practicalTitle = activePractical?.title || 'Practical Laboratory Exercise';
  const topicName = theoryContent?.category || activePractical?.category || selectedSubject?.name || 'Computer Science Lab';
  const difficulty = theoryContent?.difficulty || activePractical?.difficulty || 'Medium';
  const estimatedTime = theoryContent?.estimated_time_minutes
    ? `${theoryContent.estimated_time_minutes} Mins`
    : (activePractical?.avgTime || '30 Mins');
  const aimText = activePractical?.aim || 'Implement the algorithmic procedure according to standard curricular specifications.';

  // Real Learning Objectives from Database
  const learningPoints = useMemo(() => {
    if (Array.isArray(theoryContent?.learning_points) && theoryContent.learning_points.length > 0) {
      return theoryContent.learning_points;
    }
    if (Array.isArray(theoryContent?.objectives) && theoryContent.objectives.length > 0) {
      return theoryContent.objectives;
    }
    if (Array.isArray(theoryContent?.key_points) && theoryContent.key_points.length > 0) {
      return theoryContent.key_points;
    }
    return [
      `Understand and implement ${practicalTitle}.`,
      'Trace procedural logic and verify edge cases under automated test suites.',
      'Analyze computational complexity and prepare for curricular viva.',
    ];
  }, [theoryContent, practicalTitle]);

  // Real Prerequisites from Database
  const prerequisites = useMemo(() => {
    if (Array.isArray(theoryContent?.prerequisites) && theoryContent.prerequisites.length > 0) {
      return theoryContent.prerequisites;
    }
    return [
      'Foundational programming syntax and control statements',
      'Basic input/output operations and data structures',
      'Understanding of procedural execution bounds',
    ];
  }, [theoryContent]);

  // Real Complexity and Comparison from Database
  const complexityData = theoryContent?.complexity || null;
  const comparisonData = theoryContent?.comparison || null;

  // Real Concepts from Database
  const conceptsData = theoryContent?.concepts || null;
  const operatorsData = theoryContent?.operators || null;

  // Real Worked Example Data from Database (examples array or first sample test case)
  const sampleTestCase = useMemo(() => {
    if (Array.isArray(theoryContent?.examples) && theoryContent.examples.length > 0) {
      const ex = theoryContent.examples[0];
      return {
        input_data: ex.input || ex.stdin || 'Standard input',
        expected_output: ex.output || ex.stdout || ex.sum_recursive || ex.factorial_recursive || '',
        note: ex.type || 'Curricular example from specification',
      };
    }
    if (activePractical?.testCases && activePractical.testCases.length > 0) {
      const sampleTc = activePractical.testCases.find((tc) => tc.is_sample) || activePractical.testCases[0];
      return {
        input_data: sampleTc.input_data || '(None)',
        expected_output: sampleTc.expected_output || '',
        note: 'Live sample test case from database harness',
      };
    }
    return {
      input_data: 'Standard input sequence',
      expected_output: 'Verified deterministic output',
      note: 'Verification harness',
    };
  }, [theoryContent, activePractical]);

  // Real or Derived Viva Prompts
  const practicePrompts = useMemo(() => {
    if (Array.isArray(activePractical?.vivaPrompts) && activePractical.vivaPrompts.length > 0) {
      return activePractical.vivaPrompts;
    }
    if (Array.isArray(theoryContent?.viva_prompts) && theoryContent.viva_prompts.length > 0) {
      return theoryContent.viva_prompts;
    }

    const prompts = [
      {
        q: `What is the primary objective of "${practicalTitle}"?`,
        a: aimText,
      },
    ];

    if (theoryContent?.theory) {
      prompts.push({
        q: 'What is the core theoretical principle underlying this experiment?',
        a: theoryContent.theory,
      });
    }

    if (learningPoints && learningPoints.length > 0) {
      prompts.push({
        q: 'What are the key technical outcomes you verify during implementation?',
        a: learningPoints.join(' • '),
      });
    }

    return prompts;
  }, [activePractical, theoryContent, practicalTitle, aimText, learningPoints]);

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
            1. PRACTICAL HEADER (LIVE CONTEXT)
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
                  {theoryContent?.co_mapping && (
                    <Badge variant="neutral" size="sm">
                      {theoryContent.co_mapping}
                    </Badge>
                  )}
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
                    <strong>Rubric:</strong> {activePractical?.maxCodingMarks || 3}M Code (Auto) + {activePractical?.maxWriteupMarks || 5}M Writeup + {activePractical?.maxVivaMarks || 2}M Viva
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
            2. LEARNING OVERVIEW & OBJECTIVES (REAL DB CONTENT)
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
              <span className="overview-col-label">Core Learning Points</span>
              <ul className="overview-bullet-list">
                {learningPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
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
            3. REAL FLOWCHART (SUPABASE flowchart_url)
            ========================================================= */}
        {flowchartUrl && (
          <section aria-label="Laboratory Flowchart">
            <div className="learning-section-head">
              <div className="learning-section-title-wrap">
                <GitBranch size={16} color="var(--primary)" />
                <h2 className="learning-section-heading">Algorithmic Flowchart &amp; Execution Diagram</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Maximize2}
                  onClick={() => setIsFlowchartModalOpen(true)}
                  title="Expand Flowchart to Fullscreen"
                >
                  Fullscreen
                </Button>
                <a
                  href={flowchartUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="ghost" size="sm" icon={ExternalLink}>
                    Open SVG
                  </Button>
                </a>
              </div>
            </div>

            <Card surface="white" className="learning-flowchart-card">
              <div className="flowchart-viewport">
                {flowchartLoading && (
                  <div className="flowchart-loading">
                    <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid var(--border-medium)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
                    <span>Loading diagram directly from Supabase CDN...</span>
                  </div>
                )}

                {flowchartError ? (
                  <div className="flowchart-error">
                    <AlertCircle size={24} color="var(--warning)" />
                    <span>Unable to render flowchart inline.</span>
                    <a
                      href={flowchartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}
                    >
                      Click here to open flowchart in new tab ↗
                    </a>
                  </div>
                ) : (
                  <img
                    src={flowchartUrl}
                    alt={`Flowchart diagram for ${practicalTitle}`}
                    className="flowchart-img"
                    onLoad={() => setFlowchartLoading(false)}
                    onError={() => {
                      setFlowchartLoading(false);
                      setFlowchartError(true);
                    }}
                    style={{ display: flowchartLoading ? 'none' : 'block' }}
                  />
                )}
              </div>
            </Card>

            {/* Fullscreen Zoom Modal */}
            {isFlowchartModalOpen && (
              <div
                className="flowchart-modal-backdrop"
                onClick={() => setIsFlowchartModalOpen(false)}
                role="dialog"
                aria-label="Fullscreen Flowchart Modal"
              >
                <div
                  className="flowchart-modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flowchart-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GitBranch size={16} color="var(--primary)" />
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                        {practicalTitle} · Flowchart
                      </strong>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={X}
                      onClick={() => setIsFlowchartModalOpen(false)}
                      title="Close"
                    />
                  </div>
                  <div className="flowchart-modal-body">
                    <img
                      src={flowchartUrl}
                      alt={`Flowchart for ${practicalTitle}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =========================================================
            4. REAL VIDEO & INTERACTIVE TUTORIAL (SUPABASE video_url)
            ========================================================= */}
        {videoUrl && (
          <section aria-label="Curricular Video Tutorial">
            <div className="learning-section-head">
              <div className="learning-section-title-wrap">
                <Video size={16} color="var(--primary)" />
                <h2 className="learning-section-heading">Curricular Video &amp; Interactive Learning Resource</h2>
              </div>
            </div>

            <Card surface="white" className="learning-video-card">
              {youtubeEmbedUrl ? (
                <div className="video-player-container">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={`Video Tutorial for ${practicalTitle}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="video-tutorial-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
                      <Video size={22} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block' }}>
                        Curricular Interactive Practice &amp; Video Walkthrough
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Linked reference tutorial for {practicalTitle}: <code style={{ fontSize: '11px' }}>{videoUrl}</code>
                      </span>
                    </div>
                  </div>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="primary" size="sm" iconRight={ExternalLink}>
                      Open Resource
                    </Button>
                  </a>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* =========================================================
            5. THEORY SPECIFICATION & COMPLEXITY (REAL DB CONTENT)
            ========================================================= */}
        <section aria-label="Concept & Theoretical Invariants">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <Zap size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Theoretical Specification &amp; Analysis</h2>
            </div>
          </div>

          <div className="concept-content-grid">
            <Card surface="white" className="concept-theory-card">
              <span className="overview-col-label">Theoretical Specification</span>
              <p className="concept-theory-p">
                {theoryContent?.theory || theoryContent?.explanation || aimText}
              </p>

              {/* Real Database Concepts Dictionary */}
              {conceptsData && typeof conceptsData === 'object' && (
                <div style={{ marginTop: '14px' }}>
                  <span className="overview-col-label" style={{ marginBottom: '8px' }}>Curricular Concepts</span>
                  <div>
                    {Object.entries(conceptsData).map(([key, val]) => (
                      <div key={key} className="concept-item-card">
                        <strong>{formatLabel(key)}:</strong>
                        <p>{Array.isArray(val) ? val.join(', ') : String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real Database Operators Dictionary */}
              {operatorsData && typeof operatorsData === 'object' && (
                <div style={{ marginTop: '14px' }}>
                  <span className="overview-col-label" style={{ marginBottom: '8px' }}>Operators Specification</span>
                  <div>
                    {Object.entries(operatorsData).map(([opKey, opVal]) => (
                      <div key={opKey} className="concept-item-card">
                        <strong>{formatLabel(opKey)}:</strong>
                        <p>{String(opVal)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real Database Important Note */}
              {theoryContent?.important_note && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: 'var(--radius-xs)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#854d0e', display: 'block', marginBottom: '2px' }}>Important Note:</strong>
                  {theoryContent.important_note}
                </div>
              )}
            </Card>

            {/* Asymptotic Complexity / Comparison Card */}
            <Card surface="white" className="concept-complexity-card">
              <span className="overview-col-label">Computational Complexity &amp; Efficiency</span>

              {complexityData && typeof complexityData === 'object' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {Object.entries(complexityData).map(([k, v]) => {
                    if (typeof v === 'object' && v !== null) {
                      return (
                        <div key={k} style={{ padding: '8px 10px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                          <strong style={{ fontSize: '11.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                            {formatLabel(k)}:
                          </strong>
                          {Object.entries(v).map(([subK, subV]) => (
                            <div key={subK} className="complexity-metric-row">
                              <span className="complexity-metric-name">{formatLabel(subK)}:</span>
                              <span className="complexity-metric-val font-mono">{String(subV)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div key={k} className="complexity-metric-row">
                        <span className="complexity-metric-name">{formatLabel(k)}:</span>
                        <span className="complexity-metric-val font-mono">{String(v)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : comparisonData && typeof comparisonData === 'object' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {Object.entries(comparisonData).map(([compK, compV]) => (
                    <div key={compK} style={{ padding: '8px 10px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ fontSize: '11.5px', color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>
                        {formatLabel(compK)}:
                      </strong>
                      {typeof compV === 'object' && compV !== null ? (
                        Object.entries(compV).map(([subK, subV]) => (
                          <div key={subK} className="complexity-metric-row">
                            <span className="complexity-metric-name">{formatLabel(subK)}:</span>
                            <span className="complexity-metric-val font-mono">{String(subV)}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{String(compV)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <div className="complexity-metric-row">
                    <span className="complexity-metric-name">Curricular Level:</span>
                    <span className="complexity-metric-val font-mono">{activePractical?.nepLevel || 'Level 5'}</span>
                  </div>
                  <div className="complexity-metric-row">
                    <span className="complexity-metric-name">Difficulty Rating:</span>
                    <span className="complexity-metric-val font-mono">{difficulty}</span>
                  </div>
                  <div className="complexity-metric-row">
                    <span className="complexity-metric-name">Standard Est. Time:</span>
                    <span className="complexity-metric-val font-mono">{estimatedTime}</span>
                  </div>
                  {theoryContent?.co_mapping && (
                    <div className="complexity-metric-row">
                      <span className="complexity-metric-name">Course Outcome:</span>
                      <span className="complexity-metric-val font-mono">{theoryContent.co_mapping}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* =========================================================
            6. ALGORITHM & PSEUDOCODE (REAL DB CONTENT WITH SUB-TABS)
            ========================================================= */}
        <section aria-label="Algorithm & Pseudocode">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <CheckCircle2 size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Algorithm Procedure &amp; Pseudocode</h2>
            </div>
          </div>

          <div className="algorithm-content-grid">
            {/* Algorithm Steps Card */}
            <Card surface="white" className="algorithm-steps-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="overview-col-label">Numbered Procedural Steps</span>
                <Badge variant="neutral" size="sm">
                  {currentAlgoSteps.length} Steps
                </Badge>
              </div>

              {/* Sub-Tabs if practical has multiple algorithms (e.g. Linear vs Binary, or Bubble vs Insertion vs Selection) */}
              {algorithmKeys.length > 1 && (
                <div className="algo-subnav-tabs" role="tablist">
                  {algorithmKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selectedAlgoKey === key}
                      className={`algo-subnav-tab ${selectedAlgoKey === key ? 'active' : ''}`}
                      onClick={() => setSelectedAlgoKey(key)}
                    >
                      {formatLabel(key)}
                    </button>
                  ))}
                </div>
              )}

              <div className="algo-step-list">
                {currentAlgoSteps.length > 0 ? (
                  currentAlgoSteps.map((step, idx) => {
                    const isString = typeof step === 'string';
                    const titleText = isString ? step : (step.title || `Step ${idx + 1}`);
                    const detailText = isString ? null : step.detail;

                    return (
                      <div key={idx} className="algo-step-item">
                        <div className="algo-step-num font-mono">{idx + 1}</div>
                        <div className="algo-step-body">
                          <h3 className="algo-step-title">{titleText}</h3>
                          {detailText && <p className="algo-step-detail">{detailText}</p>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    Standard procedural algorithm steps are loaded in Code Lab starter files.
                  </div>
                )}
              </div>
            </Card>

            {/* Pseudocode Card */}
            <Card surface="white" className="pseudocode-card">
              <div className="pseudocode-head-bar">
                <span className="overview-col-label">Algorithmic Pseudocode</span>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={copied ? Check : Copy}
                  onClick={handleCopyPseudocode}
                  disabled={!currentPseudocodeText}
                >
                  {copied ? 'Copied' : 'Copy Code'}
                </Button>
              </div>

              {/* Sub-Tabs if multiple pseudocode implementations are stored */}
              {pseudocodeKeys.length > 1 && (
                <div className="algo-subnav-tabs" role="tablist">
                  {pseudocodeKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selectedPseudoKey === key}
                      className={`algo-subnav-tab ${selectedPseudoKey === key ? 'active' : ''}`}
                      onClick={() => setSelectedPseudoKey(key)}
                    >
                      {formatLabel(key)}
                    </button>
                  ))}
                </div>
              )}

              <pre className="pseudocode-pre">
                {currentPseudocodeText || '// No pseudocode specification provided for this practical in database catalog.'}
              </pre>
            </Card>
          </div>
        </section>

        {/* =========================================================
            7. INTERACTIVE 3D VISUALIZATION (DATA-DRIVEN)
            ========================================================= */}
        <section aria-label="Interactive Visualizer">
          <div className="learning-section-head">
            <div className="learning-section-title-wrap">
              <Sparkles size={16} color="var(--primary)" />
              <h2 className="learning-section-heading">Interactive 3D Algorithm Simulation (Visual Centerpiece)</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Drag to orbit in 3D • Use playback controls to step through real algorithmic states
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
                  disabled={activeSteps.length <= 1}
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
                  <span className="vis-state-key">Current State:</span>
                  <span className="vis-state-val">{currentStepData.currentNode}</span>
                </div>
                <div className="vis-state-row">
                  <span className="vis-state-key">Execution Stack:</span>
                  <span className="vis-state-val">{currentStepData.stack}</span>
                </div>
                <div className="vis-state-row">
                  <span className="vis-state-key">Procedure Phase:</span>
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
            8. WORKED EXAMPLE (REAL DB INPUT & OUTPUT)
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
                  {sampleTestCase.note}
                </span>
              </div>

              <div className="worked-box" style={{ background: '#FFFFFF' }}>
                <span className="worked-box-label">Algorithmic Process Walkthrough</span>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  1. Parse input tokens from standard input (stdin) matching the experiment interface.<br />
                  2. Execute the procedure satisfying {topicName} operational constraints.<br />
                  3. Verify structural and value invariants for each boundary condition.<br />
                  4. Stream standard output formatted strictly matching automated compiler test cases.
                </p>
              </div>

              <div className="worked-box">
                <span className="worked-box-label">Verified Output (STDOUT)</span>
                <pre className="worked-box-content" style={{ color: 'var(--primary)' }}>
                  {sampleTestCase.expected_output}
                </pre>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Evaluated with automated Judge0 test harness
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* =========================================================
            9. PRACTICE CHECK & VIVA PROMPTS (DATA-DRIVEN)
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
            10. START CODING CTA (STRONGEST ACTION)
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
                Starter templates, compilation toolchains (C++20, C17, Python 3, Java 21), and automated Judge0 test harnesses are pre-loaded in your Code Lab environment.
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
