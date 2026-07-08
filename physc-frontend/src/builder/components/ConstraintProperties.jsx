import React from 'react';
import { useBuilderStore } from '../builderStore';
import { CONSTRAINT_COMPONENTS } from '../componentRegistry';
import { PropRow, SectionLabel } from './PropControls';

const CTYPE_COLORS = {
  spring: '#818cf8', rod: '#94a3b8', motor: '#4ade80',
  hinge: '#34d399', weld: '#f472b6', slider: '#a855f7', pulley: '#22d3ee',
};

export function ConstraintBadge({ type }) {
  const color = CTYPE_COLORS[type?.toLowerCase()] ?? '#818cf8';
  const def   = CONSTRAINT_COMPONENTS[type?.toLowerCase()];
  const init  = def?.label?.[0] ?? '?';
  return (
    <span style={{
      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
      background: `${color}22`, border: `1.5px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontSize: 10, fontWeight: 800, lineHeight: 1,
    }}>{init}</span>
  );
}

function ConstraintInspector({ constraint, bodies, def }) {
  const bodyA = bodies.find(b => b.id === constraint.steps?.[0]?.bodyId);
  const bodyB = bodies.find(b => b.id === constraint.steps?.[1]?.bodyId);

  return (
    <div style={{ background: 'var(--bg-void)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius)', padding: '10px 12px', marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>✅</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>{def.label} Constraint</div>
          <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: 1 }}>Connected correctly</div>
        </div>
      </div>
      {[['Body A', bodyA, constraint.bodyA], ['Body B', bodyB, constraint.bodyB]].map(([label, body, id]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, padding: '4px 6px', background: 'var(--bg-surface)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-primary)', marginTop: 1 }}>{body ? body.name : (id ? 'Pin' : 'None')}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConstraintProperties({ constraint }) {
  const updateConstraintProps = useBuilderStore(s => s.updateConstraintProps);
  const removeConstraint      = useBuilderStore(s => s.removeConstraint);
  const clearSelected         = useBuilderStore(s => s.clearSelected);
  const bodies                = useBuilderStore(s => s.bodies);

  const def = CONSTRAINT_COMPONENTS[constraint.type.toLowerCase()];
  if (!def) return null;

  const set = (key) => (val) => updateConstraintProps(constraint.id, { [key]: val });

  const steps = constraint.steps ?? [];
  const computedDist = steps.length >= 2
    ? Math.round(Math.hypot(
        steps[1].worldPos.x - steps[0].worldPos.x,
        steps[1].worldPos.y - steps[0].worldPos.y
      ))
    : null;

  const effectiveValue = (key, raw) => {
    if ((raw === null || raw === undefined) && computedDist !== null) {
      if (key === 'length' || key === 'restLength') return computedDist;
      if (key === 'minLimit' && constraint.type?.toLowerCase() === 'slider') return -computedDist;
      if (key === 'maxLimit' && constraint.type?.toLowerCase() === 'slider') return 0;
    }
    return raw;
  };

  return (
    <div className="custom-scroll" style={{ overflow: 'hidden auto', flex: 1 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 2 }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{def.label}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>Constraint</div>
        </div>
        <button
          onClick={() => { removeConstraint(constraint.id); clearSelected(); }}
          title="Delete"
          style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--red)', padding: '4px 9px', borderRadius: 4, cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}
        >
          ✕ Delete
        </button>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <SectionLabel>Inspector</SectionLabel>
        <ConstraintInspector constraint={constraint} bodies={bodies} def={def} />

        {(def.properties?.length > 0) && (
          <>
            <SectionLabel>Parameters</SectionLabel>
            {def.properties.map(propDef => (
              <PropRow
                key={propDef.key}
                propDef={propDef}
                value={effectiveValue(propDef.key, constraint.props?.[propDef.key] ?? propDef.defaultValue)}
                onChange={set(propDef.key)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
