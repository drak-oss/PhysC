import { getAllAnchors } from '../builderStore';
export { drawConstraintScreenSpace } from '../../utils/drawing';

export const SNAP_RADIUS = 24;

export function w2s(wx, wy, panX, panY, zoom) {
  return { x: wx * zoom + panX, y: wy * zoom + panY };
}
export function s2w(sx, sy, panX, panY, zoom) {
  return { x: (sx - panX) / zoom, y: (sy - panY) / zoom };
}

export function drawGrid(ctx, W, H, panX, panY, zoom) {
  const fine  = 50 * zoom;
  const major = fine * 5;
  const fsx = ((panX % fine)  + fine)  % fine;
  const fsy = ((panY % fine)  + fine)  % fine;
  const msx = ((panX % major) + major) % major;
  const msy = ((panY % major) + major) % major;

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  for (let x = fsx; x <= W; x += fine)  { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = fsy; y <= H; y += fine)  { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  for (let x = msx; x <= W; x += major) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = msy; y <= H; y += major) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  ctx.strokeStyle = 'rgba(124,111,239,0.18)';
  if (panX >= 0 && panX <= W) { ctx.beginPath(); ctx.moveTo(panX,0); ctx.lineTo(panX,H); ctx.stroke(); }
  if (panY >= 0 && panY <= H) { ctx.beginPath(); ctx.moveTo(0,panY); ctx.lineTo(W,panY); ctx.stroke(); }
}

export function drawAnchorBody(ctx, sx, sy, zoom, sel, hov) {
  const r = Math.max(8, 10 * Math.min(zoom, 1.5));
  ctx.save(); ctx.translate(sx, sy);
  if (sel) { ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 16; }
  ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = sel ? '#a78bfa' : hov ? '#94a3b8' : '#334155';
  ctx.lineWidth = sel ? 2.5 : 1.5; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = sel ? 'rgba(139,92,246,0.2)' : 'rgba(51,65,85,0.4)'; ctx.fill();
  const arm = r * 0.55;
  ctx.strokeStyle = sel ? '#c4b5fd' : '#64748b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-arm, 0); ctx.lineTo(arm, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -arm); ctx.lineTo(0, arm); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = sel ? '#a78bfa' : '#475569'; ctx.fill();
  ctx.restore();
}

export function drawDisk(ctx, sx, sy, r, rot, sel, hov) {
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot);
  const fill   = sel ? 'rgba(139,92,246,0.5)' : hov ? 'rgba(249,115,22,0.45)' : 'rgba(249,115,22,0.28)';
  const stroke = sel ? '#a78bfa' : '#fb923c';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (sel) { ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 14; }
  ctx.strokeStyle = stroke; ctx.lineWidth = sel ? 2.5 : 1.5; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.82, 0);
  ctx.strokeStyle = sel ? '#ede9fe' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

export function drawBlock(ctx, sx, sy, sw, sh, rot, sel, hov) {
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot);
  const fill   = sel ? 'rgba(139,92,246,0.5)' : hov ? 'rgba(96,165,250,0.4)' : 'rgba(96,165,250,0.22)';
  const stroke = sel ? '#a78bfa' : '#60a5fa';
  ctx.beginPath(); ctx.rect(-sw/2, -sh/2, sw, sh);
  ctx.fillStyle = fill; ctx.fill();
  if (sel) { ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 14; }
  ctx.strokeStyle = stroke; ctx.lineWidth = sel ? 2.5 : 1.5; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sw * 0.38, 0);
  ctx.strokeStyle = sel ? '#ede9fe' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

export function getRotateHandlePos(body, panX, panY, zoom) {
  const rot = body.rotation ?? 0;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const halfH = body.type === 'disk' ? body.props.radius : body.props.height / 2;
  const dist = halfH + 30 / zoom; 
  
  const wHx = body.x + dist * sin;
  const wHy = body.y - dist * cos;
  return w2s(wHx, wHy, panX, panY, zoom);
}

