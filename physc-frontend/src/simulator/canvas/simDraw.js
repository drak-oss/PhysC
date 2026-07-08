import { drawConstraintScreenSpace } from '../../utils/drawing';

const BODY_STRIDE = 10;

export function drawArrow(ctx, fromX, fromY, dx, dy, color, lineWidth = 2) {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return;
  const angle  = Math.atan2(dy, dx);
  const ex = fromX + dx, ey = fromY + dy;
  const headLen = Math.max(6, Math.min(12, len * 0.25));

  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = lineWidth; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(ex - Math.cos(angle) * headLen * 0.5, ey - Math.sin(angle) * headLen * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - headLen * Math.cos(angle - 0.45), ey - headLen * Math.sin(angle - 0.45));
  ctx.lineTo(ex - headLen * Math.cos(angle + 0.45), ey - headLen * Math.sin(angle + 0.45));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawAngularArrow(ctx, cx, cy, radius, omega, color) {
  if (Math.abs(omega) < 0.05) return;
  const arcAngle  = Math.min(Math.abs(omega) * 0.8, Math.PI * 1.5);
  const r         = radius + 12;
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + (omega > 0 ? 1 : -1) * arcAngle;

  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle, omega < 0); ctx.stroke();

  const tx = cx + r * Math.cos(endAngle), ty = cy + r * Math.sin(endAngle);
  const tangent = endAngle + (omega > 0 ? Math.PI / 2 : -Math.PI / 2);
  const headLen = 9;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - headLen * Math.cos(tangent - 0.45), ty - headLen * Math.sin(tangent - 0.45));
  ctx.lineTo(tx - headLen * Math.cos(tangent + 0.45), ty - headLen * Math.sin(tangent + 0.45));
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

export function buildLiveData(data, count, idMap) {
  const reverseMap = {};
  for (const [rId, wIdx] of Object.entries(idMap)) reverseMap[wIdx] = parseInt(rId);

  const liveBodyData = {};
  for (let i = 0; i < count; i++) {
    const idx     = 1 + i * BODY_STRIDE;
    const reactId = reverseMap[Math.round(data[idx + 9])];
    if (reactId !== undefined) {
      liveBodyData[reactId] = {
        x:               data[idx + 1],
        y:               data[idx + 2],
        rotation:        data[idx + 3],
        vx:              data[idx + 6],
        vy:              data[idx + 7],
        angularVelocity: data[idx + 8],
      };
    }
  }
  return { reverseMap, liveBodyData };
}

export function drawSimGrid(ctx, canvas) {
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth   = 1;
  for (let gx = 0; gx <= canvas.width;  gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke(); }
  for (let gy = 0; gy <= canvas.height; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke(); }
}

