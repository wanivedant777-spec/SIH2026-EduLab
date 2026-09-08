import React from 'react';
import { UserCircle2, Building2, Layers3, GraduationCap, ShieldCheck } from 'lucide-react';

export default function StudentProfileCard({ profile, currentUser }) {
  const student = profile || currentUser || {};
  const rows = [
    ['Registration No.', student.identifier || currentUser?.identifier || '—'],
    ['Email', student.email || currentUser?.email || '—'],
    ['Department', student.departments?.name || '—'],
    ['Division', student.divisions?.name || '—'],
    ['Batch', student.batches?.name || currentUser?.batchName || '—'],
    ['Status', student.status || currentUser?.status || 'active'],
  ];

  return (
    <section className="student-profile-card">
      <div className="profile-card-header">
        <div className="profile-avatar"><UserCircle2 size={34} /></div>
        <div>
          <p className="profile-eyebrow">Student Profile</p>
          <h2>{student.full_name || currentUser?.name || 'Student'}</h2>
          <p>Institutional academic record</p>
        </div>
        <div className="profile-readonly"><ShieldCheck size={14} /> Read-only</div>
      </div>

      <div className="profile-grid">
        {rows.map(([label, value]) => (
          <div className="profile-field" key={label}>
            <span>{label}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>
      <p className="profile-note">Profile information is managed by the institution and cannot be edited by students.</p>
    </section>
  );
}