export function drawRotateHandle(ctx, sx, sy, isActive) {
  const r = 7;
  ctx.save();
  if (isActive) { ctx.shadowColor = '#34d399'; ctx.shadowBlur = 10; }
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle   = isActive ? 'rgba(52,211,153,0.9)' : 'rgba(52,211,153,0.72)';
  ctx.strokeStyle = isActive ? '#6ee7b7' : 'rgba(52,211,153,0.85)';
  ctx.lineWidth   = 1.5;
  ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  
  ctx.beginPath();
  ctx.arc(sx, sy, r - 2.5, -Math.PI * 0.65, Math.PI * 0.75, false);
  ctx.strokeStyle = isActive ? '#064e3b' : 'rgba(2,44,34,0.8)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  
  const endAng = Math.PI * 0.75;
  const ax = sx + (r - 2.5) * Math.cos(endAng);
  const ay = sy + (r - 2.5) * Math.sin(endAng);
  ctx.save();
  ctx.translate(ax, ay); ctx.rotate(endAng + Math.PI / 2);
  ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(2, 1); ctx.lineTo(-2, 1); ctx.closePath();
  ctx.fillStyle = isActive ? '#064e3b' : 'rgba(2,44,34,0.8)';
  ctx.fill(); ctx.restore();
  ctx.restore();
}

export function drawResizeHandle(ctx, sx, sy, isActive) {
  const s = 5;
  ctx.save();
  ctx.fillStyle   = isActive ? '#a78bfa' : 'rgba(220,220,255,0.9)';
  ctx.strokeStyle = isActive ? '#7c6fef' : '#64748b';
  ctx.lineWidth   = 1.5;
  ctx.shadowColor = isActive ? '#a78bfa' : 'transparent';
  ctx.shadowBlur  = isActive ? 8 : 0;
  ctx.fillRect(sx-s, sy-s, s*2, s*2);
  ctx.strokeRect(sx-s, sy-s, s*2, s*2);
  ctx.restore();
}

export function drawAnchorDot(ctx, sx, sy, isSnap, isCenter, isPending, isInvalid) {
  const r = isSnap ? 6 : isCenter ? 4 : 3;
  ctx.save();
  if (isSnap && !isInvalid) { ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 10; }
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2);
  if (isInvalid)      { ctx.fillStyle = 'rgba(239,68,68,0.7)';   ctx.strokeStyle = '#f87171'; }
  else if (isPending) { ctx.fillStyle = 'rgba(52,211,153,0.85)';  ctx.strokeStyle = '#34d399'; }
  else if (isSnap)    { ctx.fillStyle = 'rgba(167,139,250,0.75)'; ctx.strokeStyle = '#a78bfa'; }
  else if (isCenter)  { ctx.fillStyle = 'rgba(124,111,239,0.55)'; ctx.strokeStyle = 'rgba(124,111,239,0.9)'; }
  else                { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; }
  ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();
}

export function drawGhost(ctx, tool, sx, sy, zoom, snapped) {
  ctx.save(); ctx.setLineDash([5,4]); ctx.globalAlpha = snapped ? 0.55 : 0.35;
  if (tool === 'staticAnchor' || tool === 'dynamicAnchor') {
    const r = 12 * Math.min(zoom, 2);
    ctx.beginPath(); ctx.arc(sx, sy, r+4, 0, Math.PI*2); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx-r*0.6, sy); ctx.lineTo(sx+r*0.6, sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy-r*0.6); ctx.lineTo(sx, sy+r*0.6); ctx.stroke();
  } else if (tool === 'disk') {
    const r = 40 * zoom;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(249,115,22,0.2)'; ctx.fill();
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (tool === 'block') {
    const hw = 40*zoom, hh = 20*zoom;
    ctx.beginPath(); ctx.rect(sx-hw, sy-hh, hw*2, hh*2);
    ctx.fillStyle = 'rgba(96,165,250,0.2)'; ctx.fill();
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.restore();
}

export function findSnapTarget(screenX, screenY, bodies, panX, panY, zoom, stepDef) {
  let best = null, bestDist = SNAP_RADIUS;
  for (const body of bodies) {
    if (stepDef?.bodyTypes && !stepDef.bodyTypes.includes(body.type)) continue;
    for (const a of getAllAnchors(body)) {
      if (stepDef?.anchorKey && a.anchorKey !== stepDef.anchorKey) continue;
      const { x: sx, y: sy } = w2s(a.world.x, a.world.y, panX, panY, zoom);
      const dist = Math.hypot(sx-screenX, sy-screenY);
      if (dist < bestDist) { bestDist = dist; best = { bodyId: body.id, bodyType: body.type, anchorKey: a.anchorKey, world: a.world }; }
    }
  }
  return best;
}
