import React, { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { commandManager, ModifyPropertyCommand, TranslateGroupCommand } from '../commands/CommandManager';
import { SliderRow, Section, ReadRow } from '../components/SliderRow';

const fmt = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : (v ?? ''));

export default function InspectorPanel({ physicsApi }) {
    const bodies         = useEditorStore(s => s.bodies);
    const constraints    = useEditorStore(s => s.constraints);
    const selectedNodeId = useEditorStore(s => s.selectedNodeId);
    const idMap          = useEditorStore(s => s.idMap);
    const liveBodyData   = useEditorStore(s => s.liveBodyData);
    const running        = useEditorStore(s => s.running);

    const selectedBody       = bodies.find(b => b.id === selectedNodeId);
    const selectedConstraint = constraints.find(c => c.id === selectedNodeId);

    const live   = (selectedBody && liveBodyData[selectedNodeId]) || {};
    const wasmId = selectedBody ? idMap[selectedNodeId] : undefined;

    const commitTranslate = useCallback((dx, dy) => {
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        commandManager.executeCommand(
            new TranslateGroupCommand(selectedNodeId, dx, dy, physicsApi)
        );
    }, [selectedNodeId, physicsApi]);

    const commit = useCallback((prop, liveOldVal, newVal) => {
        if (newVal === liveOldVal || (typeof newVal === 'number' && isNaN(newVal))) return;
        commandManager.executeCommand(
            new ModifyPropertyCommand(selectedNodeId, 'body', prop, liveOldVal, newVal, physicsApi, wasmId)
        );
    }, [selectedNodeId, physicsApi, wasmId]);

    if (!selectedNodeId) {
        return (
            <div className="inspector-panel">
                <div className="panel-header"><h3>Inspector</h3></div>
                <div className="inspector-empty-state">
                    <div className="inspector-empty-icon">✦</div>
                    <p style={{ margin: 0 }}>Select a body or constraint in the Scene Graph to inspect its properties.</p>
                </div>
            </div>
        );
    }

    if (selectedBody) {
        const liveX   = live.x               ?? selectedBody.x;
        const liveY   = live.y               ?? selectedBody.y;
        const liveRot = live.rotation        ?? selectedBody.rotation;
        const liveVx  = live.vx             ?? selectedBody.vx ?? 0;
        const liveVy  = live.vy             ?? selectedBody.vy ?? 0;
        const liveW   = live.angularVelocity ?? selectedBody.angularVelocity ?? 0;

        const bodyTypeName = ['Static', 'Kinematic', 'Dynamic'][selectedBody.type] ?? 'Dynamic';
        const bodyTypeColor =
            selectedBody.type === 0 ? 'var(--text-secondary)' :
            selectedBody.type === 1 ? 'var(--teal)' : 'var(--orange)';

        return (
            <div className="inspector-panel">
                <div className="panel-header">
                    <h3>Inspector</h3>
                    <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                        background: selectedBody.type === 0 ? 'rgba(100,116,139,0.15)' :
                                    selectedBody.type === 1 ? 'var(--teal-dim)' : 'var(--orange-dim)',
                        color: bodyTypeColor,
                    }}>
                        {bodyTypeName}
                    </span>
                </div>

                <div className="panel-content">
                    <Section title="Identity" />
                    <div className="prop-group">
                        <label>Name</label>
                        <input
                            type="text"
                            defaultValue={selectedBody.name || ''}
                            placeholder="Unnamed body"
                            onBlur={(e) => commit('name', selectedBody.name, e.target.value)}
                        />
                    </div>
                    <div className="prop-group">
                        <label>Body Type</label>
                        <select
                            value={selectedBody.type}
                            onChange={(e) => commit('type', selectedBody.type, parseInt(e.target.value))}
                        >
                            <option value={0}>Static</option>
                            <option value={1}>Kinematic</option>
                            <option value={2}>Dynamic</option>
                        </select>
                    </div>

                    <Section title="Transform" badge="LIVE" />
                    {running && (
                        <div style={{
                            fontSize: '10px', color: '#f87171', padding: '4px 6px',
                            background: 'rgba(248,113,113,0.08)', borderRadius: 4,
                            border: '1px solid rgba(248,113,113,0.2)', marginBottom: 6,
                        }}>
                            ⚠ Pause the simulation to edit transform properties.
                        </div>
                    )}
                    <SliderRow label="X" liveValue={liveX} min={0} max={1000} step={1} unit="px" readOnly={running} onCommit={running ? undefined : v => commitTranslate(v - liveX, 0)} />
                    <SliderRow label="Y" liveValue={liveY} min={0} max={700} step={1} unit="px" readOnly={running} onCommit={running ? undefined : v => commitTranslate(0, v - liveY)} />
                    <SliderRow label="Rotation" liveValue={liveRot} min={-Math.PI} max={Math.PI} step={0.001} unit="rad" readOnly={running} onCommit={running ? undefined : v => commit('rotation', liveRot, v)} />

                    <Section title="Material" />
                    <SliderRow label="Density"     liveValue={selectedBody.density}           min={0.0001} max={50} step={0.001} unit="kg/m²" onCommit={v => commit('density',     selectedBody.density,          v)} />
                    <SliderRow label="Friction"    liveValue={selectedBody.friction}           min={0} max={2} step={0.01}                     onCommit={v => commit('friction',    selectedBody.friction,         v)} />
                    <SliderRow label="Restitution" liveValue={selectedBody.restitution ?? 0}  min={0} max={1} step={0.01}                     onCommit={v => commit('restitution', selectedBody.restitution ?? 0, v)} />

                    <Section title="Shape" color="var(--text-disabled)" />
                    {selectedBody.shape === 'Box' && <>
                        <SliderRow label="Width"  liveValue={selectedBody.w}      min={1} max={600} step={1} unit="px" readOnly />
                        <SliderRow label="Height" liveValue={selectedBody.h}      min={1} max={600} step={1} unit="px" readOnly />
                    </>}
                    {selectedBody.shape === 'Circle' && (
                        <SliderRow label="Radius" liveValue={selectedBody.radius} min={1} max={300} step={1} unit="px" readOnly />
                    )}
                    <div style={{ fontSize: '10px', color: 'var(--text-disabled)', padding: '2px 0 4px', fontStyle: 'italic' }}>
                        Shape dimensions are fixed after creation.
                    </div>

                    <Section title="Velocity" badge="LIVE" />
                    {(() => {
                        
                        
                        const isDynamic = selectedBody.type === 2
                            || (selectedBody.type == null && !selectedBody.isStatic);
                        return !isDynamic;
                    })() ? (
                        <div style={{ fontSize: '10px', color: 'var(--text-disabled)', padding: '4px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
                            Velocity is only applicable to Dynamic bodies.
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: '10px', color: 'var(--blue)', padding: '4px 6px', background: 'var(--blue-dim)', borderRadius: 4, border: '1px solid rgba(96,165,250,0.2)', marginBottom: 6 }}>
                                ℹ Vx / Vy inject a velocity impulse each frame — visible on free bodies, dampened by constraints. Pause the simulation to set ω (spin).
                            </div>
                            <SliderRow label="Vx" liveValue={liveVx} min={-2000} max={2000} step={1} unit="px/s" onCommit={v => commit('vx', liveVx, v)} />
                            <SliderRow label="Vy" liveValue={liveVy} min={-2000} max={2000} step={1} unit="px/s" onCommit={v => commit('vy', liveVy, v)} />
                            <SliderRow label="ω"  liveValue={liveW}  min={-50}   max={50}   step={0.01} unit="rad/s"
                                readOnly={running}
                                onFinalCommit={running ? undefined : v => commit('angularVelocity', liveW, v)}
                            />
                        </>
                    )}

                    {selectedBody && (() => {
                        const isCircle    = selectedBody.shape === 'Circle';
                        const isPin       = !isCircle && (selectedBody.w ?? 999) <= 20 && (selectedBody.h ?? 999) <= 20;
                        const isStaticPin = isPin && selectedBody.type === 0;
                        const label = isCircle ? 'Disk' : isStaticPin ? 'Static Pin' : isPin ? 'Dynamic Pin' : selectedBody.type === 0 ? 'Static Block' : 'Block';
                        const desc  = isCircle
                            ? "A Disk is a circular rigid body. It rolls and rotates naturally under physics — ideal for wheels, balls, and rotating mechanisms. Its mass scales with radius² × density."
                            : isStaticPin
                            ? "A Static Pin is a fixed anchor point with infinite mass. Nothing can move it — gravity, collisions, and constraints alike. Use it as the unmovable hub for springs, rods, and motor pivots."
                            : isPin
                            ? "A Dynamic Pin is a small falling anchor node. It has mass and responds to gravity and collisions, making it a mobile connection point for attached constraints."
                            : selectedBody.type === 0
                            ? "A Static Block has infinite mass and never moves. It acts as an immovable wall, platform, or structural member. Perfect for environment geometry."
                            : "A Block is a rectangular rigid body. It slides, tilts, and collides realistically. Adjust density for mass, friction for grip, and restitution to control how bouncy collisions are.";
                        return (
                            <div style={{ marginTop: 20, padding: '12px', background: 'var(--bg-active)', borderRadius: 8, border: '1px solid var(--border-subtle)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>{label}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 400 }}>ID: {selectedNodeId}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        );
    }

    if (selectedConstraint) {
        const bodyAName = bodies.find(b => b.id === selectedConstraint.bodyA)?.name ?? `#${selectedConstraint.bodyA}`;
        const bodyBName = bodies.find(b => b.id === selectedConstraint.bodyB)?.name ?? `#${selectedConstraint.bodyB}`;

        const CONSTRAINT_COLORS = {
            Hinge: 'var(--accent-light)', Distance: 'var(--blue)',
            Motor: 'var(--green)', Slider: 'var(--orange)',
            Weld: '#f472b6', Pulley: 'var(--teal)',
        };
        const typeColor = CONSTRAINT_COLORS[selectedConstraint.type] ?? 'var(--text-secondary)';

        const commitC = (prop, oldVal, newVal) => {
            if (newVal === oldVal || (typeof newVal === 'number' && isNaN(newVal))) return;
            commandManager.executeCommand(
                new ModifyPropertyCommand(selectedConstraint.id, 'constraint', prop, oldVal, newVal, physicsApi, undefined)
            );
        };

        const sc = selectedConstraint;

        return (
            <div className="inspector-panel">
                <div className="panel-header">
                    <h3>Inspector</h3>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-surface)', color: typeColor, border: `1px solid ${typeColor}44` }}>
                        {sc.type}
                    </span>
                </div>

                <div className="panel-content">
                    <Section title="Connection" />
                    <ReadRow label="Body A" value={bodyAName} />
                    <ReadRow label="Body B" value={bodyBName} />

                    {sc.anchorX !== undefined && <>
                        <Section title="Pivot (World)" />
                        <ReadRow label="Anchor X" value={sc.anchorX?.toFixed(1)} unit="px" />
                        <ReadRow label="Anchor Y" value={sc.anchorY?.toFixed(1)} unit="px" />
                        <div style={{ fontSize: '10px', color: 'var(--text-disabled)', padding: '2px 6px 6px', lineHeight: 1.5 }}>
                            Move the connected body to reposition the pivot.
                        </div>
                    </>}

                    {sc.ax1 !== undefined && <>
                        <Section title="Anchors (World)" />
                        <ReadRow label="A pos" value={`(${sc.ax1?.toFixed(0)}, ${sc.ay1?.toFixed(0)})`} />
                        <ReadRow label="B pos" value={`(${sc.ax2?.toFixed(0)}, ${sc.ay2?.toFixed(0)})`} />
                    </>}

                    {sc.compliance !== undefined && <>
                        <Section title="Solver" />
                        <SliderRow label="Compliance" liveValue={sc.compliance} min={0} max={sc.type === 'Hinge' ? 0.005 : 0.1} step={0.0001} precision={3} onCommit={v => commitC('compliance', sc.compliance, v)} />
                    </>}

                    {sc.distance !== undefined && <>
                        <Section title="Spring / Distance" />
                        <SliderRow label="Rest Length" liveValue={sc.distance} min={0} max={1000} step={1} unit="px" onCommit={v => commitC('distance', sc.distance, v)} />
                    </>}

                    {sc.targetOmega !== undefined && <>
                        <Section title="Motor" />
                        <SliderRow label="Target ω"  liveValue={sc.targetOmega} min={-20} max={20} step={0.1} unit="rad/s" onCommit={v => commitC('targetOmega', sc.targetOmega, v)} />
                        <SliderRow label="Max Torque" liveValue={sc.maxTorque}   min={-200} max={200} step={0.5}           onCommit={v => commitC('maxTorque',   sc.maxTorque,   v)} />
                    </>}

                    <div style={{ marginTop: 20, padding: '12px', background: 'var(--bg-active)', borderRadius: 8, border: '1px solid var(--border-subtle)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{sc.type} Constraint</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 400 }}>ID: {sc.id}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {sc.type === 'Hinge'    && "A Hinge constraint restricts relative translation between two bodies, keeping their anchor points pinned together while allowing them to rotate freely around the pivot axis. Higher compliance makes the hinge elastic."}
                            {sc.type === 'Distance' && "A Distance constraint (or Spring) links two points on two bodies, pushing or pulling them to maintain a specific rest length. Adjusting compliance turns it from a rigid rod into a bouncy spring."}
                            {sc.type === 'Motor'    && "A Motor constraint applies a continuous rotational torque to drive a body at a target angular velocity. It simulates a powered axle, rotating the connected body up to the specified maximum torque."}
                            {sc.type === 'Slider'   && "A Slider constraint restricts movement to a single linear axis, preventing relative rotation. It allows a body to slide along a fixed rail, similar to a piston inside a cylinder."}
                            {!['Hinge', 'Distance', 'Motor', 'Slider'].includes(sc.type) && `A ${sc.type} constraint links bodies together to restrict their motion.`}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