export function drawBodiesLayer(ctx, data, count, reverseMap, liveBodyData, storeState) {
  const { selectedNodeId: selectedId, collidingIds, bodyVectors,
          showVelocityVectors: showAll, constraints, localAnchors, bodies } = storeState;

  for (let i = 0; i < count; i++) {
    const idx   = 1 + i * BODY_STRIDE;
    const type  = Math.round(data[idx]);
    const x     = data[idx + 1], y     = data[idx + 2];
    const rot   = data[idx + 3];
    const w     = data[idx + 4], h     = data[idx + 5];
    const vx    = data[idx + 6], vy    = data[idx + 7];
    const omega = data[idx + 8];

    const reactId     = reverseMap[Math.round(data[idx + 9])];
    const isSelected  = reactId !== undefined && reactId === selectedId;
    const isColliding = reactId !== undefined && collidingIds.has(reactId);
    const bodyDef     = bodies.find(b => b.id === reactId);
    const bodyType    = bodyDef?.type ?? 2;

    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);

    let fillColor, strokeColor, glowColor;
    if (isColliding)      { fillColor = 'rgba(239,68,68,0.65)';  strokeColor = '#f87171'; glowColor = '#ef4444'; }
    else if (isSelected)  { fillColor = 'rgba(139,92,246,0.7)';  strokeColor = '#a78bfa'; glowColor = '#a78bfa'; }
    else if (bodyType === 0) { fillColor = 'rgba(71,85,105,0.8)';  strokeColor = '#94a3b8'; glowColor = null; }
    else if (bodyType === 1) { fillColor = 'rgba(20,184,166,0.6)'; strokeColor = '#2dd4bf'; glowColor = null; }
    else                     { fillColor = 'rgba(249,115,22,0.75)';strokeColor = '#fb923c'; glowColor = null; }

    ctx.beginPath();
    if (type === 0) ctx.arc(0, 0, w, 0, Math.PI * 2);
    else            ctx.rect(-w/2, -h/2, w, h);
    ctx.fillStyle = fillColor; ctx.fill();
    if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = isColliding ? 16 : 12; }
    ctx.lineWidth   = isSelected || isColliding ? 2.5 : 1.5;
    ctx.strokeStyle = strokeColor; ctx.stroke(); ctx.shadowBlur = 0;

    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(type === 0 ? w * 0.8 : w / 2 * 0.8, 0);
    ctx.strokeStyle = isSelected ? '#ede9fe' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = 2; ctx.stroke();
    ctx.restore();

    
    const drawVectors = bodyType === 2 && (showAll || bodyVectors[reactId]);
    if (drawVectors) {
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > 0.5) {
        const scale = Math.min(speed * 0.15, 200) / speed;
        drawArrow(ctx, x, y, vx * scale, vy * scale, 'rgba(96,165,250,0.9)', 2.5);
        ctx.save();
        ctx.fillStyle = 'rgba(96,165,250,0.85)';
        ctx.font      = 'bold 10px Inter, sans-serif';
        ctx.fillText(`${speed.toFixed(0)} px/s`, x + vx * scale * 0.5 + 8, y + vy * scale * 0.5 - 4);
        ctx.restore();
      }

      let pivotX = x, pivotY = y;
      let visualR = type === 0 ? w : Math.min(w, h) / 2 + 5;

      const hinges = constraints.filter(c => c.type === 'Hinge' && (c.bodyA === reactId || c.bodyB === reactId));
      let pivotConstraint = hinges.find(c => {
        const otherId = c.bodyA === reactId ? c.bodyB : c.bodyA;
        if (!otherId) return true;
        const other = bodies.find(b => b.id === otherId);
        return other && other.type === 0;
      });
      if (!pivotConstraint && hinges.length === 1) pivotConstraint = hinges[0];

      if (pivotConstraint) {
        const la = localAnchors[pivotConstraint.id];
        if (la) {
          const isA = pivotConstraint.bodyA === reactId;
          const lx  = isA ? la.axA : la.axB, ly = isA ? la.ayA : la.ayB;
          pivotX = x + lx * Math.cos(rot) - ly * Math.sin(rot);
          pivotY = y + lx * Math.sin(rot) + ly * Math.cos(rot);
          visualR = Math.max(visualR, Math.sqrt(lx * lx + ly * ly));
        }
      }
      drawAngularArrow(ctx, pivotX, pivotY, visualR, omega, 'rgba(244,114,182,0.85)');
    }
  }
}

