import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { userApi } from '../api/userApi';
import { machineApi, loadMachineIntoStore, loadMachineIntoBuilderStore } from '../api/machineApi';
import { useAuth } from '../auth/AuthContext';
import { PhysCLogo } from '../components/PhysCLogo';
import './AccountPage.css';

export default function AccountPage() {
  const { username: profileUsername } = useParams();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const isOwnAccount = !profileUsername;

  return (
    <div className="ap-page">
      <Nav currentUser={currentUser} logout={logout} navigate={navigate} />
      <UserSearch navigate={navigate} currentUsername={currentUser?.username} />
      {isOwnAccount
        ? <OwnAccountView currentUser={currentUser} logout={logout} navigate={navigate} />
        : <PublicProfileView username={profileUsername} currentUser={currentUser} navigate={navigate} />
      }
    </div>
  );
}

function Nav({ currentUser, logout, navigate }) {
  return (
    <nav className="ap-nav">
      <Link to="/" className="ap-nav-logo">
        <PhysCLogo size={28} />
        <span className="ap-nav-logo-text">PhysC</span>
      </Link>
      <div className="ap-nav-links">
        <Link to="/gallery" className="ap-nav-link">Gallery</Link>
        <Link to="/builder" className="ap-nav-link">Builder</Link>
        {currentUser ? (
          <>
            <Link to="/account" className="ap-nav-link ap-nav-link--active">{currentUser.username}</Link>
            <button onClick={() => { logout(); navigate('/'); }} className="ap-nav-btn-outline">Sign Out</button>
          </>
        ) : (
          <Link to="/login" className="ap-nav-link">Sign In</Link>
        )}
      </div>
    </nav>
  );
}

