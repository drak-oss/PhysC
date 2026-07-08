import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuilderStore } from '../builderStore';
import { useEditorStore } from '../../store/editorStore';
import { serializeToSimulator } from '../serializationSystem';
import { getBodyDef } from '../componentRegistry';
import { PhysCLogo } from '../../components/PhysCLogo';
import { bodiesOverlap } from '../../utils/collision';
import { simFormatToBuilderFormat } from '../../utils/sceneConversion';
import { useAuth } from '../../auth/AuthContext';
import { saveFromBuilder } from '../../api/machineApi';

export default function BuilderToolbar() {
  const navigate        = useNavigate();
  const { user }        = useAuth();
  const machineTitle    = useBuilderStore(s => s.machineTitle);
  const setMachineTitle = useBuilderStore(s => s.setMachineTitle);
  const clearScene      = useBuilderStore(s => s.clearScene);
  const bodies          = useBuilderStore(s => s.bodies);
  const constraints     = useBuilderStore(s => s.constraints);
  const [validationErrors, setValidationErrors] = useState([]);
  const [errorKind, setErrorKind] = useState('validation');
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef  = useRef(null);
  const savePanelRef  = useRef(null);

  const [showSavePanel, setShowSavePanel] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '', isPublic: false });
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState({ text: '', ok: true });

  React.useEffect(() => {
    if (!showSavePanel) return;
    const handler = e => { if (savePanelRef.current && !savePanelRef.current.contains(e.target)) setShowSavePanel(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSavePanel]);

  const handleSaveToGallery = async () => {
    if (!saveForm.name.trim()) { setSaveMsg({ text: 'Enter a name.', ok: false }); return; }
    setSaving(true);
    setSaveMsg({ text: '', ok: true });
    try {
      await saveFromBuilder({ name: saveForm.name.trim(), description: saveForm.description, isPublic: saveForm.isPublic });
      setSaveMsg({ text: 'Saved to gallery!', ok: true });
      setTimeout(() => { setShowSavePanel(false); setSaveMsg({ text: '', ok: true }); }, 1400);
    } catch (err) {
      setSaveMsg({ text: err.response?.data?.error ?? err.message ?? 'Save failed.', ok: false });
    } finally { setSaving(false); }
  };

  const handleSave = () => {
    const { machineTitle: title, bodies: b, constraints: c } = useBuilderStore.getState();
    if (b.length === 0) return;
    const json = JSON.stringify({ machineTitle: title, bodies: b, constraints: c }, null, 2);
    const url  = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${title.trim() || 'machine'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw  = JSON.parse(ev.target.result);
        if (!Array.isArray(raw.bodies)) {
          alert('Invalid machine file — missing "bodies" array.');
          return;
        }

        const isSimFormat = raw.bodies.length > 0 && typeof raw.bodies[0].shape === 'string';
        const data = isSimFormat ? simFormatToBuilderFormat(raw) : raw;

        useBuilderStore.getState().restoreScene(data);

        if (data.bodies.length > 0) {
          const xs = data.bodies.map(b => b.x ?? 0);
          const ys = data.bodies.map(b => b.y ?? 0);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
          const canvasW = Math.max(400, window.innerWidth  - 240 - 280);
          const canvasH = Math.max(300, window.innerHeight - 52);
          useBuilderStore.getState().setZoom(1);
          useBuilderStore.getState().setPan(
            Math.round(canvasW / 2 - cx),
            Math.round(canvasH / 2 - cy)
          );
        }
      } catch {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const running    = useEditorStore(s => s.running);
  const setRunning = useEditorStore(s => s.setRunning);

  const canSimulate = machineTitle.trim().length > 0 && bodies.length > 0;

  const handleSimulate = () => {
    if (!machineTitle.trim()) {
      alert('Please enter a machine title before launching the simulation.');
      return;
    }
    if (bodies.length === 0) {
      alert('Add at least one body before simulating.');
      return;
    }

    const collidable = bodies.filter(b => b.type === 'disk' || b.type === 'block');
    const collisionErrors = [];
    for (let i = 0; i < collidable.length; i++) {
      for (let j = i + 1; j < collidable.length; j++) {
        if (bodiesOverlap(collidable[i], collidable[j])) {
          collisionErrors.push(
            `"${collidable[i].name}" and "${collidable[j].name}" are overlapping — resolve all collisions before simulating.`
          );
        }
      }
    }
    if (collisionErrors.length > 0) {
      setValidationErrors(collisionErrors);
      setErrorKind('collision');
      setShowErrors(true);
      return;
    }

    const serialized = serializeToSimulator({ bodies, constraints });
    if (serialized.errors && serialized.errors.length > 0) {
      setValidationErrors(serialized.errors);
      setErrorKind('validation');
      setShowErrors(true);
      return;
    }

    useEditorStore.getState().loadScene({
      bodies: serialized.bodies,
      constraints: serialized.constraints,
      ignorePairs: serialized.ignorePairs || [],
      machineTitle,
    });

    setRunning(true);
    navigate('/simulator');
  };

  return (
    <>
      <header className="editor-header">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PhysCLogo />
          <div className="logo-text">
            <span className="logo-name">PhysC</span>
          </div>
          {user && (
            <button
              onClick={() => navigate('/account')}
              title={`Account: ${user.username}`}
              style={{
                background: 'transparent', border: '1px solid var(--border-mid)',
                color: 'var(--text-muted)', padding: '7px 16px',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'all 0.2s ease', flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>{user.username}</span>
            </button>
          )}

          {/* Save to Gallery */}
          {user && (
            <div style={{ position: 'relative' }} ref={savePanelRef}>
              <button
                onClick={() => { setSaveForm(f => ({ ...f, name: machineTitle })); setShowSavePanel(v => !v); setSaveMsg({ text: '', ok: true }); }}
                style={{
                  background: 'transparent', border: '1px solid var(--border-mid)',
                  color: 'var(--text-muted)', padding: '7px 16px',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                  transition: 'all 0.2s ease', flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>GALLERY</span>
              </button>
              {showSavePanel && <SavePanel saveForm={saveForm} setSaveForm={setSaveForm} saving={saving} saveMsg={saveMsg} onSave={handleSaveToGallery} onClose={() => setShowSavePanel(false)} />}
            </div>
          )}
        </div>

        <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', gap:10, minWidth:0 }}>
          <div style={{ position:'relative' }}>
            <input
              type="text"
              value={machineTitle}
              onChange={e => setMachineTitle(e.target.value)}
              placeholder="Untitled Machine…"
              maxLength={60}
              style={{
                background:    'var(--bg-active)',
                border:        `1px solid ${machineTitle ? 'var(--accent-border)' : 'var(--border-mid)'}`,
                color:         'var(--text-primary)',
                padding:       '6px 38px 6px 16px',
                borderRadius:  'var(--radius)',
                fontSize:      '13px',
                fontWeight:    600,
                width:         '300px',
                outline:       'none',
                fontFamily:    'Inter, sans-serif',
                letterSpacing: '0.2px',
                boxShadow:     machineTitle ? '0 0 0 1px var(--accent-border)' : 'none',
                transition:    'all 0.2s ease',
              }}
            />
            <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:'14px', opacity:0.35, pointerEvents:'none' }}>✏</span>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <span style={{ background:'var(--bg-surface)', border:'1px solid var(--border-mid)', borderRadius:'var(--radius-sm)', padding:'3px 8px', fontSize:'10px', color:'var(--text-muted)', fontWeight:600 }}>
              {bodies.length} bodies
            </span>
            <span style={{ background:'var(--bg-surface)', border:'1px solid var(--border-mid)', borderRadius:'var(--radius-sm)', padding:'3px 8px', fontSize:'10px', color:'var(--text-muted)', fontWeight:600 }}>
              {constraints.length} joints
            </span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display:'none' }}
            onChange={handleLoad}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Load machine from JSON file"
            style={{ background:'transparent', border:'1px solid var(--border-mid)', color:'var(--text-muted)', padding:'7px 10px', borderRadius:'var(--radius-sm)', fontSize:'12px', fontWeight:700, cursor:'pointer', letterSpacing:'0.5px', display:'flex', alignItems:'center', gap:6, transition:'all 0.2s ease' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            LOAD LOCAL
          </button>

          <button
            onClick={handleSave}
            disabled={bodies.length === 0}
            title="Save machine to JSON file"
            style={{ background:'transparent', border:'1px solid var(--border-mid)', color: bodies.length > 0 ? 'var(--text-muted)' : 'var(--text-disabled)', padding:'7px 10px', borderRadius:'var(--radius-sm)', fontSize:'12px', fontWeight:700, cursor: bodies.length > 0 ? 'pointer' : 'not-allowed', letterSpacing:'0.5px', display:'flex', alignItems:'center', gap:6, transition:'all 0.2s ease' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            SAVE LOCAL
          </button>

          <button
            onClick={() => { if (window.confirm('Clear all bodies and constraints?')) clearScene(); }}
            style={{ background:'transparent', border:'1px solid var(--border-mid)', color:'var(--text-muted)', padding:'7px 16px', borderRadius:'var(--radius-sm)', fontSize:'12px', fontWeight:700, cursor:'pointer', letterSpacing:'0.5px', display:'flex', alignItems:'center', gap:7, transition:'all 0.2s ease' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            CLEAR
          </button>

          <button
            onClick={handleSimulate}
            disabled={!canSimulate && !useEditorStore.getState().running}
            style={{
              background:    canSimulate || useEditorStore.getState().running ? 'linear-gradient(135deg, #7c6fef, #a78bfa)' : 'var(--bg-surface)',
              color:         canSimulate || useEditorStore.getState().running ? '#fff' : 'var(--text-disabled)',
              border:        'none',
              padding:       '7px 22px',
              borderRadius:  'var(--radius-sm)',
              fontSize:      '12px',
              fontWeight:    700,
              cursor:        canSimulate ? 'pointer' : 'not-allowed',
              display:       'flex',
              alignItems:    'center',
              gap:           8,
              letterSpacing: '0.5px',
              boxShadow:     canSimulate ? '0 2px 14px rgba(124,111,239,0.45)' : 'none',
              transition:    'all 0.2s ease',
            }}
          >
            {useEditorStore(s => s.running) ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                PAUSE SIMULATION
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                RUN SIMULATION
              </>
            )}
          </button>
        </div>
      </header>

      {showErrors && validationErrors.length > 0 && (
        <div style={{
          position:    'absolute',
          top:         48,
          left:        '50%',
          transform:   'translateX(-50%)',
          zIndex:      999,
          background:  'rgba(30,10,10,0.97)',
          border:      '1px solid rgba(248,113,113,0.4)',
          borderRadius:'var(--radius)',
          padding:     '12px 16px',
          minWidth:    440,
          maxWidth:    600,
          boxShadow:   '0 8px 32px rgba(0,0,0,0.7)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ color:'#f87171', fontWeight:700, fontSize:'12px', letterSpacing:'0.5px' }}>
              {errorKind === 'collision'
                ? '⚠ OVERLAPPING BODIES — RESOLVE COLLISIONS BEFORE SIMULATING'
                : '⚠ SIMULATION LAUNCH BLOCKED — VALIDATION FAILED'}
            </span>
            <button onClick={()=>setShowErrors(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14 }}>✕</button>
          </div>
          {validationErrors.map((err, i) => (
            <div key={i} style={{ fontSize:'11px', color:'#fca5a5', padding:'2px 0', fontFamily:'JetBrains Mono, monospace' }}>
              ✗ {err}
            </div>
          ))}
          <div style={{ marginTop:8, fontSize:'10px', color:'var(--text-muted)' }}>
            {errorKind === 'collision'
              ? 'Move or resize the highlighted bodies so they no longer overlap, then try again.'
              : 'Fix the issues above, then try again.'}
          </div>
        </div>
      )}
    </>
  );
}

function SavePanel({ saveForm, setSaveForm, saving, saveMsg, onSave, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0,
      background: 'var(--bg-surface, #141414)', border: '1px solid var(--border-mid, #2e2e2e)',
      borderRadius: 'var(--radius, 8px)', padding: 16, width: 260, zIndex: 200,
      boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #fff)', marginBottom: 12, letterSpacing: '0.3px' }}>
        Save to Gallery
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-muted, #888)', marginBottom: 10 }}>
        Name
        <input
          autoFocus
          value={saveForm.name}
          onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))}
          style={{ background: 'var(--bg-void, #0a0a0a)', border: '1px solid var(--border-mid, #2e2e2e)', borderRadius: 'var(--radius-sm, 5px)', color: 'var(--text-primary, #fff)', padding: '7px 10px', fontSize: 12, outline: 'none' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-muted, #888)', marginBottom: 12 }}>
        Description
        <input
          value={saveForm.description}
          onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))}
          style={{ background: 'var(--bg-void, #0a0a0a)', border: '1px solid var(--border-mid, #2e2e2e)', borderRadius: 'var(--radius-sm, 5px)', color: 'var(--text-primary, #fff)', padding: '7px 10px', fontSize: 12, outline: 'none' }}
        />
      </label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button onClick={() => setSaveForm(f => ({ ...f, isPublic: false }))} style={{ flex: 1, padding: '5px 0', fontSize: 11, borderRadius: 'var(--radius-sm, 5px)', cursor: 'pointer', background: !saveForm.isPublic ? 'var(--bg-active, #1e1e1e)' : 'transparent', border: !saveForm.isPublic ? '1px solid var(--accent-border, #7c3aed)' : '1px solid var(--border-subtle, #1e1e1e)', color: !saveForm.isPublic ? 'var(--accent-light, #a78bfa)' : 'var(--text-disabled, #444)' }}>
          🔒 Private
        </button>
        <button onClick={() => setSaveForm(f => ({ ...f, isPublic: true }))} style={{ flex: 1, padding: '5px 0', fontSize: 11, borderRadius: 'var(--radius-sm, 5px)', cursor: 'pointer', background: saveForm.isPublic ? 'rgba(74,222,128,0.08)' : 'transparent', border: saveForm.isPublic ? '1px solid rgba(74,222,128,0.4)' : '1px solid var(--border-subtle, #1e1e1e)', color: saveForm.isPublic ? '#4ade80' : 'var(--text-disabled, #444)' }}>
          🌐 Public
        </button>
      </div>
      {saveMsg.text && <div style={{ fontSize: 11, color: saveMsg.ok ? '#4ade80' : '#f87171', marginBottom: 10 }}>{saveMsg.text}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSave} disabled={saving} style={{ flex: 1, background: 'var(--accent, #7c3aed)', border: 'none', borderRadius: 'var(--radius-sm, 5px)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-mid, #2e2e2e)', borderRadius: 'var(--radius-sm, 5px)', color: 'var(--text-muted, #888)', fontSize: 12, padding: '8px', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