export function drawConstraintsLayer(ctx, storeState, liveBodyData) {
  const { selectedNodeId: selectedId, localAnchors, constraints, bodies } = storeState;

  for (const c of constraints) {
    if (c.visualType === 'hidden_hinge') continue;

    const isSelected = c.id === selectedId;
    const la    = localAnchors[c.id];
    const liveA = liveBodyData[c.bodyA];
    const liveB = liveBodyData[c.bodyB];

    let ax, ay, bx, by;
    if (c.type === 'Hinge' || c.type === 'Motor') {
      ax = c.ax1 ?? c.anchorX ?? 0; ay = c.ay1 ?? c.anchorY ?? 0;
      bx = c.ax2 ?? c.anchorX ?? 0; by = c.ay2 ?? c.anchorY ?? 0;
    } else if (c.type === 'Distance' || c.type === 'Spring' || c.type === 'Rod' || c.type === 'Slider') {
      ax = c.ax1 ?? 0; ay = c.ay1 ?? 0;
      bx = c.ax2 ?? 0; by = c.ay2 ?? 0;
    } else if (c.type === 'Pulley') {
      ax = c.localAx ?? 0; ay = c.localAy ?? 0;
      bx = c.localBx ?? 0; by = c.localBy ?? 0;
    } else {
      ax = liveA ? liveA.x : (c.anchorX ?? 0); ay = liveA ? liveA.y : (c.anchorY ?? 0);
      bx = liveB ? liveB.x : (c.anchorX ?? 0); by = liveB ? liveB.y : (c.anchorY ?? 0);
    }

    
    
    
    const isSingleStepMotor = c.visualType === 'motor' && c.ax1 !== undefined && c.ax1 === c.ax2 && c.ay1 === c.ay2;

    if (c.type === 'Slider') {
      if (la && liveA) {
        const cosA = Math.cos(liveA.rotation), sinA = Math.sin(liveA.rotation);
        ax = liveA.x + la.axA * cosA - la.ayA * sinA;
        ay = liveA.y + la.axA * sinA + la.ayA * cosA;
      }
      if (la && liveB) {
        const cosB = Math.cos(liveB.rotation), sinB = Math.sin(liveB.rotation);
        bx = liveB.x + la.axB * cosB - la.ayB * sinB;
        by = liveB.y + la.axB * sinB + la.ayB * cosB;
      }
    } else if (c._visualOnly && c.visualType === 'spring') {
      if (liveA) { ax = liveA.x; ay = liveA.y; }
      if (liveB) { bx = liveB.x; by = liveB.y; }
    } else if (!isSingleStepMotor) {
      if (la && liveA && c.type !== 'Weld') {
        const cosA = Math.cos(liveA.rotation), sinA = Math.sin(liveA.rotation);
        ax = liveA.x + la.axA * cosA - la.ayA * sinA;
        ay = liveA.y + la.axA * sinA + la.ayA * cosA;
      }
      if (la && liveB && c.type !== 'Weld') {
        const cosB = Math.cos(liveB.rotation), sinB = Math.sin(liveB.rotation);
        bx = liveB.x + la.axB * cosB - la.ayB * sinB;
        by = liveB.y + la.axB * sinB + la.ayB * cosB;
      }
    }

    let steps;
    if (c.visualType === 'pulley' && c.gxA !== undefined) {
      steps = [
        { worldPos: { x: c.gxA, y: c.gyA } },
        { worldPos: { x: ax, y: ay }, bodyId: c.bodyA },
        { worldPos: { x: bx, y: by }, bodyId: c.bodyB },
      ];
    } else if (c.visualType === 'slider') {
      const axLen = Math.hypot(c.axisX || 0, c.axisY || 0) || 1;
      const axDX  = (c.axisX || 0) / axLen, axDY = (c.axisY || 0) / axLen;
      const sliderT = (ax - bx) * axDX + (ay - by) * axDY;
      const hasMin  = c.minLimit !== null && c.minLimit !== undefined && isFinite(c.minLimit);
      const hasMax  = c.maxLimit !== null && c.maxLimit !== undefined && isFinite(c.maxLimit);
      const visStart = hasMax ? -c.maxLimit : Math.min(0, sliderT);
      const visEnd   = hasMin ? -c.minLimit : Math.max(axLen, sliderT);
      steps = [
        { worldPos: { x: bx + axDX * visStart, y: by + axDY * visStart } },
        { worldPos: { x: bx + axDX * visEnd,   y: by + axDY * visEnd   } },
        { worldPos: liveA ? { x: liveA.x, y: liveA.y } : { x: ax, y: ay }, bodyId: c.bodyA },
      ];
    } else if (isSingleStepMotor) {
      steps = [{ worldPos: { x: ax, y: ay } }];
    } else {
      steps = [
        { worldPos: { x: ax, y: ay }, bodyId: c.bodyA },
        { worldPos: { x: bx, y: by }, bodyId: c.bodyB },
      ];
    }

    drawConstraintScreenSpace(
      ctx,
      { id: c.id, type: c.visualType || c.type.toLowerCase(), steps, props: { targetOmega: c.targetOmega } },
      isSelected,
      bodies
    );
  }
}

