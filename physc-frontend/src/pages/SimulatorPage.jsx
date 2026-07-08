import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimulationCanvas from '../simulator/SimulationCanvas';
import HierarchyPanel from '../simulator/HierarchyPanel';
import InspectorPanel from '../simulator/InspectorPanel';
import Toolbar from '../simulator/Toolbar';
import { useEditorStore } from '../store/editorStore';
import { PhysCLogo } from '../components/PhysCLogo';
import { useAuth } from '../auth/AuthContext';
import { machineApi } from '../api/machineApi';

export default function SimulatorPage({ api, ready, error, running, setRunning }) {
  const machineTitle = useEditorStore(s => s.machineTitle);
  const sceneVersion = useEditorStore(s => s.sceneVersion);
  const gravity      = useEditorStore(s => s.gravity);
  const setGravity   = useEditorStore(s => s.setGravity);
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const savePanelRef                    = useRef(null);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [saveForm,  setSaveForm]          = useState({ name: '', description: '', isPublic: false });
  const [saving,    setSaving]            = useState(false);
  const [saveMsg,   setSaveMsg]           = useState({ text: '', ok: true });

  useEffect(() => {
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
      await machineApi.save({ name: saveForm.name.trim(), description: saveForm.description, isPublic: saveForm.isPublic });
      setSaveMsg({ text: 'Saved to gallery!', ok: true });
      setTimeout(() => { setShowSavePanel(false); setSaveMsg({ text: '', ok: true }); }, 1400);
    } catch (err) {
      setSaveMsg({ text: err.response?.data?.error ?? 'Save failed.', ok: false });
    } finally { setSaving(false); }
  };

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <div className="logo" onClick={() => { setRunning(false); navigate('/builder'); }} style={{ cursor: 'pointer' }} title="Back to Builder">
          <PhysCLogo />
          <div className="logo-text">
            <span className="logo-name">PhysC</span>
          </div>
        </div>

        {user && (
          <button
            onClick={() => navigate('/account')}
            title={`Account: ${user.username}`}
            style={{ gap: 5, flexShrink: 0 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span style={{ fontSize: 11 }}>{user.username}</span>
          </button>
        )}

        {user && (
          <div style={{ position: 'relative' }} ref={savePanelRef}>
            <button
              onClick={() => { setSaveForm(f => ({ ...f, name: machineTitle })); setShowSavePanel(v => !v); setSaveMsg({ text: '', ok: true }); }}
              style={{ gap: 5, flexShrink: 0 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <span style={{ fontSize: 11 }}>Gallery</span>
            </button>
            {showSavePanel && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                background: 'var(--bg-surface)', border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius)', padding: 16, width: 260, zIndex: 200,
                boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Save to Gallery</div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Name
                  <input autoFocus value={saveForm.name} onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))}
                    style={{ background: 'var(--bg-void)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '7px 10px', fontSize: 12, outline: 'none' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Description
                  <input value={saveForm.description} onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))}
                    style={{ background: 'var(--bg-void)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '7px 10px', fontSize: 12, outline: 'none' }} />
                </label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <button onClick={() => setSaveForm(f => ({ ...f, isPublic: false }))} style={{ flex: 1, padding: '5px 0', fontSize: 11, borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: !saveForm.isPublic ? 'var(--bg-active)' : 'transparent', border: !saveForm.isPublic ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)', color: !saveForm.isPublic ? 'var(--accent-light)' : 'var(--text-disabled)' }}>🔒 Private</button>
                  <button onClick={() => setSaveForm(f => ({ ...f, isPublic: true }))} style={{ flex: 1, padding: '5px 0', fontSize: 11, borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: saveForm.isPublic ? 'rgba(74,222,128,0.08)' : 'transparent', border: saveForm.isPublic ? '1px solid rgba(74,222,128,0.4)' : '1px solid var(--border-subtle)', color: saveForm.isPublic ? '#4ade80' : 'var(--text-disabled)' }}>🌐 Public</button>
                </div>
                {saveMsg.text && <div style={{ fontSize: 11, color: saveMsg.ok ? '#4ade80' : '#f87171', marginBottom: 10 }}>{saveMsg.text}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveToGallery} disabled={saving} style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => setShowSavePanel(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: 12, padding: '8px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, minWidth: 0, padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} title={`Gravity: ${gravity.toFixed(2)}×`}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', userSelect: 'none' }}>Gravity</span>
            <input
              type="range"
              min={0} max={3} step={0.05}
              value={gravity}
              onChange={e => setGravity(parseFloat(e.target.value))}
              style={{ width: 80, accentColor: 'var(--accent)', cursor: 'pointer', verticalAlign: 'middle' }}
            />
            <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', minWidth: 30, userSelect: 'none' }}>
              {gravity.toFixed(1)}×
            </span>
          </div>
          {machineTitle && <div style={{ width: 1, height: 18, background: 'var(--border-mid)', flexShrink: 0 }} />}
          {machineTitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: '10px', opacity: 0.5, flexShrink: 0 }}>▶</span>
              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', letterSpacing: '1.2px', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {machineTitle}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Toolbar physicsApi={api} running={running} setRunning={setRunning} />
          <button
            onClick={() => { setRunning(false); navigate('/builder'); }}
            style={{
              background:   'var(--bg-surface)',
              border:       '1px solid var(--border-mid)',
              color:        'var(--text-secondary)',
              padding:      '5px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize:     '11px',
              fontWeight:   600,
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              letterSpacing:'0.4px',
            }}
          >
            ← BUILDER
          </button>
        </div>
      </header>

      <div className="editor-main">
        <div className="editor-left-panel">
          <HierarchyPanel />
        </div>

        <div className="editor-center-panel">
          {error   && <div className="error-overlay">Physics Engine Error: {String(error)}</div>}
          {!ready && !error && <div className="loading-overlay">Loading WebAssembly…</div>}
          {ready   && <SimulationCanvas key={sceneVersion} api={api} running={running} />}
        </div>

        <div className="editor-right-panel">
          <InspectorPanel physicsApi={api} />
        </div>
      </div>
    </div>
  );
}
