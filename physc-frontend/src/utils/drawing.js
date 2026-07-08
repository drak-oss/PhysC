export function drawSpring(ctx, ax, ay, bx, by, sel) {
  const dx = bx-ax, dy = by-ay, len = Math.hypot(dx, dy);
  if (len < 2) return;
  const coils = Math.max(3, Math.round(len/16)), amp = Math.min(9, len*0.12);
  ctx.save(); ctx.translate(ax,ay); ctx.rotate(Math.atan2(dy,dx));
  ctx.strokeStyle = sel ? '#c4b5fd' : '#818cf8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0,0);
  const seg = len/(coils*2+1);
  for (let i=0;i<coils;i++) { ctx.lineTo(seg*(2*i+1),-amp); ctx.lineTo(seg*(2*i+2),amp); }
  ctx.lineTo(len,0); ctx.stroke();
  [[0,0],[len,0]].forEach(([ex,ey])=>{ ctx.beginPath();ctx.arc(ex,ey,3,0,Math.PI*2);ctx.fillStyle=sel?'#a78bfa':'#6366f1';ctx.fill(); });
  ctx.restore();
}

export function drawRod(ctx, ax, ay, bx, by, sel) {
  ctx.save(); ctx.lineCap='round';
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=(sel?5:4)+1;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
  ctx.strokeStyle=sel?'#a78bfa':'#94a3b8'; ctx.lineWidth=sel?4.5:3.5;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
  [[ax,ay],[bx,by]].forEach(([px,py])=>{
    ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);
    ctx.fillStyle=sel?'#c4b5fd':'#64748b';ctx.fill();
    ctx.strokeStyle=sel?'#a78bfa':'#475569';ctx.lineWidth=1.5;ctx.stroke();
  });
  ctx.restore();
}

export function drawHinge(ctx, ax, ay, bx, by, sel) {
  ctx.save();
  ctx.setLineDash([6,4]); ctx.strokeStyle=sel?'#6ee7b7':'#34d399'; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.setLineDash([]);
  [[ax,ay],[bx,by]].forEach(([px,py])=>{
    ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);
    ctx.fillStyle=sel?'rgba(110,231,183,0.5)':'rgba(52,211,153,0.35)';ctx.fill();
    ctx.strokeStyle=sel?'#6ee7b7':'#34d399';ctx.lineWidth=1.5;ctx.stroke();
  });
  ctx.restore();
}

export function drawMotor(ctx, ax, ay, bx, by, omega, sel) {
  ctx.save();
  ctx.setLineDash([5,3]);ctx.strokeStyle=sel?'#6ee7b7':'#34d399';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.setLineDash([]);
  const mx=(ax+bx)/2,my=(ay+by)/2,r=14;
  ctx.strokeStyle=sel?'#86efac':'#4ade80';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(mx,my,r,-Math.PI*0.2,Math.PI*1.2,(omega??-2)<0);ctx.stroke();
  const ea=(omega??-2)<0?Math.PI*1.2:-Math.PI*0.2;
  ctx.beginPath();ctx.arc(mx+r*Math.cos(ea),my+r*Math.sin(ea),3,0,Math.PI*2);
  ctx.fillStyle=sel?'#86efac':'#4ade80';ctx.fill();
  ctx.restore();
}

export function drawWeld(ctx, ax, ay, bx, by, sel) {
  ctx.save();
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  if (len > 1) {
    const ux = dx/len, uy = dy/len, nx = -uy, ny = ux;
    
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    
    ctx.strokeStyle = sel ? '#f9a8d4' : '#ec4899'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    
    const hW = 7;
    ctx.strokeStyle = sel ? '#fce7f3' : '#f9a8d4'; ctx.lineWidth = 2;
    for (const t of [0.3, 0.5, 0.7]) {
      const px = ax + ux * len * t, py = ay + uy * len * t;
      ctx.beginPath();
      ctx.moveTo(px - nx * hW, py - ny * hW);
      ctx.lineTo(px + nx * hW, py + ny * hW);
      ctx.stroke();
    }
  }
  
  [[ax,ay],[bx,by]].forEach(([px,py]) => {
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
    ctx.fillStyle = sel ? '#fce7f3' : '#f9a8d4'; ctx.fill();
    ctx.strokeStyle = sel ? '#f9a8d4' : '#ec4899'; ctx.lineWidth = 1.5; ctx.stroke();
  });
  ctx.restore();
}

