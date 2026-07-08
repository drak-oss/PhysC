import React from 'react';

export const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" strokeDasharray="4 3"/>
        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
      </svg>
    ),
    color: '#7c6fef',
    title: 'XPBD Constraint Solver',
    body: 'Built on Extended Position Based Dynamics — the same algorithm used in AAA game engines. Numerically stable at any timestep, no energy explosions, predictable behavior under stiff constraints.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    color: '#fb923c',
    title: 'WebAssembly Speed',
    body: 'The physics core is written in C++ and compiled to WASM via Emscripten. Every collision check and constraint iteration runs at near-native CPU speed — directly in your browser tab.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <path d="M17.5 17.5h.01"/><line x1="17.5" y1="14" x2="17.5" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/>
      </svg>
    ),
    color: '#34d399',
    title: 'Visual Machine Builder',
    body: 'A point-and-click canvas editor lets you place rigid bodies, snap anchor points, and wire constraints in a multi-step guided flow — no physics knowledge required to start building.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
    color: '#60a5fa',
    title: 'Rich Constraint Library',
    body: 'Hinge, distance spring, rod, motor, weld, slider, and pulley — each with inspector-tunable compliance, limits, and damping. Mix freely to build pendulums, engines, cranes, and more.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    color: '#f472b6',
    title: 'Real-time Energy Monitor',
    body: 'Track total system energy (kinetic + potential) while the simulation runs. A flat energy curve means your constraints are stable; a rising one flags a numerical problem before it blows up.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
      </svg>
    ),
    color: '#2dd4bf',
    title: 'Collision & Ignore System',
    body: 'Assign each body to a collision layer (A, B, C, or None) to control which bodies can touch each other. You can also mark specific pairs to never collide at all.',
  },
];

export const HOW_IT_WORKS = [
  {
    step: '01',
    color: '#7c6fef',
    title: 'Place Bodies',
    body: 'Choose disks, blocks, static pins, or dynamic anchors from the left palette and click the canvas to place them. Drag to reposition, resize handles to scale.',
  },
  {
    step: '02',
    color: '#fb923c',
    title: 'Wire Constraints',
    body: 'Select a constraint type (hinge, spring, motor…) and follow the step-by-step guide. Click anchor points on bodies in sequence — the system validates each step.',
  },
  {
    step: '03',
    color: '#34d399',
    title: 'Run the Simulation',
    body: 'Hit the Simulate button. Bodies fall, springs stretch, hinges pivot. Use Step mode to advance one tick at a time and watch constraints resolve frame by frame.',
  },
  {
    step: '04',
    color: '#60a5fa',
    title: 'Inspect & Iterate',
    body: 'Select any body or constraint in the hierarchy panel. Tune mass, compliance, motor speed, and limits in the inspector — live during simulation or paused.',
  },
];

export const TECH_STACK = [
  { label: 'C++ Physics Core', detail: 'Rigid-body dynamics, broad/narrow-phase collision detection, XPBD constraint resolution — all written in C++ and compiled to WASM.' },
  { label: 'Emscripten / WASM', detail: 'emcc compiles the engine to WebAssembly, exposing a typed JS API via Embind. A Web Worker runs the physics loop off the main thread.' },
  { label: 'React 18 + Zustand', detail: 'Reactive UI with Zustand stores for builder and simulator state. Canvas rendering via requestAnimationFrame — never inside React render.' },
  { label: 'Vite 8', detail: 'Sub-second HMR during development. Production bundle tree-shakes unused code; WASM binary is served as a separate chunk and streamed at runtime.' },
];

export const sectionHeadingStyle = {
  margin: '12px 0 0', fontSize: 'clamp(28px, 3.5vw, 44px)',
  fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1.2px',
  color: 'var(--text-primary)',
};

export const sectionSubStyle = {
  margin: '16px 0 0', color: 'var(--text-secondary)',
  fontSize: 16, lineHeight: 1.65, maxWidth: 560,
};
