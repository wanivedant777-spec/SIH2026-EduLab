import React, { useState } from 'react';
import { BookOpen, GitFork, FileCode, CheckCircle2, Award, HelpCircle } from 'lucide-react';

export default function TheoryPanel({ practical }) {
  const [activeTab, setActiveTab] = useState('algorithm');

  return (
    <div className="theory-panel">
      {/* Tab Navigation */}
      <div className="panel-header-tabs">
        <button
          className={`tab-btn ${activeTab === 'algorithm' ? 'active' : ''}`}
          onClick={() => setActiveTab('algorithm')}
        >
          <BookOpen size={15} />
          Algorithm
        </button>
        <button
          className={`tab-btn ${activeTab === 'pseudocode' ? 'active' : ''}`}
          onClick={() => setActiveTab('pseudocode')}
        >
          <FileCode size={15} />
          Pseudocode
        </button>
        <button
          className={`tab-btn ${activeTab === 'flowchart' ? 'active' : ''}`}
          onClick={() => setActiveTab('flowchart')}
        >
          <GitFork size={15} />
          Flowchart
        </button>
        <button
          className={`tab-btn ${activeTab === 'viva' ? 'active' : ''}`}
          onClick={() => setActiveTab('viva')}
        >
          <HelpCircle size={15} />
          Viva Prep
        </button>
      </div>

      {/* Content Container */}
      <div className="panel-content">
        {/* Header Overview Card */}
        <div className="theory-overview-card">
          <div className="badge-row" style={{ marginBottom: '8px' }}>
            <span className="meta-chip">{practical.courseCode}</span>
            <span className="meta-chip">{practical.category}</span>
            <span className="nep-tag">
              <Award size={12} />
              NEP 2020 Skill: Level 5 (Tree Structures)
            </span>
          </div>
          <h2 className="theory-title">{practical.title}</h2>
          <p className="theory-aim">
            <strong>Aim:</strong> {practical.aim}
          </p>
          <div className="badge-row">
            <span className="meta-chip">Avg. Time: 30 Mins</span>
            <span className="meta-chip">Difficulty: Medium</span>
            <span className="meta-chip" style={{ color: '#38bdf8' }}>
              Rubric: 5 Coding + 3 Write-up + 2 Viva
            </span>
          </div>
        </div>

        {/* Tab 1: Algorithm */}
        {activeTab === 'algorithm' && (
          <div>
            <div className="section-heading">
              <CheckCircle2 size={16} color="#6366f1" />
              Step-by-Step Procedure
            </div>
            <div className="algorithm-step-list">
              {practical.algorithm.map((step, idx) => (
                <div key={idx} className="step-card">
                  <div className="step-number">{idx + 1}</div>
                  <div className="step-body">
                    <h4>{step.title}</h4>
                    <p>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Pseudocode */}
        {activeTab === 'pseudocode' && (
          <div>
            <div className="section-heading">
              <FileCode size={16} color="#a855f7" />
              Algorithmic Pseudocode
            </div>
            <pre className="code-block-container">{practical.pseudocode}</pre>
          </div>
        )}

        {/* Tab 3: Flowchart */}
        {activeTab === 'flowchart' && (
          <div>
            <div className="section-heading">
              <GitFork size={16} color="#10b981" />
              Execution Logic Flowchart
            </div>
            <div className="flowchart-container">
              <div className="flow-node flow-start">● START</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-process">Read Number of Nodes N</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-decision">Is Root == NULL?</div>
              <div className="flow-arrow">↓ (Yes: Create Root | No: Compare Val)</div>
              <div className="flow-node flow-process">
                If Key &lt; Node-&gt;Data: Recurse Left<br />
                Else: Recurse Right
              </div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-process">Perform Inorder Traversal (L - Root - R)</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-process">Print Sorted Elements to STDOUT</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-start">■ STOP (Sorted Order Verified)</div>
            </div>
          </div>
        )}

        {/* Tab 4: Viva Preparation */}
        {activeTab === 'viva' && (
          <div>
            <div className="section-heading">
              <HelpCircle size={16} color="#f59e0b" />
              Viva Reference Prompts (2 Marks)
            </div>
            <div className="algorithm-step-list">
              <div className="step-card">
                <div className="step-number" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>Q1</div>
                <div className="step-body">
                  <h4>Time Complexity Comparison</h4>
                  <p>What is the worst-case time complexity of BST insertion vs an AVL Tree, and when does BST degrade to O(N)?</p>
                </div>
              </div>
              <div className="step-card">
                <div className="step-number" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>Q2</div>
                <div className="step-body">
                  <h4>Inorder Traversal Property</h4>
                  <p>Why does an inorder traversal of a valid Binary Search Tree always yield values in non-decreasing order?</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
