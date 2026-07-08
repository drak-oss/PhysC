import React, { useState } from 'react';

export default function TechCard({ label, detail }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '22px 24px',
        background: hovered ? 'rgba(30,30,48,0.8)' : 'rgba(20,20,32,0.5)',
        border: `1px solid ${hovered ? 'rgba(124,111,239,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 12, transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
        color: '#a78bfa', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace',
      }}>
        {label}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{detail}</p>
    </div>
  );
}
