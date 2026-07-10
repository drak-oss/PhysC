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
import './SimulatorPage.css';

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
        <div className="logo simp-logo-clickable" onClick={() => { setRunning(false); navigate('/builder'); }} title="Back to Builder">
          <PhysCLogo />
          <div className="logo-text">
            <span className="logo-name">PhysC</span>
          </div>
        </div>

        {user && (
          <button
            className="simp-nav-btn"
            onClick={() => navigate('/account')}
            title={`Account: ${user.username}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="simp-nav-btn-text">{user.username}</span>
          </button>
        )}

        {user && (
          <div className="simp-save-wrap" ref={savePanelRef}>
            <button
              className="simp-nav-btn"
              onClick={() => { setSaveForm(f => ({ ...f, name: machineTitle })); setShowSavePanel(v => !v); setSaveMsg({ text: '', ok: true }); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <span className="simp-nav-btn-text">Gallery</span>
            </button>
            {showSavePanel && (
              <div className="simp-save-panel">
                <div className="simp-save-panel-title">Save to Gallery</div>
                <label className="simp-save-panel-label">
                  Name
                  <input autoFocus className="simp-save-panel-input" value={saveForm.name} onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))} />
                </label>
                <label className="simp-save-panel-label simp-save-panel-label--mb">
                  Description
                  <input className="simp-save-panel-input" value={saveForm.description} onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))} />
                </label>
                <div className="simp-visibility-row">
                  <button
                    className={`simp-vis-btn ${!saveForm.isPublic ? 'simp-vis-btn--private' : 'simp-vis-btn--private-off'}`}
                    onClick={() => setSaveForm(f => ({ ...f, isPublic: false }))}
                  >🔒 Private</button>
                  <button
                    className={`simp-vis-btn ${saveForm.isPublic ? 'simp-vis-btn--public' : 'simp-vis-btn--public-off'}`}
                    onClick={() => setSaveForm(f => ({ ...f, isPublic: true }))}
                  >🌐 Public</button>
                </div>
                {saveMsg.text && (
                  <div className={`simp-save-msg ${saveMsg.ok ? 'simp-save-msg--ok' : 'simp-save-msg--err'}`}>
                    {saveMsg.text}
                  </div>
                )}
                <div className="simp-save-panel-actions">
                  <button
                    className={`simp-save-btn${saving ? ' simp-save-btn--saving' : ''}`}
                    onClick={handleSaveToGallery}
                    disabled={saving}
                  >{saving ? 'Saving…' : 'Save'}</button>
                  <button className="simp-cancel-btn" onClick={() => setShowSavePanel(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="simp-center">
          <div className="simp-gravity-wrap" title={`Gravity: ${gravity.toFixed(2)}×`}>
            <span className="simp-gravity-label">Gravity</span>
            <input
              type="range"
              className="simp-gravity-slider"
              min={0} max={3} step={0.05}
              value={gravity}
              onChange={e => setGravity(parseFloat(e.target.value))}
            />
            <span className="simp-gravity-val">{gravity.toFixed(1)}×</span>
          </div>
          {machineTitle && <div className="simp-divider" />}
          {machineTitle && (
            <div className="simp-title-wrap">
              <span className="simp-title-arrow">▶</span>
              <span className="simp-title-text">{machineTitle}</span>
            </div>
          )}
        </div>

        <div className="simp-actions">
          <Toolbar physicsApi={api} running={running} setRunning={setRunning} />
          <button
            className="simp-back-btn"
            onClick={() => { setRunning(false); navigate('/builder'); }}
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
