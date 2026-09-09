import React from 'react';
import { ShieldCheck, User, Building, BookOpen, Layers, Calendar, Hash, Mail, CheckCircle2 } from 'lucide-react';

export default function StudentProfileCard({ profile, currentUser }) {
  // Extract strictly from verified real Supabase relationships
  const fullName = profile?.full_name || currentUser?.name || 'Student';
  const prn = profile?.identifier || currentUser?.identifier || 'Not Assigned';
  const email = profile?.email || currentUser?.email || '—';
  
  const collegeName = profile?.colleges?.name || profile?.collegeName || '—';
  const departmentName = profile?.departments?.name || profile?.departmentName || '—';
  const divisionName = profile?.divisions?.name || profile?.divisionName || '—';
  const batchName = profile?.batches?.name || profile?.batchName || currentUser?.batchName || '—';
  
  const academicYear = profile?.divisions?.academic_year || profile?.academicYear || '—';
  const rawSemester = profile?.divisions?.semester || profile?.semester;
  const semesterDisplay = rawSemester ? `Semester ${rawSemester}` : '—';
  
  const rawStatus = profile?.status || currentUser?.status || 'active';
  const statusDisplay = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  const isActive = rawStatus.toLowerCase() === 'active';

  return (
    <section className="student-profile-card" id="student-institutional-profile">
      {/* Header Bar */}
      <div className="profile-card-header">
        <div className="profile-header-identity">
          <div className="profile-avatar-circle">
            <User size={20} color="var(--accent-text)" />
          </div>
          <div className="profile-identity-text">
            <div className="profile-name-row">
              <h1 className="profile-student-name">{fullName}</h1>
              <span className={`profile-status-pill ${isActive ? 'status-active' : 'status-pending'}`}>
                <span className="status-indicator-dot" />
                {statusDisplay}
              </span>
            </div>
            <p className="profile-role-caption">Institutional Academic Profile · Student</p>
          </div>
        </div>

        {/* Read-Only Institution Managed Security Indicator */}
        <div className="institution-managed-pill" title="This profile is governed by institutional records and is strictly read-only.">
          <ShieldCheck size={14} className="managed-shield-icon" />
          <span>Institution Managed · Read-Only</span>
        </div>
      </div>

      {/* Grid of Institutional Details */}
      <div className="profile-details-grid">
        {/* 1. PRN / Registration Number */}
        <div className="profile-detail-item">
          <div className="detail-item-header">
            <Hash size={13} className="detail-icon" />
            <span className="detail-label">PRN / Registration No</span>
          </div>
          <span className="detail-value font-mono highlight-prn">{prn}</span>
        </div>

        {/* 2. Institutional Email */}
        <div className="profile-detail-item">
          <div className="detail-item-header">
            <Mail size={13} className="detail-icon" />
            <span className="detail-label">Institutional Email</span>
          </div>
          <span className="detail-value detail-value-email" title={email}>{email}</span>
        </div>

        {/* 3. College */}
        <div className="profile-detail-item">
          <div className="detail-item-header">
            <Building size={13} className="detail-icon" />
            <span className="detail-label">College</span>
          </div>
          <span className="detail-value" title={collegeName}>{collegeName}</span>
        </div>

        {/* 4. Department */}
        <div className="profile-detail-item">
          <div className="detail-item-header">
            <BookOpen size={13} className="detail-icon" />
            <span className="detail-label">Department</span>
          </div>
          <span className="detail-value" title={departmentName}>{departmentName}</span>
        </div>

        {/* 5. Division */}
        <div className="profile-detail-item">
          <div className="detail-item-header">
            <Layers size={13} className="detail-icon" />
            <span className="detail-label">Division</span>
          </div>
          <span className="detail-value">{divisionName}</span>
        </div>

        {/* 6. Batch */}
        <div className="profile-detail-item">
          <div className="detail-item-header">
            <CheckCircle2 size={13} className="detail-icon" />
            <span className="detail-label">Batch</span>
          </div>
          <span className="detail-value font-mono highlight-batch">{batchName}</span>
        </div>

        {/* 7. Academic Year */}
        <div className="profile-detail-item">
          <div className="detail-item-header">
            <Calendar size={13} className="detail-icon" />
            <span className="detail-label">Academic Year</span>
          </div>
          <span className="detail-value">{academicYear}</span>
        </div>

        {/* 8. Semester */}
        <div className="profile-detail-item">
          <div className="detail-item-header">
            <BookOpen size={13} className="detail-icon" />
            <span className="detail-label">Semester</span>
          </div>
          <span className="detail-value">{semesterDisplay}</span>
        </div>
      </div>
    </section>
  );
}
