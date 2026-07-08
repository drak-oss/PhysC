import React, { useEffect, useState } from 'react';
import { commandManager } from '../commands/CommandManager';
import { useEditorStore } from '../store/editorStore';
import { serializeToSimulator } from '../builder/serializationSystem';
import { UndoIcon, RedoIcon, SaveIcon, OpenIcon, PlayIcon, PauseIcon, StepIcon, ResetIcon, VectorsIcon, TrashIcon } from '../components/icons/SimulatorIcons';

export default function Toolbar({ physicsApi, running, setRunning }) {
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const hasCollisions  = useEditorStore(s => s.hasCollisions);
    const collidingIds   = useEditorStore(s => s.collidingIds);
    const showVectors    = useEditorStore(s => s.showVelocityVectors);
    const setShowVectors = useEditorStore(s => s.setShowVelocityVectors);
    const gravity        = useEditorStore(s => s.gravity);
    const setGravity     = useEditorStore(s => s.setGravity);

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
                <label className="button" title="Load from local file" style={{ cursor: 'pointer', gap: 5 }}>
                    <OpenIcon />
                    <span style={{ fontSize: 11 }}>Load Local</span>
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                </label>
                <button onClick={handleExport} title="Save to local file" style={{ gap: 5 }}>
                    <SaveIcon />
                    <span style={{ fontSize: 11 }}>Save Local</span>
                </button>
                <button onClick={handleRemove} title="Remove Scene" style={{ color: '#f87171' }}><TrashIcon /></button>
            </div>

            {hasCollisions && !running && (
                <div className="collision-warning">
                    <span>⚠</span>&nbsp;{collidingIds.size} collision{collidingIds.size > 1 ? 's' : ''} — move bodies apart
                </div>
            )}

            <div className="toolbar-group" style={{ marginLeft: 'auto', gap: 16 }}>
                <button
                    onClick={() => setShowVectors(!showVectors)}
                    title="Show velocity vectors for all dynamic bodies"
                    style={{ gap: 5, color: showVectors ? 'var(--green)' : undefined, background: showVectors ? 'var(--green-dim)' : undefined }}
                >
                    <VectorsIcon />
                    <span style={{ fontSize: 11 }}>Vectors</span>
                </button>

                <button id="step-btn" onClick={handleStep} disabled={running} title="Step one physics tick (paused only)" style={{ gap: 5 }}>
                    <StepIcon />
                    <span style={{ fontSize: 11 }}>Step</span>
                </button>

                <button id="reset-btn" onClick={handleReset} title="Reset simulation to original state" style={{ gap: 5, color: '#f87171' }}>
                    <ResetIcon />
                    <span style={{ fontSize: 11 }}>Reset</span>
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