function UserSearch({ navigate, currentUsername }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
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
    <div className="ap-search-wrap" ref={ref}>
      <div className="ap-search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="ap-search-input"
          placeholder="Search users…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <span className="ap-search-loading">…</span>}
      </div>
      {open && results.length > 0 && (
        <div className="ap-dropdown">
          {results.map(u => (
            <button key={u.username} className="ap-dropdown-item" onClick={() => goToUser(u.username)}>
              <span className="ap-dropdown-avatar">{u.username[0].toUpperCase()}</span>
              <span className="ap-dropdown-name">{u.username}</span>
              <span className="ap-dropdown-meta">{u.publicMachineCount} public machine{u.publicMachineCount !== 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="ap-dropdown">
          <div className="ap-dropdown-empty">No users found</div>
        </div>
      )}
    </div>
  );
}

function OwnAccountView({ currentUser, logout, navigate }) {
  const [profileForm, setProfileForm] = useState({ username: currentUser?.username ?? '', email: currentUser?.email ?? '' });
  const [profileMsg,  setProfileMsg]  = useState({ text: '', ok: true });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg,  setPwMsg]  = useState({ text: '', ok: true });

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError,    setDeleteError]    = useState('');
  const [showDelete,     setShowDelete]     = useState(false);

  const [machines,        setMachines]        = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [deletingId,      setDeletingId]      = useState(null);
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
    const full    = await machineApi.get(id);
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
    <div className="ap-content">
      <div className="ap-page-header">
        <div className="ap-avatar-lg">{currentUser?.username?.[0]?.toUpperCase()}</div>
        <div>
          <h1 className="ap-page-title">{currentUser?.username}</h1>
          <p className="ap-page-sub">{currentUser?.email}</p>
        </div>
      </div>

      <div className="ap-two-col">
        <Section title="Profile">
          <form onSubmit={handleProfileSave} className="ap-form">
            <Field label="Username">
              <input className="ap-input" value={profileForm.username}
                onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                minLength={3} maxLength={50} required />
            </Field>
            <Field label="Email">
              <input className="ap-input" type="email" value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} required />
            </Field>
            {profileMsg.text && <span className={profileMsg.ok ? 'ap-ok' : 'ap-err'}>{profileMsg.text}</span>}
            <button type="submit" disabled={busy} className="ap-btn-primary">Save Changes</button>
          </form>
        </Section>

        <Section title="Change Password">
          <form onSubmit={handlePasswordSave} className="ap-form">
            <Field label="Current Password">
              <input className="ap-input" type="password" value={pwForm.currentPassword}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
            </Field>
            <Field label="New Password">
              <input className="ap-input" type="password" value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                minLength={8} required />
            </Field>
            <Field label="Confirm New Password">
              <input className="ap-input" type="password" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
            </Field>
            {pwMsg.text && <span className={pwMsg.ok ? 'ap-ok' : 'ap-err'}>{pwMsg.text}</span>}
            <button type="submit" disabled={busy} className="ap-btn-primary">Change Password</button>
          </form>
        </Section>
      </div>

      <Section title="Machine Gallery" action={
        <button className="ap-btn-secondary" onClick={() => navigate('/builder')}>+ New Machine</button>
      }>
        {machinesLoading ? (
          <p className="ap-empty">Loading Machines…</p>
        ) : machines.length === 0 ? (
          <p className="ap-empty">No Machines Yet. <button className="ap-inline-link" onClick={() => navigate('/builder')}>Build One!</button></p>
        ) : (
          <div className="ap-grid">
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

      <div className="ap-danger-zone">
        <div className="ap-danger-row">
          <div>
            <span className="ap-danger-label">Delete Account</span>
            <span className="ap-danger-hint">Permanently removes your account and all machines.</span>
          </div>
          {!showDelete
            ? <button className="ap-btn-danger-sm" onClick={() => setShowDelete(true)}>Delete</button>
            : <button className="ap-btn-secondary" onClick={() => { setShowDelete(false); setDeleteError(''); }}>Cancel</button>
          }
        </div>
        {showDelete && (
          <div className="ap-danger-expand">
            <input
              className="ap-input ap-input--flex"
              type="password" value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              placeholder="Enter your password to confirm"
            />
            <button
              className="ap-btn-danger-sm ap-btn-danger-sm--nowrap"
              disabled={busy || !deletePassword}
              onClick={handleDeleteAccount}
            >
              {busy ? 'Deleting…' : 'Confirm delete'}
            </button>
            {deleteError && <span className="ap-err ap-err--full">{deleteError}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function OwnMachineCard({ machine, confirming, deleting, onOpenBuilder, onTogglePublic, onDelete, onCancelDelete, onSaveMeta }) {
  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState(machine.name);
  const [editDesc, setEditDesc] = useState(machine.description ?? '');
  const [saving,   setSaving]   = useState(false);
  const [hovered,  setHovered]  = useState(false);

  const startEdit  = () => { setEditName(machine.name); setEditDesc(machine.description ?? ''); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try { await onSaveMeta(machine.id, editName.trim(), editDesc.trim()); setEditing(false); }
    catch { /* silent */ }
    finally { setSaving(false); }
  };

  return (
    <div className="ap-card-wrap" onMouseLeave={() => setHovered(false)}>
      {hovered && machine.description && (
        <div className="ap-tooltip">
          <div className="ap-tooltip-name">{machine.name}</div>
          <div className="ap-tooltip-desc">{machine.description}</div>
        </div>
      )}
      <div className="ap-card">
        <div className="ap-thumb" onClick={onOpenBuilder} onMouseEnter={() => setHovered(true)}>
          {machine.thumbnail
            ? <img src={machine.thumbnail} alt={machine.name} className="ap-thumb-img" />
            : <div className="ap-thumb-placeholder">No preview</div>}
        </div>
        <div className="ap-card-body">
          {editing ? (
            <div className="ap-edit-fields">
              <input
                value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Machine name" maxLength={60} autoFocus
                className="ap-input ap-input--sm"
              />
              <input
                value={editDesc} onChange={e => setEditDesc(e.target.value)}
                placeholder="Description (optional)" maxLength={200}
                className="ap-input ap-input--sm"
              />
              <div className="ap-edit-actions">
                <button
                  onClick={handleSave} disabled={saving || !editName.trim()}
                  className="ap-btn-sm ap-btn-sm--flex ap-btn-sm--accent"
                >{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={cancelEdit} className="ap-btn-sm ap-btn-sm--flex">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="ap-card-name-row" onMouseEnter={() => setHovered(true)}>
                <div className="ap-card-name">{machine.name}</div>
                <span className={`ap-badge ${machine.isPublic ? 'ap-badge--public' : 'ap-badge--private'}`}>
                  {machine.isPublic ? 'public' : 'private'}
                </span>
              </div>
              {machine.description && <div className="ap-card-desc" onMouseEnter={() => setHovered(true)}>{machine.description}</div>}
              <div className="ap-card-date" onMouseEnter={() => setHovered(true)}>{fmtDate(machine.createdAt)}</div>
            </>
          )}
          <div className="ap-card-action-grid" onMouseEnter={e => { e.stopPropagation(); setHovered(false); }}>
            <button className="ap-btn-sm" onClick={onOpenBuilder} title="Open in Builder">▶ Simulate</button>
            <button className="ap-btn-sm" onClick={startEdit} title="Edit name & description">✏ Edit</button>
            <button
              className={`ap-btn-sm ${machine.isPublic ? 'ap-btn-sm--amber' : 'ap-btn-sm--green'}`}
              onClick={onTogglePublic}
              title={machine.isPublic ? 'Make private' : 'Make public'}
            >
              {machine.isPublic ? 'Make Private' : 'Make Public'}
            </button>
            {confirming ? (
              <div className="ap-edit-actions">
                <button className="ap-btn-sm ap-btn-sm--flex ap-btn-sm--danger" onClick={onDelete} disabled={deleting}>
                  {deleting ? '…' : 'Confirm'}
                </button>
                <button className="ap-btn-sm ap-btn-sm--flex" onClick={onCancelDelete}>✕</button>
              </div>
            ) : (
              <button className="ap-btn-sm ap-btn-sm--danger" onClick={onDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : '🗑 Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicProfileView({ username, currentUser, navigate }) {
  const [profile,   setProfile]   = useState(null);
  const [machines,  setMachines]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [forkingId, setForkingId] = useState(null);
  const [forkedId,  setForkedId]  = useState(null);

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

  if (loading) return <div className="ap-content"><p className="ap-empty">Loading Profile…</p></div>;
  if (error)   return <div className="ap-content"><p className="ap-empty ap-empty--error">{error}</p></div>;

  return (
    <div className="ap-content">
      {currentUser && (
        <button className="ap-back-btn" onClick={() => navigate('/account')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back To Account
        </button>
      )}

      <div className="ap-page-header">
        <div className="ap-avatar-lg">{username[0].toUpperCase()}</div>
        <div>
          <h1 className="ap-page-title">{username}</h1>
          <p className="ap-page-sub">
            {(() => {
              const count = profile?.publicMachineCount ?? machines.length;
              return `Created ${fmtDate(profile?.createdAt)} · ${count === 0 ? 'no public machines' : `${count} public machine${count !== 1 ? 's' : ''}`}`;
            })()}
          </p>
        </div>
      </div>

      <Section title="Public Machines">
        {machines.length === 0 ? (
          <p className="ap-empty">No Public Machines.</p>
        ) : (
          <div className="ap-grid">
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

function PublicMachineCard({ machine, isAuthenticated, forking, forked, onOpen, onFork }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="ap-card-wrap" onMouseLeave={() => setHovered(false)}>
      {hovered && machine.description && (
        <div className="ap-tooltip">
          <div className="ap-tooltip-name">{machine.name}</div>
          <div className="ap-tooltip-desc">{machine.description}</div>
        </div>
      )}
      <div className="ap-card">
        <div className="ap-thumb" onClick={onOpen} onMouseEnter={() => setHovered(true)}>
          {machine.thumbnail
            ? <img src={machine.thumbnail} alt={machine.name} className="ap-thumb-img" />
            : <div className="ap-thumb-placeholder">No preview</div>}
        </div>
        <div className="ap-card-body">
          <div className="ap-card-name" onMouseEnter={() => setHovered(true)}>{machine.name}</div>
          {machine.description && <div className="ap-card-desc" onMouseEnter={() => setHovered(true)}>{machine.description}</div>}
          <div className="ap-card-date" onMouseEnter={() => setHovered(true)}>{fmtDate(machine.createdAt)}</div>
          <div className="ap-card-action-grid" onMouseEnter={e => { e.stopPropagation(); setHovered(false); }}>
            <button className="ap-btn-sm ap-btn-sm--icon" onClick={onOpen}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Open
            </button>
            <button
              className={`ap-btn-sm ap-btn-sm--icon ap-btn-sm--fork${forked ? ' ap-btn-sm--forked' : ''}${forking ? ' ap-btn-sm--forking' : ''}`}
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

function Section({ title, children, danger, action }) {
  return (
    <div className={`ap-section${danger ? ' ap-section--danger' : ''}`}>
      <div className="ap-section-header">
        <h2 className={`ap-section-title${danger ? ' ap-section-title--danger' : ''}`}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="ap-label">
      {label}
      {children}
    </label>
  );
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
