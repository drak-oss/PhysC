import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { PhysCLogo } from '../components/PhysCLogo';

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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <PhysCLogo size={36} />
          <span style={styles.logoText}>PhysC</span>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              style={styles.input}
            />
          </label>

          <button type="submit" disabled={busy} style={styles.btn}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#141414',
    border: '1px solid #252525',
    borderRadius: '16px',
    padding: '40px',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.02em',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 28px',
  },
  errorBox: {
    background: '#2a1010',
    border: '1px solid #5c1c1c',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '13px',
    padding: '10px 14px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#aaa',
  },
  input: {
    background: '#1e1e1e',
    border: '1px solid #2e2e2e',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    padding: '10px 12px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  btn: {
    marginTop: '8px',
    background: '#7c3aed',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    padding: '12px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  footer: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#666',
    marginTop: '24px',
    marginBottom: 0,
  },
  link: {
    color: '#a78bfa',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
