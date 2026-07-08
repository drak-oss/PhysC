import React from 'react';
import { useEditorStore } from '../store/editorStore';
import { BoxIcon, CircleIcon, LinkIcon, VecIcon } from '../components/icons/HierarchyIcons';

const BODY_TYPE_LABELS  = ['Static', 'Kinematic', 'Dynamic'];
const BODY_TYPE_CLASSES = ['static', 'kinematic', 'dynamic'];

const CONSTRAINT_TYPE_COLORS = {
    Hinge:    '#a78bfa',
    Distance: '#60a5fa',
    Motor:    '#34d399',
    Slider:   '#fb923c',
    Weld:     '#f472b6',
    Pulley:   '#2dd4bf',
};

export default function HierarchyPanel() {
    const bodies            = useEditorStore(s => s.bodies);
    const constraints       = useEditorStore(s => s.constraints);
    const selectedNodeId    = useEditorStore(s => s.selectedNodeId);
    const setSelectedNodeId = useEditorStore(s => s.setSelectedNodeId);
    const bodyVectors       = useEditorStore(s => s.bodyVectors);
    const toggleBodyVector  = useEditorStore(s => s.toggleBodyVector);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="panel-header">
                <h3>Scene Graph</h3>
            </div>

            <div className="panel-content">
                <div className="hierarchy-section">
                    <div className="hierarchy-group-header">
                        <span>Bodies</span>
                        <span className="hierarchy-count-badge">{bodies.length}</span>
                    </div>
                    <ul className="hierarchy-list">
                        {bodies.map(body => {
                            const typeLabel = BODY_TYPE_LABELS[body.type]  ?? 'Dynamic';
                            const typeCls   = BODY_TYPE_CLASSES[body.type] ?? 'dynamic';
                            const isSelected = selectedNodeId === body.id;
                            const isDynamic  = body.type === 2;
                            const vecOn      = !!bodyVectors[body.id];
                            const iconColor  =
                                body.type === 0 ? '#64748b' :
                                body.type === 1 ? '#2dd4bf' : '#fb923c';
                            return (
                                <li
                                    key={body.id}
                                    className={`hierarchy-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedNodeId(body.id)}
                                    title={`${body.name || body.shape + ' ' + body.id} — ${typeLabel}`}
                                >
                                    <span className="hierarchy-item-icon" style={{ color: isSelected ? 'var(--accent-light)' : iconColor }}>
                                        {body.shape === 'Box' ? <BoxIcon /> : <CircleIcon />}
                                    </span>
                                    <span className="hierarchy-item-label">{body.name || `${body.shape} ${body.id}`}</span>
                                    <span className={`type-badge ${typeCls}`}>{typeLabel}</span>
                                    {isDynamic && (
                                        <button
                                            className={`vec-toggle-btn ${vecOn ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); toggleBodyVector(body.id); }}
                                            title={vecOn ? 'Hide velocity vectors' : 'Show velocity vectors'}
                                        >
                                            <VecIcon />
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="hierarchy-divider" />

                <div className="hierarchy-section">
                    <div className="hierarchy-group-header">
                        <span>Constraints</span>
                        <span className="hierarchy-count-badge">{constraints.length}</span>
                    </div>
                    <ul className="hierarchy-list">
                        {constraints.map(c => {
                            const isSelected  = selectedNodeId === c.id;
                            const accentColor = CONSTRAINT_TYPE_COLORS[c.type] ?? '#9899b8';
                            const bodyAName   = bodies.find(b => b.id === c.bodyA)?.name ?? `#${c.bodyA}`;
                            const bodyBName   = bodies.find(b => b.id === c.bodyB)?.name ?? `#${c.bodyB}`;
                            return (
                                <li
                                    key={c.id}
                                    className={`hierarchy-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedNodeId(c.id)}
                                    title={`${c.type}: ${bodyAName} ↔ ${bodyBName}`}
                                >
                                    <span className="hierarchy-item-icon" style={{ color: isSelected ? 'var(--accent-light)' : accentColor }}>
                                        <LinkIcon />
                                    </span>
                                    <span className="hierarchy-item-label">
                                        <span style={{ color: accentColor, fontWeight: 600 }}>{c.type}</span>
                                        &nbsp;{bodyAName} ↔ {bodyBName}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}
