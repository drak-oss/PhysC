import React from 'react';
import { useBuilderStore } from '../builderStore';
import { CONSTRAINT_COMPONENTS } from '../componentRegistry';
import { SectionLabel } from './PropControls';
import { ConstraintBadge } from './ConstraintProperties';
import './EmptyProperties.css';

function AllConstraintsInspector({ constraints, bodies }) {
  if (constraints.length === 0) return null;
  return (
    <div className="ep-all-wrap">
      <SectionLabel>All Constraints ({constraints.length})</SectionLabel>
      {constraints.map(c => {
        const def = CONSTRAINT_COMPONENTS[c.type.toLowerCase()];
        if (!def) return null;
        const bodyA = bodies.find(b => b.id === c.steps?.[0]?.bodyId);
        const bodyB = bodies.find(b => b.id === c.steps?.[1]?.bodyId);
        return (
          <div
            key={c.id}
            className="ep-constraint-row"
            onClick={() => useBuilderStore.getState().setSelected(c.id, 'constraint')}
          >
            <ConstraintBadge type={c.type} />
            <div className="ep-row-body">
              <div className="ep-row-label">{def.label}</div>
              <div className="ep-row-bodies">
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
      <div className="ep-center">
        <div className="ep-icon">{isBodyTool ? '🏗️' : isConstraintTool ? '🔗' : '🔧'}</div>
        <div className="ep-title">
          {isBodyTool ? `Placing ${activeTool}`
            : isConstraintTool ? `Wiring ${cDef?.label ?? activeTool}`
            : 'Nothing selected'}
        </div>
        <div className="ep-hint">
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
