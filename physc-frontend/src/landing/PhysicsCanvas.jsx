import React, { useRef, useEffect } from 'react';

const COLORS = { accent: '#7c6fef', orange: '#fb923c', teal: '#2dd4bf' };

export default function PhysicsCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const N = 18;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r:  Math.random() * 3 + 2,
      hue: Math.random() > 0.5 ? 'accent' : (Math.random() > 0.5 ? 'orange' : 'teal'),
    }));

    const edges = [];
    for (let i = 0; i < N; i++) {
      const j = (i + 1 + Math.floor(Math.random() * 3)) % N;
      edges.push([i, j]);
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }

      for (const [i, j] of edges) {
        const a = nodes[i], b = nodes[j];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist > 300) continue;
        const alpha = (1 - dist / 300) * 0.22;
        ctx.save();
        ctx.strokeStyle = `rgba(124,111,239,${alpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,154,247,${alpha * 1.6})`; ctx.fill();
        ctx.restore();
      }

      for (const n of nodes) {
        const color = COLORS[n.hue];
        ctx.save();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.75;
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55, pointerEvents: 'none' }}
    />
  );
}
