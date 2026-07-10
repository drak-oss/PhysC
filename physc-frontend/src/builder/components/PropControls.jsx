import React from 'react';
import './PropControls.css';

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
      className="pc-num-input"
    />
  );
}

export function SliderInput({ propDef, value, onChange }) {
  return (
    <div className="pc-slider-wrap">
      <input
        type="range"
        min={propDef.min} max={propDef.max} step={propDef.step ?? 0.01}
        value={value ?? 0}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="pc-slider"
      />
      <span className="pc-slider-val">
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
      className="pc-checkbox"
    />
  );
}

export function SelectInput({ propDef, value, onChange }) {
  return (
    <select
      value={value ?? propDef.options[0]}
      onChange={e => onChange(e.target.value)}
      className="pc-select"
    >
      {propDef.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function PropRow({ propDef, value, onChange }) {
  return (
    <div className="pc-prop-row">
      <label className="pc-prop-label">
        <span>{propDef.label}</span>
        {propDef.unit && <span className="pc-prop-unit">{propDef.unit}</span>}
      </label>
      {propDef.type === 'slider'  ? <SliderInput  propDef={propDef} value={value} onChange={onChange} />
       : propDef.type === 'boolean' ? <CheckboxInput value={value} onChange={onChange} />
       : propDef.type === 'select'  ? <SelectInput  propDef={propDef} value={value} onChange={onChange} />
       : <NumInput propDef={propDef} value={value} onChange={onChange} />}
      {propDef.description && (
        <div className="pc-prop-desc">{propDef.description}</div>
      )}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div className="pc-section-label">
      {children}
    </div>
  );
}
