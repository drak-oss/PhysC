import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { userApi } from '../api/userApi';
import { machineApi, loadMachineIntoStore, loadMachineIntoBuilderStore } from '../api/machineApi';
import { useAuth } from '../auth/AuthContext';
import { PhysCLogo } from '../components/PhysCLogo';

/* ─── Main component ─────────────────────────────────────── */
export default function AccountPage() {
  const { username: profileUsername } = useParams();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const isOwnAccount = !profileUsername;

  return (
    <div style={s.page}>
      <Nav currentUser={currentUser} logout={logout} navigate={navigate} />
      <UserSearch navigate={navigate} currentUsername={currentUser?.username} />
      {isOwnAccount
        ? <OwnAccountView currentUser={currentUser} logout={logout} navigate={navigate} />
        : <PublicProfileView username={profileUsername} currentUser={currentUser} navigate={navigate} />
      }
    </div>
  );
}

/* ─── Nav ────────────────────────────────────────────────── */
function Nav({ currentUser, logout, navigate }) {
  return (
    <nav style={s.nav}>
      <Link to="/" style={s.navLogo}>
        <PhysCLogo size={28} />
        <span style={s.navLogoText}>PhysC</span>
      </Link>
      <div style={s.navLinks}>
        <Link to="/gallery" style={s.navLink}>Gallery</Link>
        <Link to="/builder" style={s.navLink}>Builder</Link>
        {currentUser ? (
          <>
            <Link to="/account" style={{ ...s.navLink, color: '#a78bfa' }}>{currentUser.username}</Link>
            <button onClick={() => { logout(); navigate('/'); }} style={s.navBtnOutline}>Sign Out</button>
          </>
        ) : (
          <Link to="/login" style={s.navLink}>Sign In</Link>
        )}
      </div>
    </nav>
  );
}

