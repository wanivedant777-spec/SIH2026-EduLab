import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Lock, ArrowRight, School, LockKeyhole } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    const cleanId = identifier.trim().toUpperCase();

    if (!cleanId || !password) {
      setErrorMsg('Please enter your Institutional ID and password.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_EVALUATION_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || 'Unable to sign in with these credentials.');
      if (!payload.session?.access_token || !payload.profile) {
        throw new Error('Authentication response was incomplete. Please contact the administrator.');
      }

      await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });
      onLoginSuccess(payload.profile);
    } catch (error) {
      setErrorMsg(error.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-backdrop" />
      <main className="login-card">
        <div className="login-header">
          <div className="login-badge"><School size={16} /><span>EduLab</span></div>
          <h1 className="login-title">Practical Lab Management</h1>
          <p className="login-subtitle">Sign in with your institutional credentials to access your assigned academic workspace.</p>
        </div>

        <div className="security-notice-pill">
          <LockKeyhole size={13} />
          <span>Your access and workspace are determined from institutional records.</span>
        </div>

        {errorMsg && <div className="alert-box alert-error">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="login-form">
          <div className="form-group">
            <label className="form-label">Institutional ID</label>
            <div className="input-wrapper">
              <User size={16} className="input-icon" />
              <input type="text" className="form-input" placeholder="Registration No. or Employee ID"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username" autoFocus required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input type="password" className="form-input" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required />
            </div>
          </div>

          <button type="submit" className="btn-primary-auth" disabled={loading}>
            {loading ? <span className="spinner" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
          </button>
        </form>
      </main>
    </div>
  );
}
