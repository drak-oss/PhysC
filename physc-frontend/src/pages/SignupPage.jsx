import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { PhysCLogo } from '../components/PhysCLogo';
import './SignupPage.css';

export default function SignupPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [form,  setForm]  = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const { token, user } = await authApi.signup(form);
      login(token, user);
      navigate('/builder', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error ?? 'Signup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sp-page">
      <div className="sp-card">
        <div className="sp-logo-wrap">
          <PhysCLogo size={36} />
          <span className="sp-logo-text">PhysC</span>
        </div>

        <h1 className="sp-title">Create account</h1>
        <p className="sp-subtitle">Start building physics machines</p>

        {error && <div className="sp-error">{error}</div>}

        <form onSubmit={handleSubmit} className="sp-form">
          <label className="sp-label">
            Username
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              minLength={3}
              maxLength={50}
              required
              className="sp-input"
            />
          </label>

          <label className="sp-label">
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
              className="sp-input"
            />
          </label>

          <label className="sp-label">
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
              className="sp-input"
            />
            <span className="sp-hint">Minimum 8 characters</span>
          </label>

          <button type="submit" disabled={busy} className="sp-btn">
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="sp-footer">
          Already have an account?{' '}
          <Link to="/login" className="sp-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
