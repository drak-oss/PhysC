import { useCallback, useEffect } from 'react';
import { useBuilderStore, getAllAnchors } from '../builderStore';
import { CONSTRAINT_COMPONENTS, validateConstraintStep } from '../componentRegistry';
import { s2w, w2s, findSnapTarget, getRotateHandlePos } from './builderDraw';

export function useBuilderInput({ canvasRef, snapTarget, mouseWorld, isPanning, panStart, panOrigin, dragBody, dragOffset, resizeHandle, rotateHandle }) {

  const getPos = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, [canvasRef]);

  const updateSnap = useCallback((screenX, screenY) => {
    const { panX, panY, zoom, bodies, activeTool: tool,
            pendingConstraintType, pendingConstraintSteps } = useBuilderStore.getState();
    const isBTool = ['staticAnchor','dynamicAnchor','disk','block'].includes(tool);
    const isCTool = Object.keys(CONSTRAINT_COMPONENTS).includes(tool);
    if (!isBTool && !isCTool) { snapTarget.current = null; return; }

    let stepDef = null;
    if (isCTool && pendingConstraintType) {
      const cDef = CONSTRAINT_COMPONENTS[pendingConstraintType] ?? CONSTRAINT_COMPONENTS[tool];
      stepDef = cDef?.steps?.[pendingConstraintSteps.length] ?? null;
    }
    snapTarget.current = findSnapTarget(screenX, screenY, bodies, panX, panY, zoom, stepDef);
  }, [snapTarget]);

  const updateHover = useCallback((screenX, screenY) => {
    const { panX, panY, zoom, bodies, setHovered } = useBuilderStore.getState();
    let best = null;
    for (let i = bodies.length-1; i >= 0; i--) {
      const b = bodies[i];
      const { x: bsx, y: bsy } = w2s(b.x, b.y, panX, panY, zoom);
      const dx = screenX - bsx, dy = screenY - bsy;
      let inside = false;
      if (b.type === 'disk')       inside = Math.hypot(dx, dy) < b.props.radius * zoom;
      else if (b.type === 'block') inside = Math.abs(dx) <= (b.props.width * zoom)/2 && Math.abs(dy) <= (b.props.height * zoom)/2;
      else if (['staticAnchor','dynamicAnchor'].includes(b.type)) inside = Math.hypot(dx, dy) < 15;
      if (inside && (!best || b.id > best.id)) best = b;
    }
    setHovered(best?.id, best ? 'body' : null);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const { x: sx, y: sy } = getPos(e);
    const { panX, panY, zoom, activeTool: tool, setPan, updateBody, updateBodyProps } = useBuilderStore.getState();
    mouseWorld.current = s2w(sx, sy, panX, panY, zoom);

    if (isPanning.current) {
      const dx = sx - panStart.current.x, dy = sy - panStart.current.y;
      setPan(panOrigin.current.x + dx, panOrigin.current.y + dy);
      return;
    }

    if (resizeHandle.current) {
      const state = useBuilderStore.getState();
      const body  = state.bodies.find(b => b.id === resizeHandle.current.bodyId);
      if (body) {
        const mouse = mouseWorld.current;
        if (body.type === 'disk') {
          updateBodyProps(body.id, { radius: Math.max(10, Math.round(Math.hypot(mouse.x - body.x, mouse.y - body.y))) });
        } else if (body.type === 'block') {
          const rot = body.rotation ?? 0;
          const cosR = Math.cos(-rot), sinR = Math.sin(-rot);
          const dx = mouse.x - body.x, dy = mouse.y - body.y;
          const lx = dx * cosR - dy * sinR, ly = dx * sinR + dy * cosR;
          const key = resizeHandle.current.handleKey;
          const upd = {};
          if (['left','right','top-left','top-right','bottom-left','bottom-right'].includes(key))
            upd.width  = Math.max(10, Math.round(Math.abs(lx) * 2));
          if (['top','bottom','top-left','top-right','bottom-left','bottom-right'].includes(key))
            upd.height = Math.max(10, Math.round(Math.abs(ly) * 2));
          if (Object.keys(upd).length) updateBodyProps(body.id, upd);
        }
        const updBody = useBuilderStore.getState().bodies.find(b => b.id === resizeHandle.current.bodyId);
        if (updBody) {
          const bodyAnchors = getAllAnchors(updBody);
          useBuilderStore.setState({
            constraints: useBuilderStore.getState().constraints.map(c => ({
              ...c,
              steps: (c.steps ?? []).map(st => {
                if (st.bodyId !== updBody.id) return st;
                const a = bodyAnchors.find(a => a.anchorKey === st.anchorKey);
                return a ? { ...st, worldPos: a.world } : st;
              }),
            })),
          });
        }
      }
      return;
    }

    if (rotateHandle.current) {
      const state = useBuilderStore.getState();
      const body  = state.bodies.find(b => b.id === rotateHandle.current.bodyId);
      if (body) {
        const mouse = mouseWorld.current;
        const currentAngle = Math.atan2(mouse.y - body.y, mouse.x - body.x);
        const delta = currentAngle - rotateHandle.current.startAngle;
        const newRot = rotateHandle.current.startRot + delta;
        updateBody(body.id, { rotation: newRot });
        const updBody = useBuilderStore.getState().bodies.find(b => b.id === body.id);
        if (updBody) {
          const bodyAnchors = getAllAnchors(updBody);
          useBuilderStore.setState({
            constraints: useBuilderStore.getState().constraints.map(c => ({
              ...c,
              steps: (c.steps ?? []).map(st => {
                if (st.bodyId !== updBody.id) return st;
                const a = bodyAnchors.find(a => a.anchorKey === st.anchorKey);
                return a ? { ...st, worldPos: a.world } : st;
              }),
            })),
          });
        }
      }
      return;
    }

    if (dragBody.current !== null) {
      const w = mouseWorld.current;
      let newX = w.x - dragOffset.current.x, newY = w.y - dragOffset.current.y;

      
      const st = useBuilderStore.getState();
      const slC = st.constraints.find(c =>
        c.type === 'slider' && c.steps?.length === 3 && c.steps[2]?.bodyId === dragBody.current
      );
      if (slC) {
        const s0 = slC.steps[0], s1 = slC.steps[1];
        if (s0 && s1) {
          const ddx = s1.worldPos.x - s0.worldPos.x, ddy = s1.worldPos.y - s0.worldPos.y;
          const len = Math.hypot(ddx, ddy);
          if (len > 0) {
            const ux = ddx/len, uy = ddy/len;
            const dragged   = st.bodies.find(b => b.id === dragBody.current);
            const anchorKey = slC.steps[2].anchorKey;
            const tempBody  = dragged ? { ...dragged, x: newX, y: newY } : null;
            const anchorA   = tempBody ? getAllAnchors(tempBody).find(a => a.anchorKey === anchorKey) : null;
            const awX = anchorA ? anchorA.world.x : newX, awY = anchorA ? anchorA.world.y : newY;
            const t   = (awX - s0.worldPos.x) * ux + (awY - s0.worldPos.y) * uy;
            newX = (s0.worldPos.x + t*ux) - (awX - newX);
            newY = (s0.worldPos.y + t*uy) - (awY - newY);
          }
        }
      }

      updateBody(dragBody.current, { x: newX, y: newY });
      const state = useBuilderStore.getState();
      const moved = state.bodies.find(b => b.id === dragBody.current);
      if (moved) {
        const bodyAnchors = getAllAnchors(moved);
        useBuilderStore.setState({
          constraints: state.constraints.map(c => ({
            ...c,
            steps: (c.steps ?? []).map(s => {
              if (s.bodyId !== moved.id) return s;
              const a = bodyAnchors.find(a => a.anchorKey === s.anchorKey);
              return a ? { ...s, worldPos: a.world } : s;
            }),
          })),
        });
      }
      return;
    }

    
    if (tool === 'select') {
      const { selectedId, bodies: bods } = useBuilderStore.getState();
      let onResize = false, onRotate = false;
      if (selectedId) {
        const selBody = bods.find(b => b.id === selectedId);
        if (selBody && (selBody.type === 'disk' || selBody.type === 'block')) {
          for (const a of getAllAnchors(selBody)) {
            if (a.anchorKey === 'center') continue;
            const { x: ax, y: ay } = w2s(a.world.x, a.world.y, panX, panY, zoom);
            if (Math.hypot(sx-ax, sy-ay) <= 10) { onResize = true; break; }
          }
          if (!onResize) {
            const { x: hx, y: hy } = getRotateHandlePos(selBody, panX, panY, zoom);
            if (Math.hypot(sx - hx, sy - hy) <= 12) onRotate = true;
          }
        }
      }
      if (canvasRef.current)
        canvasRef.current.style.cursor = onResize ? 'crosshair' : onRotate ? 'grab' : 'default';
    }

    updateSnap(sx, sy);
    if (tool === 'select') updateHover(sx, sy);
  }, [canvasRef, getPos, updateSnap, updateHover, snapTarget, mouseWorld, isPanning, panStart, panOrigin, dragBody, dragOffset, resizeHandle, rotateHandle]);

  const handleMouseDown = useCallback((e) => {
    const { x: sx, y: sy } = getPos(e);
    const { panX, panY, zoom, activeTool: tool, hoveredId, bodies, selectedId, setSelected } = useBuilderStore.getState();
    const w = s2w(sx, sy, panX, panY, zoom);

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true; panStart.current = { x: sx, y: sy };
      panOrigin.current = { x: panX, y: panY }; e.preventDefault(); return;
    }

    
    if (e.button === 0 && tool === 'select' && selectedId) {
      const selBody = bodies.find(b => b.id === selectedId);
      if (selBody && (selBody.type === 'disk' || selBody.type === 'block')) {
        const { x: hx, y: hy } = getRotateHandlePos(selBody, panX, panY, zoom);
        if (Math.hypot(sx - hx, sy - hy) <= 12) {
          rotateHandle.current = {
            bodyId:     selBody.id,
            startAngle: Math.atan2(w.y - selBody.y, w.x - selBody.x),
            startRot:   selBody.rotation ?? 0,
          };
          if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
          return;
        }
      }
    }

    
    if (e.button === 0 && tool === 'select' && selectedId) {
      const selBody = bodies.find(b => b.id === selectedId);
      if (selBody && (selBody.type === 'disk' || selBody.type === 'block')) {
        for (const a of getAllAnchors(selBody)) {
          if (a.anchorKey === 'center') continue;
          const { x: ax, y: ay } = w2s(a.world.x, a.world.y, panX, panY, zoom);
          if (Math.hypot(sx-ax, sy-ay) <= 10) {
            resizeHandle.current = { bodyId: selBody.id, handleKey: a.anchorKey };
            if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
            return;
          }
        }
      }
    }
    if (e.button === 0 && tool === 'select' && hoveredId) {
      dragBody.current = hoveredId;
      const body = bodies.find(b => b.id === hoveredId);
      if (body) { dragOffset.current = { x: w.x - body.x, y: w.y - body.y }; setSelected(hoveredId, 'body'); }
    }
  }, [canvasRef, getPos, isPanning, panStart, panOrigin, resizeHandle, rotateHandle, dragBody, dragOffset]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false; dragBody.current = null; resizeHandle.current = null; rotateHandle.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, [canvasRef, isPanning, dragBody, resizeHandle, rotateHandle]);

  const handleClick = useCallback((e) => {
    if (e.button !== 0) return;
    const { x: sx, y: sy } = getPos(e);
    const { panX, panY, zoom, activeTool: tool, bodies,
            pendingConstraintType, pendingConstraintSteps,
            addBody, addConstraint, setSelected, clearSelected,
            startConstraintWiring, pushConstraintStep, setConstraintError,
            clearPendingConstraint, setActiveTool } = useBuilderStore.getState();
    const w    = s2w(sx, sy, panX, panY, zoom);
    const snap = snapTarget.current;

    if (['staticAnchor','dynamicAnchor','disk','block'].includes(tool)) {
      const px = snap ? snap.world.x : w.x, py = snap ? snap.world.y : w.y;
      const id = addBody(tool, px, py);
      if (id) {
        setSelected(id, 'body');
        if (tool === 'staticAnchor' && snap?.bodyId) {
          const snappedBody = bodies.find(b => b.id === snap.bodyId);
          if (snappedBody && snappedBody.type !== 'staticAnchor') {
            addConstraint({
              type: 'hinge',
              steps: [
                { bodyId: id, anchorKey: 'center', worldPos: { x: px, y: py } },
                { bodyId: snap.bodyId, anchorKey: snap.anchorKey, worldPos: { x: snap.world.x, y: snap.world.y } },
              ],
              props: { compliance: 0.0 },
            });
          }
        }
      }
      return;
    }

    const isCTool = Object.keys(CONSTRAINT_COMPONENTS).includes(tool);
    if (isCTool) {
      const cDef        = CONSTRAINT_COMPONENTS[tool];
      const isFirstStep = !pendingConstraintType;
      const stepIdx     = isFirstStep ? 0 : pendingConstraintSteps.length;
      const stepDef     = cDef.steps[stepIdx];

      let actualSnap = snap;
      if (!snap) {
        if (stepDef?.allowFreeSpace) {
          actualSnap = { bodyId: undefined, anchorKey: undefined, world: { x: w.x, y: w.y } };
        } else {
          setConstraintError('Click an anchor point (highlighted dot) to start wiring');
          return;
        }
      }

      if (isFirstStep) {
        startConstraintWiring(tool);
        const body   = bodies.find(b => b.id === actualSnap.bodyId);
        const result = validateConstraintStep(stepDef, body, actualSnap.anchorKey, []);
        if (!result.valid) { setConstraintError(result.reason); clearPendingConstraint(); return; }
        const newStep = { bodyId: actualSnap.bodyId, anchorKey: actualSnap.anchorKey, worldPos: { ...actualSnap.world } };
        if (1 >= cDef.steps.length) {
          addConstraint({ type: tool, steps: [newStep], props: { ...(cDef.defaultProps ?? {}) } });
          clearPendingConstraint(); setActiveTool('select');
        } else {
          pushConstraintStep(newStep);
        }
        return;
      }

      const body   = bodies.find(b => b.id === actualSnap.bodyId);
      const result = validateConstraintStep(stepDef, body, actualSnap.anchorKey, pendingConstraintSteps);
      if (!result.valid) { setConstraintError(result.reason); return; }

      let newSteps = [...pendingConstraintSteps, { bodyId: actualSnap.bodyId, anchorKey: actualSnap.anchorKey, worldPos: { ...actualSnap.world } }];

      if (newSteps.length >= cDef.steps.length) {
        
        if (tool === 'slider' && newSteps.length === 3) {
          const s0 = newSteps[0], s1 = newSteps[1], s2 = newSteps[2];
          const dx = s1.worldPos.x - s0.worldPos.x, dy = s1.worldPos.y - s0.worldPos.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            const ux = dx/len, uy = dy/len;
            const t = (s2.worldPos.x - s0.worldPos.x)*ux + (s2.worldPos.y - s0.worldPos.y)*uy;
            const projX = s0.worldPos.x + t*ux, projY = s0.worldPos.y + t*uy;
            if (Math.hypot(projX - s2.worldPos.x, projY - s2.worldPos.y) > 0.5) {
              const slBody = bodies.find(b => b.id === s2.bodyId);
              if (slBody) {
                const anchorA = getAllAnchors(slBody).find(a => a.anchorKey === s2.anchorKey);
                const offX = anchorA ? anchorA.world.x - slBody.x : 0;
                const offY = anchorA ? anchorA.world.y - slBody.y : 0;
                useBuilderStore.getState().updateBody(s2.bodyId, { x: projX - offX, y: projY - offY });
                const movedBody = { ...slBody, x: projX - offX, y: projY - offY };
                const bAnchors  = getAllAnchors(movedBody);
                newSteps = newSteps.map((st, i) => {
                  if (i !== 2 || st.bodyId !== s2.bodyId) return st;
                  const a = bAnchors.find(a => a.anchorKey === st.anchorKey);
                  return a ? { ...st, worldPos: a.world } : st;
                });
              }
            }
          }
        }
        addConstraint({ type: tool, steps: newSteps, props: { ...(cDef.defaultProps ?? {}) } });
        clearPendingConstraint(); setActiveTool('select');
      } else {
        pushConstraintStep({ bodyId: actualSnap.bodyId, anchorKey: actualSnap.anchorKey, worldPos: { ...actualSnap.world } });
      }
      return;
    }

    if (tool === 'select') {
      let best = null;
      for (let i = bodies.length-1; i >= 0; i--) {
        const b = bodies[i];
        const { x: bsx, y: bsy } = w2s(b.x, b.y, panX, panY, zoom);
        const dx = sx - bsx, dy = sy - bsy;
        let inside = false;
        if (b.type === 'disk')       inside = Math.hypot(dx, dy) < b.props.radius * zoom;
        else if (b.type === 'block') inside = Math.abs(dx) <= (b.props.width * zoom)/2 && Math.abs(dy) <= (b.props.height * zoom)/2;
        else if (['staticAnchor','dynamicAnchor'].includes(b.type)) inside = Math.hypot(dx, dy) < 15;
        if (inside && (!best || b.id > best.id)) best = b;
      }
      if (best) setSelected(best.id, 'body'); else clearSelected();
    }
  }, [getPos, snapTarget]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    useBuilderStore.getState().setActiveTool('select');
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') useBuilderStore.getState().setActiveTool('select');
      if ((e.key === 'Delete' || e.key === 'Backspace') && e.target === document.body) {
        const { selectedId, selectedType, removeBody, removeConstraint } = useBuilderStore.getState();
        if (selectedId && selectedType === 'body')       removeBody(selectedId);
        if (selectedId && selectedType === 'constraint') removeConstraint(selectedId);
      }
      if (e.key === 'f' || e.key === 'F') {
        const { bodies, setPan, setZoom } = useBuilderStore.getState();
        const canvas = canvasRef.current;
        if (!canvas || bodies.length === 0) return;
        const xs = bodies.map(b => b.x), ys = bodies.map(b => b.y);
        const minX = Math.min(...xs)-100, maxX = Math.max(...xs)+100;
        const minY = Math.min(...ys)-100, maxY = Math.max(...ys)+100;
        const nz = Math.max(0.1, Math.min(3, Math.min(canvas.width/(maxX-minX), canvas.height/(maxY-minY))));
        setZoom(nz); setPan(canvas.width/2 - ((minX+maxX)/2)*nz, canvas.height/2 - ((minY+maxY)/2)*nz);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canvasRef]);

  return { handleMouseMove, handleMouseDown, handleMouseUp, handleClick, handleContextMenu };
}
