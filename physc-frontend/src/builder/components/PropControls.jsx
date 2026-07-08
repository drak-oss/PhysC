import React from 'react';

export function NumInput({ propDef, value, onChange }) {
  return (
    <input
      type="number"
      value={value === null || value === undefined ? '' : parseFloat(Number(value).toFixed(4))}
      step={propDef.step ?? 1}
      min={propDef.min}
      max={propDef.max}
      onChange={e => {
        const v = e.target.value === '' ? null : parseFloat(e.target.value);
        onChange(isNaN(v) ? 0 : v);
      }}
      style={{
        background: 'var(--bg-void)',
        border: '1px solid var(--border-mid)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        padding: '5px 8px',
        fontSize: '11.5px',
        fontFamily: "'JetBrains Mono', monospace",
        width: '100%',
        outline: 'none',
      }}
    />
  );
}

export function SliderInput({ propDef, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="range"
        min={propDef.min} max={propDef.max} step={propDef.step ?? 0.01}
        value={value ?? 0}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)', height: 4 }}
      />
      <span style={{ width: 36, textAlign: 'right', fontSize: '11px', fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-secondary)', flexShrink: 0 }}>
        {(value ?? 0).toFixed(2)}
      </span>
    </div>
  );
}

export function CheckboxInput({ value, onChange }) {
  return (
    <input
      type="checkbox"
      checked={!!value}
      onChange={e => onChange(e.target.checked)}
      style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 16, height: 16 }}
    />
  );
}

export function SelectInput({ propDef, value, onChange }) {
  return (
    <select
      value={value ?? propDef.options[0]}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--bg-void)',
        border: '1px solid var(--border-mid)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        padding: '4px 6px',
        fontSize: '11.5px',
        width: '100%',
        outline: 'none',
      }}
    >
      {propDef.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function PropRow({ propDef, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
        <span>{propDef.label}</span>
        {propDef.unit && <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>{propDef.unit}</span>}
      </label>
      {propDef.type === 'slider'  ? <SliderInput  propDef={propDef} value={value} onChange={onChange} />
       : propDef.type === 'boolean' ? <CheckboxInput value={value} onChange={onChange} />
       : propDef.type === 'select'  ? <SelectInput  propDef={propDef} value={value} onChange={onChange} />
       : <NumInput propDef={propDef} value={value} onChange={onChange} />}
      {propDef.description && (
        <div style={{ fontSize: '9px', color: 'var(--text-disabled)', marginTop: 1, lineHeight: 1.4 }}>{propDef.description}</div>
      )}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-disabled)', textTransform: 'uppercase', marginBottom: 8, marginTop: 14, paddingBottom: 4, borderBottom: '1px solid var(--border-subtle)' }}>
      {children}
    </div>
  );
}
