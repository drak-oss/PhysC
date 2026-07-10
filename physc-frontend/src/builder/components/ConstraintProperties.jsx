import React from 'react';
import { useBuilderStore } from '../builderStore';
import { CONSTRAINT_COMPONENTS } from '../componentRegistry';
import { PropRow, SectionLabel } from './PropControls';
import './ConstraintProperties.css';

const CTYPE_COLORS = {
  spring: '#818cf8', rod: '#94a3b8', motor: '#4ade80',
  hinge: '#34d399', weld: '#f472b6', slider: '#a855f7', pulley: '#22d3ee',
};

export function ConstraintBadge({ type }) {
  const color = CTYPE_COLORS[type?.toLowerCase()] ?? '#818cf8';
  const def   = CONSTRAINT_COMPONENTS[type?.toLowerCase()];
  const init  = def?.label?.[0] ?? '?';
  return (
    <span
      className="cprop-badge"
      style={{
        background: `${color}22`,
        border: `1.5px solid ${color}`,
        color,
      }}
    >{init}</span>
  );
}

function ConstraintInspector({ constraint, bodies, def }) {
  const bodyA = bodies.find(b => b.id === constraint.steps?.[0]?.bodyId);
  const bodyB = bodies.find(b => b.id === constraint.steps?.[1]?.bodyId);

  return (
    <div className="cprop-inspector">
      <div className="cprop-inspector-header">
        <span style={{ fontSize: 14 }}>✅</span>
        <div>
          <div className="cprop-connected-label">{def.label} Constraint</div>
          <div className="cprop-connected-sub">Connected correctly</div>
        </div>
      </div>
      {[['Body A', bodyA, constraint.bodyA], ['Body B', bodyB, constraint.bodyB]].map(([label, body, id]) => (
        <div key={label} className="cprop-body-row">
          <div className="cprop-body-info">
            <div className="cprop-body-label">{label}</div>
            <div className="cprop-body-name">{body ? body.name : (id ? 'Pin' : 'None')}</div>
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
      <div className="cprop-header">
        <div>
          <div className="cprop-name">{def.label}</div>
          <div className="cprop-subtype">Constraint</div>
        </div>
        <button
          onClick={() => { removeConstraint(constraint.id); clearSelected(); }}
          title="Delete"
          className="cprop-delete"
        >
          ✕ Delete
        </button>
      </div>

      <div className="cprop-content">
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
