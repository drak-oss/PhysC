import React from 'react';

export default function XPBDDiagram() {
  return (
    <svg width="280" height="240" viewBox="0 0 280 240" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c6fef" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7c6fef" stopOpacity="0" />
        </radialGradient>
        <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill="#a78bfa" />
        </marker>
        <marker id="arrowOrange" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill="#fb923c" />
        </marker>
      </defs>
      <ellipse cx="140" cy="120" rx="120" ry="100" fill="url(#glow)" />

      <line x1="80" y1="80" x2="200" y2="160"
        stroke="#7c6fef" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />

      <circle cx="80" cy="80" r="26" fill="rgba(124,111,239,0.1)" stroke="#7c6fef" strokeWidth="1.8" />
      <circle cx="80" cy="80" r="4" fill="#7c6fef" />
      <text x="80" y="84" textAnchor="middle" fill="#a78bfa" fontSize="10" fontFamily="monospace">A</text>

      <rect x="174" y="134" width="52" height="52" rx="6"
        fill="rgba(124,111,239,0.08)" stroke="#7c6fef" strokeWidth="1.8" />
      <circle cx="200" cy="160" r="4" fill="#7c6fef" />
      <text x="200" y="164" textAnchor="middle" fill="#a78bfa" fontSize="10" fontFamily="monospace">B</text>

      <line x1="80" y1="80" x2="95" y2="90"
        stroke="#a78bfa" strokeWidth="1.8" markerEnd="url(#arrow)" />
      <line x1="200" y1="160" x2="185" y2="150"
        stroke="#a78bfa" strokeWidth="1.8" markerEnd="url(#arrow)" />

      <line x1="80" y1="80" x2="60" y2="52"
        stroke="#fb923c" strokeWidth="1.5" markerEnd="url(#arrowOrange)" opacity="0.75" />
      <line x1="200" y1="160" x2="220" y2="185"
        stroke="#fb923c" strokeWidth="1.5" markerEnd="url(#arrowOrange)" opacity="0.75" />

      <text x="140" y="112" textAnchor="middle" fill="#7c6fef" fontSize="9" fontFamily="monospace" opacity="0.8">constraint</text>
      <text x="56" y="46" fill="#fb923c" fontSize="9" fontFamily="monospace" opacity="0.7">v</text>
      <text x="222" y="196" fill="#fb923c" fontSize="9" fontFamily="monospace" opacity="0.7">v</text>
      <text x="100" y="86" fill="#a78bfa" fontSize="9" fontFamily="monospace" opacity="0.9">Δx</text>
      <text x="165" y="148" fill="#a78bfa" fontSize="9" fontFamily="monospace" opacity="0.9">Δx</text>

      <text x="140" y="220" textAnchor="middle" fill="rgba(160,154,247,0.5)" fontSize="9" fontFamily="monospace">position correction per iteration</text>
    </svg>
  );
}