export function drawBuilderOverlay(ctx, data, count, reverseMap, mouseRef, snappedPointRef, dragStartRef) {
  const mx = mouseRef.current.x, my = mouseRef.current.y;
  const SNAP_RADIUS = 18;
  let snappedPoint = null, minDist = SNAP_RADIUS;

  for (let i = 0; i < count; i++) {
    const idx     = 1 + i * BODY_STRIDE;
    const type    = Math.round(data[idx]);
    const bx = data[idx+1], by = data[idx+2], rot = data[idx+3];
    const bw = data[idx+4], bh = data[idx+5];
    const reactId = reverseMap[Math.round(data[idx + 9])];

    const localPts = [{ lx: 0, ly: 0, isCenter: true }];
    if (type === 1) {
      localPts.push(
        { lx: -bw/2, ly: -bh/2 }, { lx: bw/2, ly: -bh/2 },
        { lx: -bw/2, ly:  bh/2 }, { lx: bw/2, ly:  bh/2 },
        { lx: -bw/2, ly:    0  }, { lx: bw/2, ly:    0  },
        { lx:     0, ly: -bh/2 }, { lx:    0, ly:  bh/2 },
      );
    } else if (type === 0) {
      localPts.push(
        { lx:  bw, ly:  0 }, { lx: -bw, ly:  0 },
        { lx:   0, ly: bw }, { lx:   0, ly: -bw },
      );
    }

    for (const pt of localPts) {
      const wx = bx + pt.lx * Math.cos(rot) - pt.ly * Math.sin(rot);
      const wy = by + pt.lx * Math.sin(rot) + pt.ly * Math.cos(rot);
      const dist = Math.sqrt((wx - mx)**2 + (wy - my)**2);
      const isHot = dist < SNAP_RADIUS;

      ctx.beginPath(); ctx.arc(wx, wy, isHot ? 4 : 2.5, 0, Math.PI*2);
      ctx.fillStyle = pt.isCenter ? 'rgba(124,111,239,0.6)' : 'rgba(255,255,255,0.25)';
      ctx.fill();

      if (dist < minDist) { minDist = dist; snappedPoint = { wx, wy, reactId, lx: pt.lx, ly: pt.ly }; }
    }
  }

  snappedPointRef.current = snappedPoint;

  if (snappedPoint) {
    ctx.save();
    ctx.beginPath(); ctx.arc(snappedPoint.wx, snappedPoint.wy, 9, 0, Math.PI*2);
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2;
    ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 10;
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(167,139,250,0.35)';
    ctx.beginPath(); ctx.arc(snappedPoint.wx, snappedPoint.wy, 9, 0, Math.PI*2); ctx.fill();
  }

  const dragStart  = dragStartRef.current;
  const drawX = snappedPoint ? snappedPoint.wx : mx;
  const drawY = snappedPoint ? snappedPoint.wy : my;

  if (dragStart) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(dragStart.wx, dragStart.wy); ctx.lineTo(drawX, drawY);
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.stroke();
    ctx.restore();
  }
}

export function drawHUD(ctx, canvas, running, totalEnergy, displayFps, storeState) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(10, 10, 110, 48, 6); ctx.fill();
  ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'left';
  ctx.fillStyle = '#fde047'; ctx.fillText('⚡', 18, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(`${totalEnergy.toFixed(1)} J`, 38, 28);
  ctx.fillStyle = '#34d399'; ctx.fillText('⏱', 18, 48);
  ctx.fillText(`${displayFps} FPS`, 38, 48);

  if (running) {
    ctx.fillStyle = 'rgba(52,211,153,0.15)';
    ctx.beginPath(); ctx.roundRect(canvas.width - 120, 10, 110, 28, 6); ctx.fill();
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('● SIMULATING', canvas.width - 112, 28);
  }

  const { hasCollisions, collidingIds: cIds } = storeState;
  if (hasCollisions && !running) {
    ctx.fillStyle = 'rgba(239,68,68,0.13)';
    ctx.beginPath(); ctx.roundRect(10, canvas.height - 42, 320, 30, 6); ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(`⚠ ${cIds.size} body collision(s) — resolve before simulating`, 18, canvas.height - 22);
  }
}
