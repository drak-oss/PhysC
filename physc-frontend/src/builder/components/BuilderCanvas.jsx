import React, { useRef, useEffect } from 'react';
import { useBuilderStore, getAllAnchors } from '../builderStore';
import { CONSTRAINT_COMPONENTS } from '../componentRegistry';
import {
  w2s, drawGrid, drawAnchorBody, drawDisk, drawBlock,
  drawResizeHandle, drawRotateHandle, getRotateHandlePos, drawAnchorDot, drawGhost,
  drawConstraintScreenSpace,
} from '../canvas/builderDraw';
import { useBuilderInput } from '../canvas/useBuilderInput';
import './BuilderCanvas.css';

export default function BuilderCanvas() {
  const canvasRef     = useRef(null);
  const isPanning     = useRef(false);
  const panStart      = useRef({ x: 0, y: 0 });
  const panOrigin     = useRef({ x: 0, y: 0 });
  const dragBody      = useRef(null);
  const dragOffset    = useRef({ x: 0, y: 0 });
  const mouseWorld    = useRef({ x: 0, y: 0 });
  const snapTarget    = useRef(null);
  const isInitialized = useRef(false);
  const errorMsgRef   = useRef({ text: '', expires: 0 });
  const resizeHandle  = useRef(null);
  const rotateHandle  = useRef(null);

  const activeTool       = useBuilderStore(s => s.activeTool);
  const isConstraintTool = Object.keys(CONSTRAINT_COMPONENTS).includes(activeTool);
  const cursor = isConstraintTool ? 'crosshair' : activeTool === 'select' ? 'default' : 'cell';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      if (!isInitialized.current && canvas.width > 0) {
        isInitialized.current = true;
        useBuilderStore.getState().setPan(canvas.width / 2 - 600, canvas.height / 2 - 350);
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.width || !canvas.height) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const s = useBuilderStore.getState();
      const { panX, panY, zoom, bodies, constraints, selectedId, hoveredId,
              activeTool: tool, pendingConstraintType, pendingConstraintSteps,
              pendingConstraintError } = s;

      ctx.clearRect(0, 0, W, H);
      drawGrid(ctx, W, H, panX, panY, zoom);

      if (bodies.length === 0) {
        ctx.save(); ctx.textAlign = 'center';
        ctx.font = 'bold 26px Inter,sans-serif'; ctx.fillStyle = 'rgba(124,111,239,0.14)';
        ctx.fillText('Machine Canvas', W/2, H/2-10);
        ctx.font = '13px Inter,sans-serif'; ctx.fillStyle = 'rgba(90,91,120,0.65)';
        ctx.fillText('Select a component from the left panel, then click to place', W/2, H/2+22);
        ctx.restore();
      }

      for (const c of constraints) {
        const steps = (c.steps ?? [])
          .filter(st => st.worldPos != null)
          .map(st => ({ ...st, worldPos: { x: st.worldPos.x*zoom+panX, y: st.worldPos.y*zoom+panY } }));
        if (steps.length >= 1) {
          drawConstraintScreenSpace(ctx, { ...c, steps }, c.id === selectedId, bodies);
        }
      }

      if (pendingConstraintType && pendingConstraintSteps.length > 0) {
        const snap = snapTarget.current;
        const tx = snap ? snap.world.x*zoom+panX : mouseWorld.current.x*zoom+panX;
        const ty = snap ? snap.world.y*zoom+panY : mouseWorld.current.y*zoom+panY;
        for (let i = 0; i < pendingConstraintSteps.length-1; i++) {
          const a = pendingConstraintSteps[i], b = pendingConstraintSteps[i+1];
          ctx.save(); ctx.strokeStyle = 'rgba(52,211,153,0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,4]);
          ctx.beginPath(); ctx.moveTo(a.worldPos.x*zoom+panX, a.worldPos.y*zoom+panY);
          ctx.lineTo(b.worldPos.x*zoom+panX, b.worldPos.y*zoom+panY); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        }
        const last = pendingConstraintSteps[pendingConstraintSteps.length-1];
        ctx.save(); ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.5; ctx.setLineDash([6,4]);
        ctx.beginPath(); ctx.moveTo(last.worldPos.x*zoom+panX, last.worldPos.y*zoom+panY); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
        pendingConstraintSteps.forEach(st => {
          const px = st.worldPos.x*zoom+panX, py = st.worldPos.y*zoom+panY;
          ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI*2);
          ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
        });
        ctx.restore();
      }

      for (const body of bodies) {
        const { x: sx, y: sy } = w2s(body.x, body.y, panX, panY, zoom);
        const sel = body.id === selectedId, hov = body.id === hoveredId;
        if (body.type === 'staticAnchor' || body.type === 'dynamicAnchor') drawAnchorBody(ctx, sx, sy, zoom, sel, hov);
        else if (body.type === 'disk')  drawDisk(ctx, sx, sy, body.props.radius*zoom, body.rotation ?? 0, sel, hov);
        else if (body.type === 'block') drawBlock(ctx, sx, sy, body.props.width*zoom, body.props.height*zoom, body.rotation ?? 0, sel, hov);
        if (sel) {
          const hw = body.type === 'disk' ? body.props.radius*zoom : Math.max(body.props.width, body.props.height)*zoom/2;
          ctx.save(); ctx.font = 'bold 10px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(196,181,253,0.95)';
          ctx.fillText(body.name, sx, sy - hw - 8); ctx.restore();
        }
      }

      const isBTool = ['staticAnchor','dynamicAnchor','disk','block'].includes(tool);
      const isCTool = Object.keys(CONSTRAINT_COMPONENTS).includes(tool);
      const cDef    = isCTool ? CONSTRAINT_COMPONENTS[tool] : null;
      const stepDef = cDef?.steps?.[pendingConstraintSteps.length] ?? null;
      for (const body of bodies) {
        const isSel = body.id === selectedId, isHov = body.id === hoveredId;
        if (!isBTool && !isCTool && !isSel && !isHov) continue;
        for (const a of getAllAnchors(body)) {
          let isInvalid = false;
          if (isCTool && stepDef) {
            if (stepDef.bodyTypes && !stepDef.bodyTypes.includes(body.type)) isInvalid = true;
            if (stepDef.anchorKey && a.anchorKey !== stepDef.anchorKey)       isInvalid = true;
          }
          const { x: sx, y: sy } = w2s(a.world.x, a.world.y, panX, panY, zoom);
          const isSnap    = snapTarget.current?.bodyId === body.id && snapTarget.current?.anchorKey === a.anchorKey;
          const isPending = pendingConstraintSteps.some(ps => ps.bodyId === body.id && ps.anchorKey === a.anchorKey);
          drawAnchorDot(ctx, sx, sy, isSnap, a.isCenter, isPending, isInvalid && !isBTool);
        }
      }

      if (tool === 'select' && selectedId) {
        const selBody = bodies.find(b => b.id === selectedId);
        if (selBody && (selBody.type === 'disk' || selBody.type === 'block')) {
          for (const a of getAllAnchors(selBody)) {
            if (a.anchorKey === 'center') continue;
            const { x: rx, y: ry } = w2s(a.world.x, a.world.y, panX, panY, zoom);
            const isActive = resizeHandle.current?.bodyId === selBody.id && resizeHandle.current?.handleKey === a.anchorKey;
            drawResizeHandle(ctx, rx, ry, isActive);
          }
          const { x: hSx, y: hSy } = getRotateHandlePos(selBody, panX, panY, zoom);
          const { x: bSx, y: bSy } = w2s(selBody.x, selBody.y, panX, panY, zoom);
          ctx.save();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = 'rgba(52,211,153,0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(bSx, bSy); ctx.lineTo(hSx, hSy); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          const isRotating = rotateHandle.current?.bodyId === selBody.id;
          drawRotateHandle(ctx, hSx, hSy, isRotating);
        }
      }

      if (snapTarget.current && (isBTool || isCTool)) {
        const { x: sx, y: sy } = w2s(snapTarget.current.world.x, snapTarget.current.world.y, panX, panY, zoom);
        ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI*2);
        ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();
      }

      if (isBTool) {
        const sn = snapTarget.current;
        const gx = sn ? sn.world.x*zoom+panX : mouseWorld.current.x*zoom+panX;
        const gy = sn ? sn.world.y*zoom+panY : mouseWorld.current.y*zoom+panY;
        drawGhost(ctx, tool, gx, gy, zoom, !!sn);
      }

      if (isCTool && cDef) {
        const totalSteps = cDef.steps.length, done = pendingConstraintSteps.length;
        const label = done < totalSteps ? `Step ${done+1}/${totalSteps}: ${cDef.steps[done]?.label ?? ''}` : `All steps complete`;
        const note  = done < totalSteps ? cDef.steps[done]?.note : null;
        const boxW = 420, boxH = note ? 52 : 36;
        const boxX = W/2 - boxW/2, boxY = H - boxH - 12;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 8); ctx.fill();
        ctx.textAlign = 'center';
        if (note) {
          ctx.font = '11px Inter,sans-serif'; ctx.fillStyle = 'rgba(196,181,253,0.95)';
          ctx.fillText(label, W/2, boxY+19);
          ctx.font = '9.5px Inter,sans-serif'; ctx.fillStyle = 'rgba(148,163,184,0.85)';
          ctx.fillText(note, W/2, boxY+38);
        } else {
          ctx.font = '11px Inter,sans-serif'; ctx.fillStyle = 'rgba(196,181,253,0.95)';
          ctx.fillText(label, W/2, boxY + boxH/2 + 4);
        }
        ctx.restore();
      }

      const now = Date.now();
      if (pendingConstraintError || (errorMsgRef.current.text && errorMsgRef.current.expires > now)) {
        const msg = pendingConstraintError || errorMsgRef.current.text;
        if (pendingConstraintError) errorMsgRef.current = { text: pendingConstraintError, expires: now + 2500 };
        const alpha = Math.min(1, (errorMsgRef.current.expires - now) / 500);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(239,68,68,0.6)'; ctx.beginPath(); ctx.roundRect(W/2-220, H-100, 440, 36, 8); ctx.fill();
        ctx.font = 'bold 11px Inter,sans-serif'; ctx.fillStyle = '#fecaca'; ctx.textAlign = 'center';
        ctx.fillText('⚠ ' + msg, W/2, H-77);
        ctx.globalAlpha = 1; ctx.restore();
      }

      ctx.save(); ctx.font = '10px JetBrains Mono,monospace'; ctx.fillStyle = 'rgba(90,91,120,0.7)';
      ctx.textAlign = 'right'; ctx.fillText(`${(zoom*100).toFixed(0)}%`, W-10, H-10);
      ctx.textAlign = 'left';  ctx.fillText(`${mouseWorld.current.x.toFixed(0)}, ${mouseWorld.current.y.toFixed(0)}`, 10, H-10);
      ctx.restore();
    };

    const loop = () => { try { draw(); } catch (e) { console.error('[BuilderCanvas] draw error:', e); } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const { handleMouseMove, handleMouseDown, handleMouseUp, handleClick, handleContextMenu } = useBuilderInput({
    canvasRef, snapTarget, mouseWorld, isPanning, panStart, panOrigin, dragBody, dragOffset, resizeHandle, rotateHandle,
  });

  return (
    <div className="bc-wrap">
      <canvas
        ref={canvasRef}
        className="bc-canvas"
        style={{ cursor }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
