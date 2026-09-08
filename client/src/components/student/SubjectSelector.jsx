import React from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';

export default function SubjectSelector({ subjects = [], onSelect }) {
  if (subjects.length === 0) {
    return (
      <section className="subject-selector">
        <div className="subject-selector-head">
          <div><p className="section-kicker">Academic Workspace</p><h2>Your Subjects</h2></div>
        </div>
        <div className="empty-state">No subjects with active practicals are available for your academic record yet.</div>
      </section>
    );
  }

  return (
    <section className="subject-selector">
      <div className="subject-selector-head">
        <div>
          <p className="section-kicker">Academic Workspace</p>
          <h2>Select a Subject</h2>
          <p>Choose a subject to view its practicals and open the coding workspace.</p>
        </div>
      </div>
      <div className="subject-grid">
        {subjects.map((subject) => (
          <button className="subject-card" key={subject.id} type="button" onClick={() => onSelect(subject)}>
            <div className="subject-card-icon"><BookOpen size={22} /></div>
            <div className="subject-card-body">
              <span className="subject-code">{subject.code}</span>
              <h3>{subject.name}</h3>
              <p>{subject.practicalCount} practical{subject.practicalCount === 1 ? '' : 's'} available</p>
            </div>
            <ArrowRight size={18} className="subject-card-arrow" />
          </button>
        ))}
      </div>
    </section>
  );
}
