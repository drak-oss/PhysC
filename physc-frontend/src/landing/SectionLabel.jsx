import React from 'react';

export default function SectionLabel({ label, center }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'rgba(124,111,239,0.1)', border: '1px solid rgba(124,111,239,0.22)',
      borderRadius: 100, padding: '4px 14px',
      fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '1.2px',
      textTransform: 'uppercase', marginBottom: 8,
      ...(center ? { display: 'flex', justifyContent: 'center' } : {}),
    }}>
      {label}
    </div>
  );
}
