import React from 'react';
import { useBuilderStore } from '../builderStore';
import { getBodyDef } from '../componentRegistry';
import { PropRow, SectionLabel } from './PropControls';

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
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 2 }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{body.name}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
            {def.isStatic ? '🔒 Static' : '⚡ Dynamic'} · {def.label}
          </div>
        </div>
        <button
          onClick={() => { removeBody(body.id); clearSelected(); }}
          title="Delete"
          style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--red)', padding: '4px 9px', borderRadius: 4, cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}
        >
          ✕ Delete
        </button>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <SectionLabel>Identity</SectionLabel>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name</label>
          <input
            value={body.name}
            onChange={e => updateBody(body.id, { name: e.target.value })}
            style={{ background: 'var(--bg-void)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '5px 8px', fontSize: '11.5px', width: '100%', outline: 'none', fontFamily: 'Inter,sans-serif' }}
          />
        </div>

        <SectionLabel>Transform</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {['x', 'y'].map(k => (
            <div key={k}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                {k.toUpperCase()} <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>px</span>
              </label>
              <input type="number" value={Math.round(body[k])} step={1}
                onChange={e => setTop(k)(parseFloat(e.target.value) || 0)}
                style={{ background: 'var(--bg-void)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '5px 8px', fontSize: '11.5px', width: '100%', outline: 'none', fontFamily: "'JetBrains Mono',monospace" }} />
            </div>
          ))}
        </div>
        {(body.type === 'block' || body.type === 'disk') && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Rotation</span>
              <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>°</span>
            </label>
            <input
              type="number"
              value={parseFloat(((body.rotation ?? 0) * 180 / Math.PI).toFixed(1))}
              step={1}
              onChange={e => setTop('rotation')((parseFloat(e.target.value) || 0) * Math.PI / 180)}
              style={{ background: 'var(--bg-void)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '5px 8px', fontSize: '11.5px', width: '100%', outline: 'none', fontFamily: "'JetBrains Mono',monospace" }}
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
