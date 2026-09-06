import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Lock, ArrowRight, Sparkles, School, LockKeyhole } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Quick autofill helper for SIH evaluators and testing
  const handleQuickFill = (id, pass) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMsg('');
    setInfoMsg('');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanId = identifier.trim().toUpperCase();
    if (!cleanId || !password) {
      setErrorMsg('Please enter both your Institutional ID and Password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try unified backend login first (handles auto-activation without email rate limits)
      try {
        const apiUrl = import.meta.env.VITE_EVALUATION_API_URL || 'http://localhost:8000';
        const backendRes = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanId, password }),
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
            onLoginSuccess(resData.profile);
            return;
          }
        } else {
          const errJson = await backendRes.json().catch(() => ({}));
          if (backendRes.status === 401 && errJson.detail) {
            throw new Error(errJson.detail);
          }
        }
      } catch (backendErr) {
        // If backend returned explicit authentication error, propagate it
        if (backendErr.message && (backendErr.message.includes('not recognized') || backendErr.message.includes('Invalid password'))) {
          throw backendErr;
        }
        console.warn('Backend auth endpoint unavailable, falling back to client-side Supabase lookup:', backendErr);
      }

      // 2. Direct Supabase Fallback:
      // Server-side lookup via database function to securely fetch institutional email
      let targetEmail = cleanId.toLowerCase();
      let verifiedRole = 'student';
      let verifiedName = 'Student';

      if (!targetEmail.includes('@')) {
        const { data: rosterUser, error: rpcError } = await supabase
          .rpc('lookup_user_by_identifier', { p_identifier: cleanId });

        if (!rpcError && rosterUser && rosterUser.length > 0) {
          targetEmail = rosterUser[0].email;
          verifiedRole = rosterUser[0].role;
          verifiedName = rosterUser[0].full_name;
        } else {
          throw new Error('Institutional ID not recognized in college whitelist. Please contact administration.');
        }
      }

      // 3. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid password or ID. Please check your credentials.');
        }
        throw error;
      }

      if (data?.user) {
        await fetchProfileAndProceed(data.user, cleanId, verifiedRole, verifiedName);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileAndProceed = async (authUser, enteredId, fallbackRole, fallbackName) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, batches(name), departments(name)')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch note:', error);
      }

      // Role is determined strictly by the database record - never by user input!
      const activeUser = {
        id: authUser.id,
        email: authUser.email,
        identifier: profile?.identifier || enteredId,
        name: profile?.full_name || fallbackName,
        role: profile?.role || fallbackRole,
        batchName: profile?.batches?.name || (enteredId.includes('02') ? 'C2' : 'C1'),
        status: profile?.status || 'active',
      };

      onLoginSuccess(activeUser);
    } catch (err) {
      console.error('Error fetching profile:', err);
      onLoginSuccess({
        id: authUser.id,
        email: authUser.email,
        identifier: enteredId,
        name: fallbackName,
        role: fallbackRole,
        batchName: 'C1',
        status: 'active',
      });
    }
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

        {/* Quick Testing Demo Shortcuts (only visible in development mode) */}
        {import.meta.env.DEV && (
          <div className="demo-shortcuts">
            <div className="shortcuts-label">
              <Sparkles size={12} />
              <span>Quick Test Credentials (DEV only):</span>
            </div>
            <div className="shortcuts-list">
              <button
                type="button"
                className="shortcut-chip"
                onClick={() => handleQuickFill('GHR2025AI001', 'StudentPassword@2026')}
              >
                🎓 GHR2025AI001 (Student, C1)
              </button>
              <button
                type="button"
                className="shortcut-chip"
                onClick={() => handleQuickFill('FAC001', 'FacultyPassword@2026')}
              >
                👨‍🏫 FAC001 (Faculty, DSA)
              </button>
            </div>
            <div className="shortcuts-list" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="shortcut-chip"
                style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.12)' }}
                onClick={() => onLoginSuccess({
                  id: 'std_demo_014',
                  email: 'aarav.sharma@edulab.edu',
                  identifier: 'PRN2026CS014',
                  name: 'Aarav Sharma',
                  role: 'student',
                  batchName: 'Batch A · C1',
                  status: 'Active',
                })}
              >
                🚀 Direct Student Portal Demo
              </button>
              <button
                type="button"
                className="shortcut-chip"
                style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.12)' }}
                onClick={() => onLoginSuccess({
                  id: 'fac_demo_001',
                  email: 'sunita.deshmukh@edulab.edu',
                  identifier: 'FAC001',
                  name: 'Dr. Sunita Deshmukh',
                  role: 'faculty',
                  batchName: 'Batch A (DSA)',
                  status: 'Active',
                })}
              >
                ⚡ Direct Faculty Portal Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

