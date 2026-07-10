import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { PhysCLogo } from '../components/PhysCLogo';
import './LoginPage.css';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [form,  setForm]  = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token, user } = await authApi.login(form);
      login(token, user);
      navigate('/builder', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error ?? 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lp-page">
      <div className="lp-card">
        <div className="lp-logo-wrap">
          <PhysCLogo size={36} />
          <span className="lp-logo-text">PhysC</span>
        </div>

        <h1 className="lp-title">Welcome back</h1>
        <p className="lp-subtitle">Sign in to your account</p>

        {error && <div className="lp-error">{error}</div>}

        <form onSubmit={handleSubmit} className="lp-form">
          <label className="lp-label">
            Username
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
              className="lp-input"
            />
          </label>

          <label className="lp-label">
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              className="lp-input"
            />
          </label>

          <button type="submit" disabled={busy} className="lp-btn">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="lp-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="lp-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
