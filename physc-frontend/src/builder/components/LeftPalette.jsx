import React from 'react';
import { useBuilderStore } from '../builderStore';
import { BODY_TYPES, CONSTRAINT_TYPES } from '../componentRegistry';
import { IconAnchor, IconDisk, IconBlock, IconSpring, IconRod, IconHinge, IconMotor, IconWeld, IconPulley, IconSlider } from '../../components/icons/BuilderIcons';
import './LeftPalette.css';

const ICONS = {
  staticAnchor: IconAnchor, dynamicAnchor: IconAnchor, disk: IconDisk, block: IconBlock,
  spring: IconSpring, rod: IconRod,  hinge: IconHinge,
  motor:  IconMotor,  weld: IconWeld,
  pulley: IconPulley, slider: IconSlider,
};

const COLORS = {
  staticAnchor: '#94a3b8', dynamicAnchor: '#ef4444', disk: '#fb923c', block: '#60a5fa',
  spring: '#a78bfa', rod:  '#94a3b8', hinge: '#34d399',
  motor:  '#4ade80', weld: '#f472b6',
  pulley: '#22d3ee', slider:'#c084fc',
};

function ComponentCard({ def, isActive, onClick }) {
  const Icon  = ICONS[def.id] ?? (() => <span style={{ fontSize: 18 }}>⬤</span>);
  const color = COLORS[def.id] ?? '#94a3b8';

  return (
    <button
      onClick={onClick}
      title={def.description}
      className={`lpal-card${isActive ? ' lpal-card--active' : ''}`}
      style={{ '--lpal-color': color }}
    >
      <span className="lpal-card-icon">
        <Icon />
      </span>
      <div className="lpal-card-info">
        <div className="lpal-card-label">{def.label}</div>
        <div className="lpal-card-desc">{def.description}</div>
      </div>
      {isActive && <span className="lpal-card-dot" />}
    </button>
  );
}

export default function LeftPalette() {
  const activeTool    = useBuilderStore(s => s.activeTool);
  const setActiveTool = useBuilderStore(s => s.setActiveTool);
  const bodies        = useBuilderStore(s => s.bodies);
  const constraints   = useBuilderStore(s => s.constraints);

  const isSelectActive = activeTool === 'select';

  return (
    <div className="lpal-root">
      <div className="panel-header"><h3>Components</h3></div>
      <div className="custom-scroll lpal-scroll">

        <button
          onClick={() => setActiveTool('select')}
          className={`lpal-select-btn${isSelectActive ? ' lpal-select-btn--active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3zm7.07 2.83L17.6 14.6l-3.8 1.28L12.24 14l-2.17-8.17z"/></svg>
          <span className="lpal-select-label">Select / Move</span>
          {isSelectActive && <span className="lpal-select-key">V</span>}
        </button>

        <div className="lpal-section">Bodies</div>
        <div className="lpal-list">
          {BODY_TYPES.map(def => (
            <ComponentCard
              key={def.id}
              def={def}
              isActive={activeTool === def.id}
              onClick={() => setActiveTool(def.id)}
            />
          ))}
        </div>

        <div className="lpal-section">Constraints</div>
        <div className="lpal-list">
          {CONSTRAINT_TYPES.map(def => (
            <ComponentCard
              key={def.id}
              def={def}
              isActive={activeTool === def.id}
              onClick={() => setActiveTool(def.id)}
            />
          ))}
        </div>

        <div className="lpal-stats">
          {[{ label: 'Bodies', val: bodies.length }, { label: 'Joints', val: constraints.length }].map(({ label, val }) => (
            <div key={label} className="lpal-stat">
              <div className="lpal-stat-val">{val}</div>
              <div className="lpal-stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="lpal-shortcuts">
          <div className="lpal-shortcuts-title">Shortcuts</div>
          {[
            ['V / ESC',   'Select / cancel'],
            ['Del',       'Delete selected'],
            ['F',         'Fit all bodies'],
            ['Scroll',    'Zoom in/out'],
            ['Alt+Drag',  'Pan canvas'],
            ['RMB',       'Cancel wiring'],
          ].map(([key, desc]) => (
            <div key={key} className="lpal-shortcut-row">
              <code className="lpal-shortcut-key">{key}</code>
              <span className="lpal-shortcut-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
