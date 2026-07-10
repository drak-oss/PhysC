import React from 'react';
import { useBuilderStore } from '../builderStore';
import { getBodyDef } from '../componentRegistry';
import { PropRow, SectionLabel } from './PropControls';
import './BodyProperties.css';

export default function BodyProperties({ body }) {
  const updateBody      = useBuilderStore(s => s.updateBody);
  const updateBodyProps = useBuilderStore(s => s.updateBodyProps);
  const removeBody      = useBuilderStore(s => s.removeBody);
  const clearSelected   = useBuilderStore(s => s.clearSelected);
  const def = getBodyDef(body.type);
  if (!def) return null;

  const set    = (key) => (val) => updateBodyProps(body.id, { [key]: val });
  const setTop = (key) => (val) => updateBody(body.id, { [key]: val });

  return (
    <div className="custom-scroll" style={{ overflow: 'hidden auto', flex: 1 }}>
      <div className="bprop-header">
        <div>
          <div className="bprop-name">{body.name}</div>
          <div className="bprop-subtype">
            {def.isStatic ? '🔒 Static' : '⚡ Dynamic'} · {def.label}
          </div>
        </div>
        <button
          onClick={() => { removeBody(body.id); clearSelected(); }}
          title="Delete"
          className="bprop-delete"
        >
          ✕ Delete
        </button>
      </div>

      <div className="bprop-content">
        <SectionLabel>Identity</SectionLabel>
        <div className="bprop-mb">
          <label className="bprop-field-label">Name</label>
          <input
            value={body.name}
            onChange={e => updateBody(body.id, { name: e.target.value })}
            className="bprop-input"
          />
        </div>

        <SectionLabel>Transform</SectionLabel>
        <div className="bprop-grid-2">
          {['x', 'y'].map(k => (
            <div key={k}>
              <label className="bprop-field-label">
                {k.toUpperCase()} <span className="bprop-field-unit">px</span>
              </label>
              <input type="number" value={Math.round(body[k])} step={1}
                onChange={e => setTop(k)(parseFloat(e.target.value) || 0)}
                className="bprop-input bprop-input--mono" />
            </div>
          ))}
        </div>
        {(body.type === 'block' || body.type === 'disk') && (
          <div className="bprop-mb">
            <label className="bprop-field-label--flex">
              <span>Rotation</span>
              <span className="bprop-field-unit">°</span>
            </label>
            <input
              type="number"
              value={parseFloat(((body.rotation ?? 0) * 180 / Math.PI).toFixed(1))}
              step={1}
              onChange={e => setTop('rotation')((parseFloat(e.target.value) || 0) * Math.PI / 180)}
              className="bprop-input bprop-input--mono"
            />
          </div>
        )}

        {def.properties.length > 0 && (
          <>
            <SectionLabel>Properties</SectionLabel>
            {def.properties.map(propDef => (
              <PropRow
                key={propDef.key}
                propDef={propDef}
                value={body.props?.[propDef.key] ?? propDef.defaultValue}
                onChange={set(propDef.key)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
