import React, { useState } from 'react';

export default function FeatureCard({ icon, color, title, body }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '28px 28px 30px',
        background: hovered ? 'rgba(30,30,48,0.9)' : 'rgba(20,20,32,0.7)',
        border: `1px solid ${hovered ? color + '40' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16,
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 8px 32px ${color}18` : 'none',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, marginBottom: 20,
        transition: 'all 0.25s ease',
        boxShadow: hovered ? `0 0 20px ${color}22` : 'none',
      }}>
        {icon}
      </div>
      <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{body}</p>
    </div>
  );
}
