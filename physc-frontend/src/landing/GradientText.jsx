import React from 'react';

export default function GradientText({ children }) {
  return (
    <span style={{
      background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    }}>
      {children}
    </span>
  );
}
