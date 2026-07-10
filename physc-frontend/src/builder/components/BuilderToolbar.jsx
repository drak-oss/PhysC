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
import './BuilderToolbar.css';

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
        <div className="logo bt-logo-wrap">
          <PhysCLogo />
          <div className="logo-text">
            <span className="logo-name">PhysC</span>
          </div>
          {user && (
            <button
              onClick={() => navigate('/account')}
              title={`Account: ${user.username}`}
              className="bt-nav-btn"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="bt-nav-btn-text">{user.username}</span>
            </button>
          )}

          {user && (
            <div className="bt-save-panel-wrap" ref={savePanelRef}>
              <button
                onClick={() => { setSaveForm(f => ({ ...f, name: machineTitle })); setShowSavePanel(v => !v); setSaveMsg({ text: '', ok: true }); }}
                className="bt-nav-btn"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                <span className="bt-nav-btn-text">GALLERY</span>
              </button>
              {showSavePanel && <SavePanel saveForm={saveForm} setSaveForm={setSaveForm} saving={saving} saveMsg={saveMsg} onSave={handleSaveToGallery} onClose={() => setShowSavePanel(false)} />}
            </div>
          )}
        </div>

        <div className="bt-center">
          <div className="bt-title-wrap">
            <input
              type="text"
              value={machineTitle}
              onChange={e => setMachineTitle(e.target.value)}
              placeholder="Untitled Machine…"
              maxLength={60}
              className={`bt-title-input${machineTitle ? ' bt-title-input--filled' : ''}`}
            />
            <span className="bt-title-icon">✏</span>
          </div>
          <div className="bt-counts">
            <span className="bt-count-badge">{bodies.length} bodies</span>
            <span className="bt-count-badge">{constraints.length} joints</span>
          </div>
        </div>

        <div className="bt-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleLoad}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Load machine from JSON file"
            className="bt-btn"
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
            className="bt-btn"
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
            className="bt-btn bt-btn--wide"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            CLEAR
          </button>

          <button
            onClick={handleSimulate}
            disabled={!canSimulate && !useEditorStore.getState().running}
            className={`bt-btn-simulate${canSimulate || useEditorStore.getState().running ? ' bt-btn-simulate--active' : ''}`}
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
        <div className="bt-error-panel">
          <div className="bt-error-header">
            <span className="bt-error-title">
              {errorKind === 'collision'
                ? '⚠ OVERLAPPING BODIES — RESOLVE COLLISIONS BEFORE SIMULATING'
                : '⚠ SIMULATION LAUNCH BLOCKED — VALIDATION FAILED'}
            </span>
            <button onClick={() => setShowErrors(false)} className="bt-error-close">✕</button>
          </div>
          {validationErrors.map((err, i) => (
            <div key={i} className="bt-error-item">
              ✗ {err}
            </div>
          ))}
          <div className="bt-error-hint">
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
    <div className="bt-save-panel">
      <div className="bt-save-panel-title">Save to Gallery</div>
      <label className="bt-save-panel-label">
        Name
        <input
          autoFocus
          value={saveForm.name}
          onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))}
          className="bt-save-panel-input"
        />
      </label>
      <label className="bt-save-panel-label bt-save-panel-label--mb">
        Description
        <input
          value={saveForm.description}
          onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))}
          className="bt-save-panel-input"
        />
      </label>
      <div className="bt-visibility-row">
        <button
          onClick={() => setSaveForm(f => ({ ...f, isPublic: false }))}
          className={`bt-vis-btn ${!saveForm.isPublic ? 'bt-vis-btn--private' : 'bt-vis-btn--private-off'}`}
        >
          🔒 Private
        </button>
        <button
          onClick={() => setSaveForm(f => ({ ...f, isPublic: true }))}
          className={`bt-vis-btn ${saveForm.isPublic ? 'bt-vis-btn--public' : 'bt-vis-btn--public-off'}`}
        >
          🌐 Public
        </button>
      </div>
      {saveMsg.text && (
        <div className={`bt-save-msg ${saveMsg.ok ? 'bt-save-msg--ok' : 'bt-save-msg--err'}`}>
          {saveMsg.text}
        </div>
      )}
      <div className="bt-save-panel-actions">
        <button
          onClick={onSave}
          disabled={saving}
          className={`bt-save-btn${saving ? ' bt-save-btn--saving' : ''}`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} className="bt-cancel-btn">
          Cancel
        </button>
      </div>
    </div>
  );
}
