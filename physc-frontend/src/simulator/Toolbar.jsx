import React, { useEffect, useState } from 'react';
import { commandManager } from '../commands/CommandManager';
import { useEditorStore } from '../store/editorStore';
import { serializeToSimulator } from '../builder/serializationSystem';
import { UndoIcon, RedoIcon, SaveIcon, OpenIcon, PlayIcon, PauseIcon, StepIcon, ResetIcon, VectorsIcon, TrashIcon } from '../components/icons/SimulatorIcons';
import './Toolbar.css';

export default function Toolbar({ physicsApi, running, setRunning }) {
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const hasCollisions  = useEditorStore(s => s.hasCollisions);
    const collidingIds   = useEditorStore(s => s.collidingIds);
    const showVectors    = useEditorStore(s => s.showVelocityVectors);
    const setShowVectors = useEditorStore(s => s.setShowVelocityVectors);

    useEffect(() => {
        const update = () => { setCanUndo(commandManager.canUndo()); setCanRedo(commandManager.canRedo()); };
        return commandManager.subscribe(update);
    }, []);

    const handleExport = () => {
        const state    = useEditorStore.getState();
        const fileName = (state.machineTitle || 'scene').replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
        const blob     = new Blob([JSON.stringify({
            machineTitle: state.machineTitle,
            bodies:       state.bodies,
            constraints:  state.constraints,
            ignorePairs:  state.ignorePairs || [],
        }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                const isBuilderFormat = Array.isArray(data.bodies) && data.bodies.length > 0
                    && data.bodies[0].type !== undefined && data.bodies[0].shape === undefined;

                let simBodies, simConstraints, simIgnorePairs, simTitle;
                if (isBuilderFormat) {
                    const result = serializeToSimulator({ bodies: data.bodies || [], constraints: data.constraints || [] });
                    if (result.errors.length > 0) { alert('Scene errors:\n' + result.errors.join('\n')); return; }
                    simBodies = result.bodies; simConstraints = result.constraints;
                    simIgnorePairs = result.ignorePairs; simTitle = data.machineTitle ?? '';
                } else {
                    simBodies = data.bodies || []; simConstraints = data.constraints || [];
                    simIgnorePairs = data.ignorePairs || []; simTitle = data.machineTitle ?? '';
                }

                setRunning(false);
                commandManager.clear();
                useEditorStore.getState().loadScene({
                    bodies: simBodies, constraints: simConstraints,
                    ignorePairs: simIgnorePairs, machineTitle: simTitle,
                });
            } catch (err) { console.error(err); alert('Invalid scene file.'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleRemove = () => {
        setRunning(false);
        commandManager.clear();
        useEditorStore.getState().clearScene();
    };

    const handleReset = () => {
        setRunning(false);
        useEditorStore.getState().resetScene();
        commandManager.clear();
    };

    const handleStep = () => {
        if (running) return;
        physicsApi.step(1 / 60, 20);
        physicsApi.requestRenderData();
    };

    const canSimulate = running || !hasCollisions;

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button disabled={!canUndo} onClick={() => commandManager.undo()} title="Undo (Ctrl+Z)"><UndoIcon /></button>
                <button disabled={!canRedo} onClick={() => commandManager.redo()} title="Redo (Ctrl+Y)"><RedoIcon /></button>
            </div>

            <div className="toolbar-group">
                <label className="button stb-icon-btn" title="Load from local file" style={{ cursor: 'pointer' }}>
                    <OpenIcon />
                    <span className="stb-icon-btn-text">Load Local</span>
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                </label>
                <button className="stb-icon-btn" onClick={handleExport} title="Save to local file">
                    <SaveIcon />
                    <span className="stb-icon-btn-text">Save Local</span>
                </button>
                <button className="stb-danger" onClick={handleRemove} title="Remove Scene"><TrashIcon /></button>
            </div>

            {hasCollisions && !running && (
                <div className="collision-warning">
                    <span>⚠</span>&nbsp;{collidingIds.size} collision{collidingIds.size > 1 ? 's' : ''} — move bodies apart
                </div>
            )}

            <div className={`toolbar-group stb-right-group`}>
                <button
                    className={`stb-icon-btn${showVectors ? ' stb-vectors-btn--active' : ''}`}
                    onClick={() => setShowVectors(!showVectors)}
                    title="Show velocity vectors for all dynamic bodies"
                >
                    <VectorsIcon />
                    <span className="stb-icon-btn-text">Vectors</span>
                </button>

                <button id="step-btn" className="stb-icon-btn" onClick={handleStep} disabled={running} title="Step one physics tick (paused only)">
                    <StepIcon />
                    <span className="stb-icon-btn-text">Step</span>
                </button>

                <button id="reset-btn" className="stb-icon-btn stb-danger" onClick={handleReset} title="Reset simulation to original state">
                    <ResetIcon />
                    <span className="stb-icon-btn-text">Reset</span>
                </button>

                <button
                    id="sim-toggle-btn"
                    className={`play-btn ${running ? 'running' : ''} ${!canSimulate ? 'blocked' : ''}`}
                    onClick={() => canSimulate && setRunning(!running)}
                    disabled={!canSimulate}
                    title={!canSimulate ? `Cannot simulate: resolve ${collidingIds.size} collision(s) first` : running ? 'Pause Simulation' : 'Start Simulation'}
                >
                    {running ? <PauseIcon /> : <PlayIcon />}
                    <span>{running ? 'Pause' : !canSimulate ? 'Blocked' : 'Simulate'}</span>
                </button>
            </div>
        </div>
    );
}
