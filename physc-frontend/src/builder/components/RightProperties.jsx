import React from 'react';
import { useBuilderStore } from '../builderStore';
import { getBodyDef, CONSTRAINT_COMPONENTS, ALL_COMPONENTS } from '../componentRegistry';
import BodyProperties from './BodyProperties';
import ConstraintProperties from './ConstraintProperties';
import EmptyProperties from './EmptyProperties';
import './RightProperties.css';

export default function RightProperties() {
  const selectedId   = useBuilderStore(s => s.selectedId);
  const selectedType = useBuilderStore(s => s.selectedType);
  const activeTool   = useBuilderStore(s => s.activeTool);
  const bodies       = useBuilderStore(s => s.bodies);
  const constraints  = useBuilderStore(s => s.constraints);

  const body       = selectedType === 'body'       ? bodies.find(b => b.id === selectedId)       : null;
  const constraint = selectedType === 'constraint' ? constraints.find(c => c.id === selectedId) : null;

  const bodyDef       = body ? getBodyDef(body.type) : null;
  const constraintDef = constraint ? CONSTRAINT_COMPONENTS[constraint.type?.toLowerCase()] : null;
  const toolDef       = (!body && !constraint && activeTool && activeTool !== 'select')
                          ? (ALL_COMPONENTS[activeTool] ?? null) : null;
  const footerLabel   = bodyDef?.label || constraintDef?.label || toolDef?.label || 'About';
  const footerDesc    = bodyDef?.details || constraintDef?.description || toolDef?.description || null;

  return (
    <div className="rp-root">
      <div className="panel-header"><h3>Properties</h3></div>
      <div className="rp-body">
        {body
          ? <BodyProperties body={body} />
          : constraint
          ? <ConstraintProperties constraint={constraint} />
          : <EmptyProperties activeTool={activeTool} constraints={constraints} bodies={bodies} />}
      </div>
      {footerDesc && (
        <div className="desc-footer">
          <div className="desc-footer-label">{footerLabel}</div>
          <div className="desc-footer-text">{footerDesc}</div>
        </div>
      )}
    </div>
  );
}
