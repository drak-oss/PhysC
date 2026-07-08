import React from 'react';

export default function StepCard({ step, color, title, body, isLast }) {
  return (
    <div style={{ position: 'relative' }}>
      {!isLast && (
        <div style={{
          position: 'absolute', top: 22, left: '100%',
          width: 24, height: 1,
          background: `linear-gradient(90deg, ${color}50, transparent)`,
          zIndex: 0, display: 'none',
        }} />
      )}
      <div style={{
        padding: '28px 24px 26px',
        background: 'rgba(20,20,32,0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 14,
        height: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${color}15`, border: `1px solid ${color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace',
            flexShrink: 0,
          }}>
            {step}
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{body}</p>
      </div>
    </div>
  );
}
