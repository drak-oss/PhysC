import React from 'react';
import { useBuilderStore } from '../builderStore';
import { CONSTRAINT_COMPONENTS } from '../componentRegistry';
import { SectionLabel } from './PropControls';
import { ConstraintBadge } from './ConstraintProperties';

function AllConstraintsInspector({ constraints, bodies }) {
  if (constraints.length === 0) return null;
  return (
    <div style={{ padding: '0 12px 12px' }}>
      <SectionLabel>All Constraints ({constraints.length})</SectionLabel>
      {constraints.map(c => {
        const def = CONSTRAINT_COMPONENTS[c.type.toLowerCase()];
        if (!def) return null;
        const bodyA = bodies.find(b => b.id === c.steps?.[0]?.bodyId);
        const bodyB = bodies.find(b => b.id === c.steps?.[1]?.bodyId);
        return (
          <div
            key={c.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-surface)', borderRadius: 4, border: '1px solid var(--border-subtle)', marginBottom: 4, cursor: 'pointer' }}
            onClick={() => useBuilderStore.getState().setSelected(c.id, 'constraint')}
          >
            <ConstraintBadge type={c.type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{def.label}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bodyA ? bodyA.name : 'Pin'} → {bodyB ? bodyB.name : (c.steps?.length > 1 ? 'Pin' : 'Pivot')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EmptyProperties({ activeTool, constraints, bodies }) {
  const isBodyTool       = ['staticAnchor', 'dynamicAnchor', 'disk', 'block'].includes(activeTool);
  const isConstraintTool = !isBodyTool && activeTool !== 'select';
  const cDef = isConstraintTool ? CONSTRAINT_COMPONENTS[activeTool] : null;

  return (
    <div className="custom-scroll" style={{ overflow: 'hidden auto', flex: 1 }}>
      <div style={{ padding: '24px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 34, opacity: 0.22 }}>{isBodyTool ? '🏗️' : isConstraintTool ? '🔗' : '🔧'}</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {isBodyTool ? `Placing ${activeTool}`
            : isConstraintTool ? `Wiring ${cDef?.label ?? activeTool}`
            : 'Nothing selected'}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 190 }}>
          {isBodyTool
            ? 'Click the canvas to place. Hover over an anchor point to snap.'
            : isConstraintTool && cDef
            ? 'Click and drag from one body to another to connect them. Release in empty space to create a ground pin.'
            : 'Click a body or constraint on the canvas to inspect its properties.'}
        </div>
      </div>
      {constraints.length > 0 && !isBodyTool && !isConstraintTool && (
        <AllConstraintsInspector constraints={constraints} bodies={bodies} />
      )}
    </div>
  );
}