export function drawSlider(ctx, steps, sel) {
  
  if (steps.length < 1) return;
  const s0 = steps[0], s1 = steps[1], s2 = steps[2];
  ctx.save();

  if (s0 && s1) {
    const dx = s1.worldPos.x - s0.worldPos.x, dy = s1.worldPos.y - s0.worldPos.y;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      const ux = dx/len, uy = dy/len;   
      const nx = -uy,    ny = ux;        
      const x0 = s0.worldPos.x, y0 = s0.worldPos.y;
      const x1 = s1.worldPos.x, y1 = s1.worldPos.y;
      const rail   = sel ? '#c084fc' : '#a855f7';
      const fill   = sel ? 'rgba(192,132,252,0.1)' : 'rgba(168,85,247,0.07)';
      const RW = 4;   
      const CW = 9;   

      
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(x0+nx*RW, y0+ny*RW); ctx.lineTo(x1+nx*RW, y1+ny*RW);
      ctx.lineTo(x1-nx*RW, y1-ny*RW); ctx.lineTo(x0-nx*RW, y0-ny*RW);
      ctx.closePath(); ctx.fill();

      
      ctx.strokeStyle = rail; ctx.lineWidth = 1.5;
      for (const s of [1, -1]) {
        ctx.beginPath();
        ctx.moveTo(x0+nx*RW*s, y0+ny*RW*s);
        ctx.lineTo(x1+nx*RW*s, y1+ny*RW*s);
        ctx.stroke();
      }

      
      ctx.lineWidth = 3;
      for (const [ex, ey] of [[x0,y0],[x1,y1]]) {
        ctx.beginPath();
        ctx.moveTo(ex+nx*CW, ey+ny*CW);
        ctx.lineTo(ex-nx*CW, ey-ny*CW);
        ctx.stroke();
      }

      
      if (s2) {
        const sx = s2.worldPos.x, sy = s2.worldPos.y;
        const cW = RW + 5, cH = 10;
        ctx.fillStyle = sel ? 'rgba(192,132,252,0.35)' : 'rgba(168,85,247,0.25)';
        ctx.strokeStyle = rail; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx+ux*cH+nx*cW, sy+uy*cH+ny*cW);
        ctx.lineTo(sx-ux*cH+nx*cW, sy-uy*cH+ny*cW);
        ctx.lineTo(sx-ux*cH-nx*cW, sy-uy*cH-ny*cW);
        ctx.lineTo(sx+ux*cH-nx*cW, sy+uy*cH-ny*cW);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2);
        ctx.fillStyle = rail; ctx.fill();
      }
    }
  } else if (s0) {
    
    ctx.beginPath(); ctx.arc(s0.worldPos.x, s0.worldPos.y, 6, 0, Math.PI*2);
    ctx.fillStyle = sel?'rgba(192,132,252,0.5)':'rgba(168,85,247,0.35)'; ctx.fill();
    ctx.strokeStyle = sel?'#c084fc':'#a855f7'; ctx.lineWidth=1.5; ctx.stroke();
  }

  ctx.restore();
}

export function drawPulley(ctx, steps, sel) {
  if (steps.length < 1) return;
  const s0=steps[0], s1=steps[1], s2=steps[2];
  ctx.save();
  ctx.strokeStyle=sel?'#67e8f9':'#22d3ee'; ctx.lineWidth=1.5;
  if (s0 && s1) { ctx.beginPath();ctx.moveTo(s0.worldPos.x,s0.worldPos.y);ctx.lineTo(s1.worldPos.x,s1.worldPos.y);ctx.stroke(); }
  if (s0 && s2) { ctx.beginPath();ctx.moveTo(s0.worldPos.x,s0.worldPos.y);ctx.lineTo(s2.worldPos.x,s2.worldPos.y);ctx.stroke(); }
  [s1,s2].filter(Boolean).forEach(s=>{
    ctx.beginPath();ctx.arc(s.worldPos.x,s.worldPos.y,5,0,Math.PI*2);
    ctx.fillStyle=sel?'rgba(103,232,249,0.5)':'rgba(34,211,238,0.35)';ctx.fill();
    ctx.strokeStyle=sel?'#67e8f9':'#22d3ee';ctx.lineWidth=1.5;ctx.stroke();
  });
  if (s0) {
    ctx.beginPath();ctx.arc(s0.worldPos.x,s0.worldPos.y,10,0,Math.PI*2);
    ctx.strokeStyle=sel?'#67e8f9':'#22d3ee';ctx.lineWidth=2;ctx.stroke();
  }
  ctx.restore();
}

export function drawConstraintScreenSpace(ctx, c, sel, allBodies) {
  const steps = c.steps ?? [];
  if (steps.length < 1) return;

  const ax = steps[0].worldPos.x, ay = steps[0].worldPos.y;
  let bx = ax, by = ay;
  if (steps.length > 1) {
    bx = steps[1].worldPos.x; by = steps[1].worldPos.y;
  }

  switch (c.type) {
    case 'hidden_hinge': break; 
    case 'spring':  if (steps.length > 1) drawSpring(ctx, ax, ay, bx, by, sel); break;
    case 'rod':     if (steps.length > 1) drawRod(ctx, ax, ay, bx, by, sel);
                    else { 
                      ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI*2);
                      ctx.fillStyle=sel?'rgba(148,163,184,0.55)':'rgba(100,116,139,0.35)';ctx.fill();
                      ctx.strokeStyle=sel?'#a78bfa':'#94a3b8';ctx.lineWidth=2;ctx.stroke();
                      const arm=4; ctx.strokeStyle=sel?'#c4b5fd':'#64748b';ctx.lineWidth=1.5;
                      ctx.beginPath();ctx.moveTo(ax-arm,ay-arm);ctx.lineTo(ax+arm,ay+arm);ctx.stroke();
                      ctx.beginPath();ctx.moveTo(ax+arm,ay-arm);ctx.lineTo(ax-arm,ay+arm);ctx.stroke();
                      ctx.restore();
                    }
                    break;
    case 'hinge':   drawHinge(ctx, ax, ay, bx, by, sel); break;
    case 'motor':   drawMotor(ctx, ax, ay, bx, by, c.props?.targetOmega, sel); break;
    case 'weld':    if (steps.length > 1) drawWeld(ctx, ax, ay, bx, by, sel); break;
    case 'slider':  drawSlider(ctx, steps, sel); break;
    case 'pulley':  drawPulley(ctx, steps, sel); break;
    default:        drawHinge(ctx, ax, ay, bx, by, sel); break;
  }
}
