import React, { useState } from 'react';
import { BookOpen, FileCode, GitFork, HelpCircle, CheckCircle2, Copy, Check, Award } from 'lucide-react';
import Tabs from '../ui/Tabs';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function TheoryPanel({ practical }) {
  const [activeTab, setActiveTab] = useState('algorithm');
  const [copied, setCopied] = useState(false);

  if (!practical) return null;

  const tabs = [
    { id: 'algorithm', label: 'Algorithm', icon: BookOpen },
    { id: 'pseudocode', label: 'Pseudocode', icon: FileCode },
    { id: 'flowchart', label: 'Flowchart', icon: GitFork },
    { id: 'viva', label: 'Viva Prep', icon: HelpCircle, badge: '2M' },
  ];

  const handleCopyPseudocode = () => {
    navigator.clipboard.writeText(practical.pseudocode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="theory-pane">
      {/* Top Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="theory-content">
        {/* Overview Header Card */}
        <div className="theory-overview-card">
          <div className="meta-chip-row" style={{ marginBottom: '10px' }}>
            <Badge variant="cyan">{practical.courseCode}</Badge>
            <Badge variant="primary">{practical.category}</Badge>
            <Badge variant="nep">
              <Award size={11} />
              {practical.nepLevel || 'NEP 2020 Level 5'}
            </Badge>
          </div>

          <h2 className="theory-title">{practical.title}</h2>
          <p className="theory-aim">
            <strong>Aim: </strong>{practical.aim}
          </p>

          <div className="meta-chip-row">
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Avg. Time: {practical.avgTime || '30 Mins'}
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Difficulty: {practical.difficulty || 'Medium'}
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span style={{ fontSize: '11px', color: 'var(--cyan-light)', fontWeight: 600 }}>
              Rubric: 5 Coding + 3 Write-up + 2 Viva
            </span>
          </div>
        </div>

        {/* Tab 1: Algorithm */}
        {activeTab === 'algorithm' && (
          <div>
            <div className="section-heading">
              <CheckCircle2 size={15} color="var(--primary-light)" />
              Step-by-Step Procedure
            </div>

            <div className="step-card-list">
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div className="section-heading" style={{ margin: 0 }}>
                <FileCode size={15} color="var(--purple-light)" />
                Algorithmic Pseudocode
              </div>

              <Button
                variant="glass"
                size="sm"
                icon={copied ? Check : Copy}
                onClick={handleCopyPseudocode}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <pre className="code-block-container">{practical.pseudocode}</pre>
          </div>
        )}

        {/* Tab 3: Flowchart */}
        {activeTab === 'flowchart' && (
          <div>
            <div className="section-heading">
              <GitFork size={15} color="var(--success-light)" />
              Program Execution Logic Flow
            </div>

            <div className="flowchart-canvas">
              <div className="flow-node flow-start">● START LAB RUN</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-process">Parse Standard Input via STDIN</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-decision">Is Invariant Maintained?</div>
              <div className="flow-arrow">↓ (Yes: Recurse / Traverse | No: Rebalance)</div>
              <div className="flow-node flow-process">Execute Core Algorithm Step &amp; Traversal</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-process">Emit Deterministic Tokens to STDOUT</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node flow-start">■ FINISH (Test Cases Evaluated)</div>
            </div>
          </div>
        )}

        {/* Tab 4: Viva Prep */}
        {activeTab === 'viva' && (
          <div>
            <div className="section-heading">
              <HelpCircle size={15} color="var(--warning-light)" />
              Faculty Viva Examination Prompts (2 Marks)
            </div>

            <div className="step-card-list">
              {(practical.vivaPrompts || [
                {
                  q: 'Algorithm Complexity Analysis',
                  a: 'Be prepared to explain best-case, average-case, and worst-case space and time complexities to your lab instructor.',
                },
              ]).map((item, idx) => (
                <div key={idx} className="step-card">
                  <div className="step-number" style={{ background: 'var(--warning-soft)', color: 'var(--warning-light)', borderColor: 'var(--warning-border)' }}>
                    Q{idx + 1}
                  </div>
                  <div className="step-body">
                    <h4>{item.q}</h4>
                    <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
