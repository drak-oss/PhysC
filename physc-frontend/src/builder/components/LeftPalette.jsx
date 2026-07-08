import React from 'react';
import { useBuilderStore } from '../builderStore';
import { BODY_TYPES, CONSTRAINT_TYPES } from '../componentRegistry';
import { IconAnchor, IconDisk, IconBlock, IconSpring, IconRod, IconHinge, IconMotor, IconWeld, IconPulley, IconSlider } from '../../components/icons/BuilderIcons';

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

function hexToRgb(hex) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  } catch { return '148,163,184'; }
}

function ComponentCard({ def, isActive, onClick }) {
  const Icon  = ICONS[def.id] ?? (() => <span style={{fontSize:18}}>⬤</span>);
  const color = COLORS[def.id] ?? '#94a3b8';

  return (
    <button
      onClick={onClick}
      title={def.description}
      style={{
        background:   isActive ? `rgba(${hexToRgb(color)}, 0.12)` : 'transparent',
        border:       `1px solid ${isActive ? color : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius)',
        padding:      '9px 10px',
        cursor:       'pointer',
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
        textAlign:    'left',
        color:        isActive ? color : 'var(--text-secondary)',
        transition:   'all 0.15s ease',
        boxShadow:    isActive ? `0 0 0 1px ${color}40, inset 0 0 14px ${color}18` : 'none',
        width:        '100%',
      }}
    >
      <span style={{ color: isActive ? color : 'var(--text-muted)', opacity: isActive ? 1 : 0.65, flexShrink: 0, display: 'flex', alignItems: 'center', width: 20, height: 20 }}>
        <Icon />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2, color: isActive ? color : 'var(--text-primary)' }}>{def.label}</div>
        <div style={{ fontSize: '9.5px', color: isActive ? color : 'var(--text-muted)', marginTop: '2px', opacity: 0.8, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{def.description}</div>
      </div>
      {isActive && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
    </button>
  );
}

export default function LeftPalette() {
  const activeTool    = useBuilderStore(s => s.activeTool);
  const setActiveTool = useBuilderStore(s => s.setActiveTool);
  const bodies        = useBuilderStore(s => s.bodies);
  const constraints   = useBuilderStore(s => s.constraints);

  const SECTION_LABEL = (txt) => (
    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-disabled)', textTransform: 'uppercase', margin: '12px 0 6px', paddingBottom: 4, borderBottom: '1px solid var(--border-subtle)' }}>
      {txt}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
      <div className="panel-header"><h3>Components</h3></div>
      <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>

        <button
          onClick={() => setActiveTool('select')}
          style={{
            background:   activeTool === 'select' ? 'var(--accent-dim)' : 'var(--bg-surface)',
            border:       `1px solid ${activeTool === 'select' ? 'var(--accent)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius)',
            padding:      '8px 10px',
            cursor:       'pointer',
            display:      'flex', alignItems: 'center', gap: 10,
            color:        activeTool === 'select' ? 'var(--accent-light)' : 'var(--text-secondary)',
            width:        '100%',
            marginBottom: 4,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3zm7.07 2.83L17.6 14.6l-3.8 1.28L12.24 14l-2.17-8.17z"/></svg>
          <span style={{ fontSize: '12px', fontWeight: 700 }}>Select / Move</span>
          {activeTool === 'select' && <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--accent)', fontWeight: 600 }}>V</span>}
        </button>

        {SECTION_LABEL('Bodies')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {BODY_TYPES.map(def => (
            <ComponentCard
              key={def.id}
              def={def}
              isActive={activeTool === def.id}
              onClick={() => setActiveTool(def.id)}
            />
          ))}
        </div>

        {SECTION_LABEL('Constraints')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {CONSTRAINT_TYPES.map(def => (
            <ComponentCard
              key={def.id}
              def={def}
              isActive={activeTool === def.id}
              onClick={() => setActiveTool(def.id)}
            />
          ))}
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[{ label: 'Bodies', val: bodies.length }, { label: 'Joints', val: constraints.length }].map(({ label, val }) => (
            <div key={label} style={{ background: 'var(--bg-void)', borderRadius: 6, padding: 8, textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-light)', fontFamily: "'JetBrains Mono', monospace" }}>{val}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, padding: '8px', background: 'var(--bg-void)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-disabled)', textTransform: 'uppercase', marginBottom: 6 }}>Shortcuts</div>
          {[
            ['V / ESC',   'Select / cancel'],
            ['Del',       'Delete selected'],
            ['F',         'Fit all bodies'],
            ['Scroll',    'Zoom in/out'],
            ['Alt+Drag',  'Pan canvas'],
            ['RMB',       'Cancel wiring'],
          ].map(([key, desc]) => (
            <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <code style={{ fontSize:'9px', background:'var(--bg-panel)', borderRadius:3, padding:'1px 5px', color:'var(--accent-light)', fontFamily:"'JetBrains Mono',monospace" }}>{key}</code>
              <span style={{ fontSize:'9px', color:'var(--text-muted)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