/* ─── User search ─────────────────────────────────────────── */
function UserSearch({ navigate, currentUsername }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await userApi.searchUsers(query.trim());
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const goToUser = (username) => {
    setQuery('');
    setOpen(false);
    if (username === currentUsername) navigate('/account');
    else navigate(`/account/${username}`);
  };

  return (
    <div style={s.searchWrap} ref={ref}>
      <div style={s.searchBar}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          style={s.searchInput}
          placeholder="Search users…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <span style={{ fontSize: 11, color: '#555' }}>…</span>}
      </div>
      {open && results.length > 0 && (
        <div style={s.dropdown}>
          {results.map(u => (
            <button key={u.username} style={s.dropdownItem} onClick={() => goToUser(u.username)}>
              <span style={s.dropdownAvatar}>{u.username[0].toUpperCase()}</span>
              <span style={s.dropdownName}>{u.username}</span>
              <span style={s.dropdownMeta}>{u.publicMachineCount} public machine{u.publicMachineCount !== 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div style={s.dropdown}>
          <div style={{ padding: '12px 16px', color: '#555', fontSize: 13 }}>No users found</div>
        </div>
      )}
    </div>
  );
}

/* ─── Own account view ────────────────────────────────────── */
function OwnAccountView({ currentUser, logout, navigate }) {
  const [profileForm, setProfileForm] = useState({ username: currentUser?.username ?? '', email: currentUser?.email ?? '' });
  const [profileMsg, setProfileMsg] = useState({ text: '', ok: true });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({ text: '', ok: true });

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [busy, setBusy] = useState(false);

  const loadMachines = useCallback(async () => {
    setMachinesLoading(true);
    try { setMachines(await machineApi.listMy()); }
    catch { /* silent */ }
    finally { setMachinesLoading(false); }
  }, []);

  useEffect(() => { loadMachines(); }, [loadMachines]);

  const handleProfileSave = async e => {
    e.preventDefault();
    setBusy(true);
    setProfileMsg({ text: '', ok: true });
    try {
      await userApi.updateProfile(profileForm);
      setProfileMsg({ text: 'Profile updated.', ok: true });
    } catch (err) {
      setProfileMsg({ text: err.response?.data?.error ?? 'Update failed.', ok: false });
    } finally { setBusy(false); }
  };

  const handlePasswordSave = async e => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setPwMsg({ text: 'Passwords do not match.', ok: false }); return; }
    setBusy(true);
    setPwMsg({ text: '', ok: true });
    try {
      await userApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg({ text: 'Password changed.', ok: true });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwMsg({ text: err.response?.data?.error ?? 'Failed to change password.', ok: false });
    } finally { setBusy(false); }
  };

  const handleDeleteAccount = async () => {
    setBusy(true);
    setDeleteError('');
    try {
      await userApi.deleteAccount({ password: deletePassword });
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.error ?? 'Failed to delete account.');
      setBusy(false);
    }
  };

  const handleTogglePublic = async (machine) => {
    const optimistic = { ...machine, isPublic: !machine.isPublic };
    setMachines(ms => ms.map(m => m.id === machine.id ? optimistic : m));
    try {
      const full = await machineApi.get(machine.id);
      await machineApi.updateMeta(machine.id, full, { isPublic: !machine.isPublic });
    } catch {
      setMachines(ms => ms.map(m => m.id === machine.id ? machine : m));
    }
  };

  const handleSaveMeta = async (id, name, description) => {
    const full = await machineApi.get(id);
    const updated = await machineApi.updateMeta(id, full, { name, description });
    setMachines(ms => ms.map(m => m.id === id ? { ...m, name: updated.name, description: updated.description } : m));
  };

  const handleDeleteMachine = async (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await machineApi.delete(id);
      setMachines(ms => ms.filter(m => m.id !== id));
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  };

  const handleOpenSim = async (machine) => {
    try { const full = await machineApi.get(machine.id); loadMachineIntoStore(full); navigate('/simulator'); }
    catch { /* ignore */ }
  };
  const handleOpenBuilder = async (machine) => {
    try { const full = await machineApi.get(machine.id); loadMachineIntoBuilderStore(full); navigate('/builder'); }
    catch { /* ignore */ }
  };

  return (
    <div style={s.content}>
      <div style={s.pageHeader}>
        <div style={s.avatarLg}>{currentUser?.username?.[0]?.toUpperCase()}</div>
        <div>
          <h1 style={s.pageTitle}>{currentUser?.username}</h1>
          <p style={s.pageSub}>{currentUser?.email}</p>
        </div>
      </div>

      <div style={s.twoCol}>
        {/* Profile */}
        <Section title="Profile">
          <form onSubmit={handleProfileSave} style={s.form}>
            <Field label="Username">
              <input style={s.input} value={profileForm.username}
                onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                minLength={3} maxLength={50} required />
            </Field>
            <Field label="Email">
              <input style={s.input} type="email" value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} required />
            </Field>
            {profileMsg.text && <span style={profileMsg.ok ? s.ok : s.err}>{profileMsg.text}</span>}
            <button type="submit" disabled={busy} style={s.btnPrimary}>Save Changes</button>
          </form>
        </Section>

        {/* Change password */}
        <Section title="Change Password">
          <form onSubmit={handlePasswordSave} style={s.form}>
            <Field label="Current Password">
              <input style={s.input} type="password" value={pwForm.currentPassword}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
            </Field>
            <Field label="New Password">
              <input style={s.input} type="password" value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                minLength={8} required />
            </Field>
            <Field label="Confirm New Password">
              <input style={s.input} type="password" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
            </Field>
            {pwMsg.text && <span style={pwMsg.ok ? s.ok : s.err}>{pwMsg.text}</span>}
            <button type="submit" disabled={busy} style={s.btnPrimary}>Change Password</button>
          </form>
        </Section>
      </div>

      {/* My machines */}
      <Section title="Machine Gallery" action={
        <button style={s.btnSecondary} onClick={() => navigate('/builder')}>+ New Machine</button>
      }>
        {machinesLoading ? (
          <p style={s.empty}>Loading Machines…</p>
        ) : machines.length === 0 ? (
          <p style={s.empty}>No Machines Yet. <button style={s.inlineLink} onClick={() => navigate('/builder')}>Build One!</button></p>
        ) : (
          <div style={s.grid}>
            {machines.map(m => (
              <OwnMachineCard
                key={m.id}
                machine={m}
                confirming={confirmDeleteId === m.id}
                deleting={deletingId === m.id}
                onOpenBuilder={() => handleOpenBuilder(m)}
                onTogglePublic={() => handleTogglePublic(m)}
                onDelete={() => handleDeleteMachine(m.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onSaveMeta={handleSaveMeta}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Danger zone */}
      <div style={s.dangerZone}>
        <div style={s.dangerRow}>
          <div>
            <span style={s.dangerLabel}>Delete Account</span>
            <span style={s.dangerHint}>Permanently removes your account and all machines.</span>
          </div>
          {!showDelete
            ? <button style={s.btnDangerSm} onClick={() => setShowDelete(true)}>Delete</button>
            : <button style={s.btnSecondary} onClick={() => { setShowDelete(false); setDeleteError(''); }}>Cancel</button>
          }
        </div>
        {showDelete && (
          <div style={s.dangerExpand}>
            <input
              style={{ ...s.input, flex: 1, fontSize: 13, padding: '8px 10px' }}
              type="password" value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              placeholder="Enter your password to confirm"
            />
            <button
              style={{ ...s.btnDangerSm, whiteSpace: 'nowrap' }}
              disabled={busy || !deletePassword}
              onClick={handleDeleteAccount}
            >
              {busy ? 'Deleting…' : 'Confirm delete'}
            </button>
            {deleteError && <span style={{ ...s.err, gridColumn: '1 / -1' }}>{deleteError}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Own machine card ───────────────────────────────────── */
function OwnMachineCard({ machine, confirming, deleting, onOpenBuilder, onTogglePublic, onDelete, onCancelDelete, onSaveMeta }) {
  const [editing, setEditing]   = useState(false);
  const [editName, setEditName] = useState(machine.name);
  const [editDesc, setEditDesc] = useState(machine.description ?? '');
  const [saving, setSaving]     = useState(false);
  const [hovered, setHovered]   = useState(false);

  const startEdit = () => { setEditName(machine.name); setEditDesc(machine.description ?? ''); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try { await onSaveMeta(machine.id, editName.trim(), editDesc.trim()); setEditing(false); }
    catch { /* silent */ }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'relative' }} onMouseLeave={() => setHovered(false)}>
      {hovered && machine.description && (
        <div style={s.tooltip}>
          <div style={s.tooltipName}>{machine.name}</div>
          <div style={s.tooltipDesc}>{machine.description}</div>
        </div>
      )}
    <div style={s.card}>
      <div style={s.thumb} onClick={onOpenBuilder} onMouseEnter={() => setHovered(true)}>
        {machine.thumbnail
          ? <img src={machine.thumbnail} alt={machine.name} style={s.thumbImg} />
          : <div style={s.thumbPlaceholder}>No preview</div>}
      </div>
      <div style={s.cardBody}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <input
              value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="Machine name" maxLength={60} autoFocus
              style={{ ...s.input, fontSize: 12, padding: '5px 8px' }}
            />
            <input
              value={editDesc} onChange={e => setEditDesc(e.target.value)}
              placeholder="Description (optional)" maxLength={200}
              style={{ ...s.input, fontSize: 12, padding: '5px 8px' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleSave} disabled={saving || !editName.trim()}
                style={{ ...s.btnSm, flex: 1, background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }}
              >{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={cancelEdit} style={{ ...s.btnSm, flex: 1 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }} onMouseEnter={() => setHovered(true)}>
              <div style={s.cardName}>{machine.name}</div>
              <span style={{ ...s.badge, ...(machine.isPublic ? s.badgePublic : s.badgePrivate) }}>
                {machine.isPublic ? 'public' : 'private'}
              </span>
            </div>
            {machine.description && <div style={s.cardDesc} onMouseEnter={() => setHovered(true)}>{machine.description}</div>}
            <div style={s.cardDate} onMouseEnter={() => setHovered(true)}>{fmtDate(machine.createdAt)}</div>
          </>
        )}
        <div style={s.cardActionGrid} onMouseEnter={e => { e.stopPropagation(); setHovered(false); }}>
          <button style={s.btnSm} onClick={onOpenBuilder} title="Open in Builder">▶ Simulate</button>
          <button style={s.btnSm} onClick={startEdit} title="Edit name & description">✏ Edit</button>
          <button
            style={{ ...s.btnSm, color: machine.isPublic ? '#f59e0b' : '#4ade80' }}
            onClick={onTogglePublic}
            title={machine.isPublic ? 'Make private' : 'Make public'}
          >
            {machine.isPublic ? 'Make Private' : 'Make Public'}
          </button>
          {confirming ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ ...s.btnSm, flex: 1, color: '#f87171', borderColor: '#7f1d1d' }} onClick={onDelete} disabled={deleting}>
                {deleting ? '…' : 'Confirm'}
              </button>
              <button style={{ ...s.btnSm, flex: 1 }} onClick={onCancelDelete}>✕</button>
            </div>
          ) : (
            <button style={{ ...s.btnSm, color: '#f87171' }} onClick={onDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : '🗑 Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

/* ─── Public profile view ────────────────────────────────── */
function PublicProfileView({ username, currentUser, navigate }) {
  const [profile, setProfile] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forkingId, setForkingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      userApi.getUserProfile(username),
      machineApi.listByUser(username),
    ]).then(([prof, macs]) => {
      if (!cancelled) { setProfile(prof); setMachines(macs); }
    }).catch(() => {
      if (!cancelled) setError('User not found.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [username]);

  const [forkedId, setForkedId] = useState(null);

  const handleOpen = async (machine) => {
    try {
      const full = await machineApi.get(machine.id);
      loadMachineIntoBuilderStore(full);
      navigate('/builder');
    } catch { /* ignore */ }
  };

  const handleFork = async (machine) => {
    if (!currentUser) { navigate('/login'); return; }
    setForkingId(machine.id);
    try {
      await machineApi.fork(machine.id);
      setForkedId(machine.id);
    } catch { /* ignore */ }
    finally { setForkingId(null); }
  };

  if (loading) return <div style={s.content}><p style={s.empty}>Loading Profile…</p></div>;
  if (error)   return <div style={s.content}><p style={{ ...s.empty, color: '#f87171' }}>{error}</p></div>;

  return (
    <div style={s.content}>
      {currentUser && (
        <button style={s.backBtn} onClick={() => navigate('/account')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back To Account
        </button>
      )}

      <div style={s.pageHeader}>
        <div style={s.avatarLg}>{username[0].toUpperCase()}</div>
        <div>
          <h1 style={s.pageTitle}>{username}</h1>
          <p style={s.pageSub}>
            {(() => {
              const count = profile?.publicMachineCount ?? machines.length;
              return `Created ${fmtDate(profile?.createdAt)} · ${count === 0 ? 'no public machines' : `${count} public machine${count !== 1 ? 's' : ''}` }`;
            })()}
          </p>
        </div>
      </div>

      <Section title="Public Machines">
        {machines.length === 0 ? (
          <p style={s.empty}>No Public Machines.</p>
        ) : (
          <div style={s.grid}>
            {machines.map(m => (
              <PublicMachineCard
                key={m.id}
                machine={m}
                isAuthenticated={!!currentUser}
                forking={forkingId === m.id}
                forked={forkedId === m.id}
                onOpen={() => handleOpen(m)}
                onFork={() => handleFork(m)}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─── Public machine card ────────────────────────────────── */
function PublicMachineCard({ machine, isAuthenticated, forking, forked, onOpen, onFork }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative' }} onMouseLeave={() => setHovered(false)}>
      {hovered && machine.description && (
        <div style={s.tooltip}>
          <div style={s.tooltipName}>{machine.name}</div>
          <div style={s.tooltipDesc}>{machine.description}</div>
        </div>
      )}
    <div style={s.card}>
      <div style={s.thumb} onClick={onOpen} onMouseEnter={() => setHovered(true)}>
        {machine.thumbnail
          ? <img src={machine.thumbnail} alt={machine.name} style={s.thumbImg} />
          : <div style={s.thumbPlaceholder}>No preview</div>}
      </div>
      <div style={s.cardBody}>
        <div style={s.cardName} onMouseEnter={() => setHovered(true)}>{machine.name}</div>
        {machine.description && <div style={s.cardDesc} onMouseEnter={() => setHovered(true)}>{machine.description}</div>}
        <div style={s.cardDate} onMouseEnter={() => setHovered(true)}>{fmtDate(machine.createdAt)}</div>
        <div style={s.cardActionGrid} onMouseEnter={e => { e.stopPropagation(); setHovered(false); }}>
          <button style={{ ...s.btnSm, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }} onClick={onOpen}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Open
          </button>
          <button
            style={{ ...s.btnSm, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', color: forked ? '#4ade80' : '#a78bfa', borderColor: forked ? 'rgba(74,222,128,0.4)' : '#4c3a8a', opacity: forking ? 0.6 : 1 }}
            onClick={onFork}
            disabled={forking || forked}
          >
            {forking ? 'Forking…' : forked ? '✓ Forked' : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
                </svg>
                Fork
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

/* ─── Shared helpers ─────────────────────────────────────── */
function Section({ title, children, danger, action }) {
  return (
    <div style={{ ...s.section, ...(danger ? s.sectionDanger : {}) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ ...s.sectionTitle, ...(danger ? { color: '#f87171' } : {}) }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={s.label}>
      {label}
      {children}
    </label>
  );
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = {
  /* position:fixed + overflow-y:auto creates an independent scroll viewport,
     bypassing the global `body { overflow: hidden }` set for the builder/simulator */
  page:       { position: 'fixed', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: '#0a0a0a', color: '#fff' },

  nav:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid #1e1e1e', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 },
  navLogo:    { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  navLogoText:{ fontSize: 18, fontWeight: 700, color: '#fff' },
  navLinks:   { display: 'flex', alignItems: 'center', gap: 20 },
  navLink:    { color: '#888', textDecoration: 'none', fontSize: 14 },
  navBtnOutline: { background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#888', fontSize: 13, padding: '7px 14px', cursor: 'pointer' },

  searchWrap: { position: 'relative', maxWidth: 480, margin: '0 auto', padding: '20px 24px 0' },
  searchBar:  { display: 'flex', alignItems: 'center', gap: 10, background: '#141414', border: '1px solid #222', borderRadius: 10, padding: '10px 14px' },
  searchInput:{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14 },
  dropdown:   { position: 'absolute', top: '100%', left: 24, right: 24, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, marginTop: 4, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' },
  dropdownItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left' },
  dropdownAvatar: { width: 28, height: 28, borderRadius: '50%', background: '#2d1f5e', border: '1px solid #4c3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a78bfa', flexShrink: 0 },
  dropdownName: { fontSize: 14, fontWeight: 600, flex: 1 },
  dropdownMeta: { fontSize: 12, color: '#555' },

  content:    { maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' },
  pageHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 },
  avatarLg:   { width: 56, height: 56, borderRadius: '50%', background: '#2d1f5e', border: '2px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#a78bfa', flexShrink: 0 },
  pageTitle:  { fontSize: 26, fontWeight: 700, margin: 0 },
  pageSub:    { color: '#555', fontSize: 14, margin: '4px 0 0' },
  backLink:   { background: 'transparent', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: '0 0 20px', display: 'block' },
  backBtn:    { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8, color: '#a78bfa', fontSize: 13, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', marginBottom: 24 },

  twoCol:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 },

  section:    { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 16, overflow: 'hidden' },
  sectionDanger: { borderColor: '#4a1c1c' },
  sectionTitle:  { fontSize: 15, fontWeight: 600, margin: 0, color: '#ccc' },

  form:       { display: 'flex', flexDirection: 'column', gap: 16 },
  label:      { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#888' },
  input:      { background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 8, color: '#fff', fontSize: 14, padding: '10px 12px', outline: 'none' },
  ok:         { fontSize: 13, color: '#4ade80' },
  err:        { fontSize: 13, color: '#f87171' },
  empty:      { color: '#555', textAlign: 'center', padding: '24px 0', fontSize: 14 },
  inlineLink: { background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 14, padding: 0 },

  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  card:       { background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' },
  thumb:      { height: 130, background: '#080808', cursor: 'pointer', overflow: 'hidden' },
  thumbImg:   { width: '100%', height: '100%', objectFit: 'cover' },
  thumbPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2a2a', fontSize: 12 },
  cardBody:   { padding: 12 },
  cardName:   { fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardDesc:   { fontSize: 12, color: '#555', marginTop: 2, marginBottom: 4, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'normal' },
  cardDate:   { fontSize: 11, color: '#333', marginTop: 2, marginBottom: 8 },
  cardActions:     { display: 'flex', gap: 4, flexWrap: 'wrap' },
  cardActionGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 },
  badge:      { fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  badgePublic:{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' },
  badgePrivate:{ background: 'rgba(100,100,100,0.1)', color: '#555', border: '1px solid #2a2a2a' },
  btnSm:      { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, color: '#888', fontSize: 11, padding: '5px 8px', cursor: 'pointer' },

  dangerZone:   { border: '1px solid #3a1010', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  dangerRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 18px' },
  dangerLabel:  { fontSize: 13, fontWeight: 600, color: '#f87171', display: 'block', marginBottom: 2 },
  dangerHint:   { fontSize: 12, color: '#5a2a2a' },
  dangerExpand: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '0 18px 14px', borderTop: '1px solid #2a1010' },

  btnPrimary:   { alignSelf: 'flex-start', background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 20px', cursor: 'pointer' },
  btnSecondary: { background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 8, color: '#888', fontSize: 13, padding: '7px 12px', cursor: 'pointer' },
  btnDanger:    { background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 600, padding: '10px 16px', cursor: 'pointer' },
  btnDangerSm:  { background: '#2a0808', border: '1px solid #5c1c1c', borderRadius: 6, color: '#f87171', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 },

  deleteBox:  { display: 'flex', flexDirection: 'column', gap: 14 },
  deleteWarn: { fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 },

  tooltip:     { position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(167,139,250,0.08)', backdropFilter: 'blur(18px) brightness(0.55)', WebkitBackdropFilter: 'blur(18px) brightness(0.55)', border: '1px solid rgba(167,139,250,0.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)', padding: '12px', zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  tooltipName: { fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 5 },
  tooltipDesc: { fontSize: 12, color: 'rgba(220,210,255,0.92)', lineHeight: 1.6 },
};
