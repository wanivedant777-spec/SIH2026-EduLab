import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Lock, ArrowRight, School, LockKeyhole } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleAuth = async (e, customId = null, customPassword = null) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const targetId = customId || identifier;
    const targetPwd = customPassword || password;

    let cleanId = targetId.trim().toUpperCase();
    // Resolve common user entry variations:
    if (/^GHR2025\d{3}$/.test(cleanId)) {
      cleanId = cleanId.replace(/^GHR2025(\d{3})$/, 'GHR2025AI$1');
    } else if (['STUDENT001', 'STUDENT_001', 'STUDENT', 'STUDENT1'].includes(cleanId)) {
      cleanId = 'GHR2025AI001';
    } else if (['FACULTY001', 'FACULTY_001', 'FACULTY', 'FACULTY1'].includes(cleanId)) {
      cleanId = 'FAC001';
    }

    if (!cleanId || !targetPwd) {
      setErrorMsg('Please enter both your Institutional ID and Password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try unified backend login first
      let authSucceeded = false;
      try {
        const apiUrl = import.meta.env.VITE_EVALUATION_API_URL || 'http://localhost:8000';
        const backendRes = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanId, password: targetPwd }),
        });

        if (backendRes.ok) {
          const resData = await backendRes.json();
          if (resData.session?.access_token) {
            await supabase.auth.setSession({
              access_token: resData.session.access_token,
              refresh_token: resData.session.refresh_token,
            });
          }
          if (resData.profile) {
            if (!['student', 'faculty'].includes(resData.profile.role)) {
              throw new Error('Account has an unrecognized or unauthorized role. Access denied.');
            }
            onLoginSuccess(resData.profile);
            authSucceeded = true;
            return;
          }
        } else {
          const errJson = await backendRes.json().catch(() => ({}));
          if (errJson.detail) {
            throw new Error(errJson.detail);
          }
        }
      } catch (backendErr) {
        // If backend returned explicit authentication error, propagate it directly without fallback
        if (backendErr.message && (
          backendErr.message.includes('not recognized') ||
          backendErr.message.includes('Invalid password') ||
          backendErr.message.includes('Access denied') ||
          backendErr.message.includes('unrecognized')
        )) {
          throw backendErr;
        }
        console.warn('Backend auth endpoint unavailable, falling back to direct Supabase lookup:', backendErr);
      }

      if (authSucceeded) return;

      // 2. Direct Supabase Fallback:
      let targetEmail = null;
      let targetRole = null;

      // Try RPC first if available
      try {
        const { data: rosterUser } = await supabase
          .rpc('lookup_user_by_identifier', { p_identifier: cleanId });
        if (rosterUser && rosterUser.length > 0) {
          targetEmail = rosterUser[0].email;
          targetRole = rosterUser[0].role;
        }
      } catch {
        // RPC might not be present, fallback to deterministic mapping
      }

      // If RPC did not find or failed, map canonical institutional IDs
      if (!targetEmail) {
        if (cleanId.includes('@')) {
          targetEmail = cleanId.toLowerCase();
        } else if (cleanId.startsWith('GHR2025AI')) {
          const num = cleanId.replace(/^GHR2025AI(\d+)$/, '$1');
          targetEmail = `student${num}@college.edu`;
          targetRole = 'student';
        } else if (cleanId.startsWith('FAC')) {
          const num = cleanId.replace(/^FAC(\d+)$/, '$1');
          targetEmail = `faculty${num}@college.edu`;
          targetRole = 'faculty';
        }
      }

      if (!targetEmail) {
        throw new Error('Institutional ID not recognized in college database. Access denied.');
      }

      if (targetRole && !['student', 'faculty'].includes(targetRole)) {
        throw new Error('Account has an unrecognized or unauthorized role. Access denied.');
      }

      // 3. Authenticate against Supabase Auth (Normal login must NOT create users)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPwd,
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid password for this institutional account. Please check your credentials.');
        }
        throw authError;
      }

      if (!data?.user) {
        throw new Error('Authentication session could not be established.');
      }

      // 4. Retrieve verified profile strictly from the database - never trust client input
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*, batches(name), departments(name)')
        .eq('id', data.user.id)
        .single();

      if (profError || !profile) {
        throw new Error('Verified profile not found in college database. Access denied.');
      }

      const verifiedRole = profile.role;
      if (!verifiedRole || !['student', 'faculty'].includes(verifiedRole)) {
        throw new Error('User profile has an unrecognized or unauthorized role. Access denied.');
      }

      const activeUser = {
        id: profile.id,
        email: profile.email,
        identifier: profile.identifier || cleanId,
        name: profile.full_name || rosterEntry.full_name || 'Member',
        role: verifiedRole,
        batchName: profile.batches?.name || 'Unassigned',
        status: profile.status || 'active',
      };

      onLoginSuccess(activeUser);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoId, demoPwd) => {
    setIdentifier(demoId);
    setPassword(demoPwd);
    handleAuth(null, demoId, demoPwd);
  };

  return (
    <div className="login-container">
      {/* Background ambient glow */}
      <div className="login-backdrop" />

      <div className="login-card">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-badge">
            <School size={16} />
            <span>SIH 2026 · GHRCEM</span>
          </div>
          <h1 className="login-title">Practical Lab Management Platform</h1>
          <p className="login-subtitle">
            Sign in with your institutional credentials. Your role and workspace will be verified automatically.
          </p>
        </div>

        {/* Security / Non-Role-Disclosure Notice */}
        <div className="security-notice-pill">
          <LockKeyhole size={13} />
          <span>Single Unified Sign-In · Role is determined server-side</span>
        </div>

        {/* Alert Messages */}
        {errorMsg && <div className="alert-box alert-error">{errorMsg}</div>}
        {infoMsg && <div className="alert-box alert-info">{infoMsg}</div>}

        {/* Unified Login Form */}
        <form onSubmit={handleAuth} className="login-form">
          <div className="form-group">
            <label className="form-label">
              Institutional ID (PRN / Employee ID)
            </label>
            <div className="input-wrapper">
              <User size={16} className="input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="e.g. GHR2025AI001 or FAC001"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
              />
            </div>
            <span className="field-hint">Enter your student Registration No. (PRN) or faculty Employee ID.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary-auth" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle, #E7E5DD)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #78716C)', textAlign: 'center' }}>
            Quick Demo Sign-In
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDemoFill('GHR2025AI001', 'StudentPassword@2026')}
              disabled={loading}
              style={{
                background: 'var(--bg-canvas, #F9F9F6)',
                border: '1px solid var(--border-medium, #D6D3D1)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary, #1C1917)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Demo Student</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('FAC001', 'FacultyPassword@2026')}
              disabled={loading}
              style={{
                background: 'var(--bg-canvas, #F9F9F6)',
                border: '1px solid var(--border-medium, #D6D3D1)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary, #1C1917)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Demo Faculty</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

