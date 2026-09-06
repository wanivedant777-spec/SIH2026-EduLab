import React from 'react';
import { BookOpen, Code, Award, CheckCircle2, Clock, PlayCircle, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react';

const PRACTICALS_DATA = [
  {
    id: 'prac_dsa_04_bst',
    subjectCode: 'CS201P',
    subjectName: 'Data Structures',
    number: 4,
    title: 'Implementation of Binary Search Tree & Inorder Traversal',
    aim: 'Implement BST insertion maintaining invariant (Left < Root ≤ Right) and verify output via Inorder Traversal.',
    category: 'Tree Structures',
    status: 'attempted',
    marks: {
      performing: 3.0,
      writing: 4.5,
      viva: 2.0,
      total: 9.5,
    },
    allowedLanguages: ['C++', 'Python', 'Java', 'C'],
  },
  {
    id: 'prac_qc_01_teleportation',
    subjectCode: 'AI202P',
    subjectName: 'introduction to Quantum computing',
    number: 1,
    title: 'Simulating Quantum Superposition with Hadamard Gates',
    aim: 'Create single-qubit Bell state circuits and measure probabilistic basis states using Python Qiskit/Sim.',
    category: 'Quantum Gates',
    status: 'pending',
    marks: null,
    allowedLanguages: ['Python'],
  },
  {
    id: 'prac_os_02_scheduling',
    subjectCode: 'CS203P',
    subjectName: 'Operating Systems',
    number: 2,
    title: 'Round Robin CPU Scheduling with Dynamic Quantum',
    aim: 'Calculate average turnaround and waiting times for n processes under preemptive scheduling.',
    category: 'Process Management',
    status: 'pending',
    marks: null,
    allowedLanguages: ['C++', 'C'],
  },
  {
    id: 'prac_pyqc_03_grover',
    subjectCode: 'AI204P',
    subjectName: 'Python for quantum computing',
    number: 3,
    title: 'Matrix Representation of Pauli Operators & Qubit State Evolution',
    aim: 'Implement complex statevector transformations using NumPy and evaluate fidelity metrics.',
    category: 'Quantum Algorithms',
    status: 'pending',
    marks: null,
    allowedLanguages: ['Python'],
  },
];

export default function StudentDashboard({ user, onLaunchPractical }) {
  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="student-profile-banner">
        <div className="profile-banner-left">
          <div className="avatar-circle">
            <span>{user.name?.charAt(0) || 'S'}</span>
          </div>
          <div>
            <h1 className="student-name">{user.name || 'Student'}</h1>
            <div className="student-tags">
              <span className="badge badge-primary">{user.identifier}</span>
              <span className="badge badge-accent">Batch {user.batchName || 'C1'}</span>
              <span className="badge badge-outline">Division C</span>
              <span className="badge badge-outline">CSE-AI · Sem 4</span>
            </div>
          </div>
        </div>

        <div className="profile-banner-right">
          <div className="academic-stat">
            <span className="stat-label">Division Target</span>
            <span className="stat-value">60 Students</span>
          </div>
          <div className="academic-stat">
            <span className="stat-label">Integrity Index</span>
            <span className="stat-value text-success">100% Verified</span>
          </div>
        </div>
      </div>

      {/* Progress Metric Highlights */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-icon-box bg-indigo">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="metric-num">4</div>
            <div className="metric-desc">Practical Subjects</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box bg-emerald">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="metric-num">1 / 4</div>
            <div className="metric-desc">Practicals Attempted</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box bg-amber">
            <Award size={18} />
          </div>
          <div>
            <div className="metric-num">9.5 / 10</div>
            <div className="metric-desc">Latest Score (5W + 3P + 2V)</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box bg-purple">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="metric-num">0 Flags</div>
            <div className="metric-desc">Non-Punitive Audit Log</div>
          </div>
        </div>
      </div>

      {/* Practicals & Lab Experiments Section */}
      <div className="dashboard-content-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Assigned Lab Practicals</h2>
            <p className="section-subtitle">
              Official 10-mark curriculum for Division C (Batches C1, C2, C3). Select a practical to open the LeetCode-style IDE.
            </p>
          </div>
        </div>

        <div className="practicals-grid">
          {PRACTICALS_DATA.map((prac) => (
            <div key={prac.id} className="practical-card">
              <div className="practical-card-top">
                <span className="subject-code-chip">{prac.subjectCode} · {prac.subjectName}</span>
                <span className={`status-pill ${prac.status}`}>
                  {prac.status === 'attempted' ? 'Attempted' : 'Pending'}
                </span>
              </div>

              <h3 className="practical-title">
                Practical 0{prac.number}: {prac.title}
              </h3>
              <p className="practical-aim">{prac.aim}</p>

              {prac.marks && (
                <div className="marks-badge-row">
                  <span className="mark-badge">Performing: <strong>{prac.marks.performing}M</strong></span>
                  <span className="mark-badge">Writing: <strong>{prac.marks.writing}M</strong></span>
                  <span className="mark-badge">Viva: <strong>{prac.marks.viva}M</strong></span>
                  <span className="mark-badge total">Total: <strong>{prac.marks.total} / 10</strong></span>
                </div>
              )}

              <div className="practical-card-bottom">
                <div className="languages-tag-list">
                  {prac.allowedLanguages.map((lang) => (
                    <span key={lang} className="lang-tag">{lang}</span>
                  ))}
                </div>

                <button
                  className="btn-launch-ide"
                  onClick={() => onLaunchPractical(prac)}
                >
                  <Code size={14} />
                  <span>Launch IDE</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
