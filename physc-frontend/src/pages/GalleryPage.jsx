import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { machineApi, loadMachineIntoBuilderStore } from '../api/machineApi';
import { useAuth } from '../auth/AuthContext';
import { PhysCLogo } from '../components/PhysCLogo';
import './GalleryPage.css';

export default function GalleryPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [machines,  setMachines]  = useState([]);
  const [query,     setQuery]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [forkingId, setForkingId] = useState(null);
  const [forkedId,  setForkedId]  = useState(null);

  const fetchMachines = useCallback(async (q) => {
    setLoading(true);
    setError('');
    try {
      if (q.trim().length >= 2) {
        setMachines(await machineApi.search(q.trim()));
      } else {
        setMachines(await machineApi.listPublic());
      }
    } catch {
      setError('Failed to load machines.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => fetchMachines(query), 350);
    return () => clearTimeout(id);
  }, [query, fetchMachines]);

  const handleOpen = async (machine) => {
    try {
      const full = await machineApi.get(machine.id);
      loadMachineIntoBuilderStore(full);
      navigate('/builder');
    } catch { /* ignore */ }
  };

  const handleFork = async (machine) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setForkingId(machine.id);
    try {
      await machineApi.fork(machine.id);
      setForkedId(machine.id);
    } catch { /* ignore */ }
    finally { setForkingId(null); }
  };

  return (
    <div className="gp-page">
      <nav className="gp-nav">
        <Link to="/" className="gp-nav-logo">
          <PhysCLogo size={28} />
          <span className="gp-nav-logo-text">PhysC</span>
        </Link>
        <div className="gp-nav-links">
          <Link to="/builder" className="gp-nav-link">Builder</Link>
          {isAuthenticated ? (
            <>
              <Link to="/account" className="gp-nav-link">{user?.username}</Link>
              <button onClick={logout} className="gp-nav-btn">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login"  className="gp-nav-link">Sign In</Link>
              <Link to="/signup" className="gp-nav-btn">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      <div className="gp-hero">
        <h1 className="gp-hero-title">Public Gallery</h1>
        <p className="gp-hero-sub">Explore, open, and fork machines built by the community</p>
        <div className="gp-search-wrap">
          <input
            className="gp-search-input"
            placeholder="Search machines…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="gp-content">
        {error && <p className="gp-error">{error}</p>}

        {loading ? (
          <p className="gp-empty">Loading…</p>
        ) : machines.length === 0 ? (
          <p className="gp-empty">No Machines Found.</p>
        ) : (
          <div className="gp-grid">
            {machines.map(m => (
              <MachineCard
                key={m.id}
                machine={m}
                isAuthenticated={isAuthenticated}
                forking={forkingId === m.id}
                forked={forkedId === m.id}
                onOpen={handleOpen}
                onFork={handleFork}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MachineCard({ machine, isAuthenticated, forking, forked, onOpen, onFork }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="gp-card-wrap">
      {hovered && (machine.description || machine.name) && (
        <div className="gp-tooltip">
          <div className="gp-tooltip-name">{machine.name}</div>
          {machine.description && <div className="gp-tooltip-desc">{machine.description}</div>}
          <div className="gp-tooltip-meta">by {machine.ownerUsername}</div>
        </div>
      )}
      <div className={`gp-card${hovered ? ' gp-card--hovered' : ''}`}>
        <div className="gp-thumb" onClick={() => onOpen(machine)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          {machine.thumbnail
            ? <img src={machine.thumbnail} alt={machine.name} className="gp-thumb-img" />
            : <div className="gp-thumb-placeholder">No preview</div>
          }
        </div>
        <div className="gp-card-body">
          <div className="gp-card-name">{machine.name}</div>
          {machine.description && (
            <div className="gp-card-desc">{machine.description}</div>
          )}
          <div className="gp-card-meta">
            by <span className="gp-card-owner">{machine.ownerUsername}</span>
            {machine.forkedFromId && <span className="gp-card-forked"> · forked</span>}
          </div>
          <div className="gp-card-actions">
            <button className="gp-btn-open" onClick={() => onOpen(machine)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Open
            </button>
            <button
              className={`gp-btn-fork${forking ? ' gp-btn-fork--forking' : ''}${forked ? ' gp-btn-fork--forked' : ''}`}
              onClick={() => onFork(machine)}
              disabled={forking || forked}
            >
              {forking ? 'Forking…' : forked ? '✓ Forked' : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
                  </svg>
                  {isAuthenticated ? 'Fork' : 'Fork (sign in)'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
