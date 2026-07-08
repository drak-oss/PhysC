import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { machineApi, loadMachineIntoBuilderStore } from '../api/machineApi';
import { useAuth } from '../auth/AuthContext';
import { PhysCLogo } from '../components/PhysCLogo';

export default function GalleryPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [machines, setMachines] = useState([]);
  const [query,    setQuery]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [forkingId, setForkingId] = useState(null);
  const [forkedId,  setForkedId]  = useState(null);

  const fetchMachines = useCallback(async (q) => {
    if (q.trim().length < 2) { setMachines([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      setMachines(await machineApi.search(q.trim()));
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
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.navLogo}>
          <PhysCLogo size={28} />
          <span style={styles.navLogoText}>PhysC</span>
        </Link>
        <div style={styles.navLinks}>
          <Link to="/builder" style={styles.navLink}>Builder</Link>
          {isAuthenticated ? (
            <>
              <Link to="/account" style={styles.navLink}>{user?.username}</Link>
              <button onClick={logout} style={styles.navBtn}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login"  style={styles.navLink}>Sign In</Link>
              <Link to="/signup" style={{ ...styles.navBtn, textDecoration: 'none', display: 'inline-block', lineHeight: '1' }}>Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Public Gallery</h1>
        <p style={styles.heroSub}>Explore, open, and fork machines built by the community</p>
        <div style={styles.searchWrap}>
          <input
            style={styles.searchInput}
            placeholder="Search machines…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.content}>
        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <p style={styles.empty}>Loading…</p>
        ) : query.trim().length < 2 ? (
          <p style={styles.empty}>Type at least 2 characters to search.</p>
        ) : machines.length === 0 ? (
          <p style={styles.empty}>No Machines Found.</p>
        ) : (
          <div style={styles.grid}>
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
    <div style={{ position: 'relative' }} onMouseLeave={() => setHovered(false)}>
      {hovered && (machine.description || machine.name) && (
        <div style={styles.tooltip}>
          <div style={styles.tooltipName}>{machine.name}</div>
          {machine.description && <div style={styles.tooltipDesc}>{machine.description}</div>}
          <div style={styles.tooltipMeta}>by {machine.ownerUsername}</div>
        </div>
      )}
    <div style={styles.card}>
      <div style={styles.thumb} onClick={() => onOpen(machine)} onMouseEnter={() => setHovered(true)}>
        {machine.thumbnail
          ? <img src={machine.thumbnail} alt={machine.name} style={styles.thumbImg} />
          : <div style={styles.thumbPlaceholder}>No preview</div>
        }
      </div>
      <div style={styles.cardBody}>
        <div style={styles.cardName} onMouseEnter={() => setHovered(true)}>{machine.name}</div>
        {machine.description && (
          <div style={styles.cardDesc} onMouseEnter={() => setHovered(true)}>{machine.description}</div>
        )}
        <div style={styles.cardMeta} onMouseEnter={() => setHovered(true)}>
          by <span style={styles.cardOwner}>{machine.ownerUsername}</span>
          {machine.forkedFromId && <span style={styles.cardForked}> · forked</span>}
        </div>
        <div style={styles.cardActions} onMouseEnter={e => { e.stopPropagation(); setHovered(false); }}>
          <button style={styles.btnOpen} onClick={() => onOpen(machine)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Open
          </button>
          <button
            style={{ ...styles.btnFork, opacity: forking ? 0.6 : 1, ...(forked ? { background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.4)', color: '#4ade80' } : {}) }}
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

const styles = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff' },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 32px', borderBottom: '1px solid #1e1e1e',
    position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10,
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' },
  navLogoText: { fontSize: '18px', fontWeight: 700, color: '#fff' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '20px' },
  navLink: { color: '#888', textDecoration: 'none', fontSize: '14px' },
  navBtn: {
    background: '#7c3aed', border: 'none', borderRadius: '6px',
    color: '#fff', fontSize: '13px', fontWeight: 600,
    padding: '7px 14px', cursor: 'pointer',
  },
  hero: {
    textAlign: 'center', padding: '60px 24px 40px',
  },
  heroTitle: { fontSize: '36px', fontWeight: 800, color: '#fff', margin: '0 0 10px' },
  heroSub: { fontSize: '15px', color: '#666', margin: '0 0 32px' },
  searchWrap: { display: 'flex', justifyContent: 'center' },
  searchInput: {
    width: '100%', maxWidth: '480px',
    background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px',
    color: '#fff', fontSize: '14px', padding: '12px 16px', outline: 'none',
  },
  content: { maxWidth: '1200px', margin: '0 auto', padding: '0 24px 60px' },
  error: { color: '#f87171', textAlign: 'center', padding: '20px' },
  empty: { color: '#555', textAlign: 'center', padding: '60px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#141414', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden',
  },
  thumb: { height: '160px', background: '#0d0d0d', cursor: 'pointer', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbPlaceholder: {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#333', fontSize: '13px',
  },
  cardBody: { padding: '16px' },
  cardName: { fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' },
  cardDesc: { fontSize: '13px', color: '#666', marginBottom: '8px', lineHeight: '1.4' },
  cardMeta: { fontSize: '12px', color: '#555', marginBottom: '12px' },
  cardOwner: { color: '#7c6aad' },
  cardForked: { color: '#555' },
  cardActions: { display: 'flex', gap: '8px' },
  tooltip: {
    position: 'absolute', inset: 0, borderRadius: '12px',
    background: 'rgba(167,139,250,0.08)',
    backdropFilter: 'blur(18px) brightness(0.55)',
    WebkitBackdropFilter: 'blur(18px) brightness(0.55)',
    border: '1px solid rgba(167,139,250,0.22)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
    padding: '16px', zIndex: 10, pointerEvents: 'none',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
  },
  tooltipName: { fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '6px' },
  tooltipDesc: { fontSize: '13px', color: 'rgba(220,210,255,0.92)', lineHeight: '1.6', marginBottom: '10px' },
  tooltipMeta: { fontSize: '11px', color: 'rgba(167,139,250,0.7)' },
  btnOpen: {
    flex: 1, background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: '6px',
    color: '#ccc', fontSize: '13px', padding: '8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  },
  btnFork: {
    flex: 1, background: '#2d1f5e', border: '1px solid #4c3a8a', borderRadius: '6px',
    color: '#a78bfa', fontSize: '13px', padding: '8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  },
};
