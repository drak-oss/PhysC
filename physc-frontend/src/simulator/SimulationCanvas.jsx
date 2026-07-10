import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getConstraintDef } from '../builder/componentRegistry';
import { useSetupScene } from './canvas/useSetupScene';
import {
    buildLiveData,
    drawSimGrid,
    drawBodiesLayer,
    drawConstraintsLayer,
    drawBuilderOverlay,
    drawHUD,
} from './canvas/simDraw';
import './SimulationCanvas.css';

const BODY_STRIDE = 10;

const G_BUILTIN = 980;

const SimulationCanvas = ({ api, running, builderMode = 'select' }) => {
    const canvasRef      = useRef(null);
    const mouseRef       = useRef({ x: -1000, y: -1000 });
    const snappedPointRef = useRef(null);
    const dragStartRef   = useRef(null);
    const ready          = !!api;

    const [sceneSetupDone, setSceneSetupDone] = useState(false);
    const sceneVersion = useEditorStore(s => s.sceneVersion);
    const gravity      = useEditorStore(s => s.gravity);
    const gravityRef   = useRef(gravity);
    useEffect(() => { gravityRef.current = gravity; }, [gravity]);

    useSetupScene({ api, ready, sceneVersion, setSceneSetupDone });

    const activeTool    = useEditorStore(s => s.activeTool);
    const activeToolRef = useRef(activeTool);
    useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

    const handleCanvasMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect   = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        mouseRef.current = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top)  * scaleY,
        };
    }, []);

    const handleCanvasMouseDown = useCallback(async (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const mx    = mouseRef.current.x;
        const my    = mouseRef.current.y;
        const mode  = activeToolRef.current;
        const store = useEditorStore.getState();

        if (mode === 'disk' || mode === 'block') {
            const sp     = snappedPointRef.current;
            const spawnX = sp ? sp.wx : mx;
            const spawnY = sp ? sp.wy : my;
            const newId  = Date.now();
            let newBody  = null;

            if (mode === 'disk') {
                newBody = { id: newId, name: 'Disk', type: 2, shape: 'Circle', radius: 30, x: spawnX, y: spawnY, rotation: 0, density: 0.01, mass: 1, restitution: 0.4, friction: 0.6, collisionCategory: 'A', collisionMask: 'A', isStatic: false };
                store.addBody(newBody);
                const wasmId = await api.addCircle({ ...newBody, categoryBits: 1, maskBits: 1 });
                if (wasmId !== undefined) store.setIdMap({ ...store.idMap, [newId]: wasmId });
            } else {
                newBody = { id: newId, name: 'Block', type: 2, shape: 'Box', w: 60, h: 60, x: spawnX, y: spawnY, rotation: 0, density: 0.01, mass: 1, restitution: 0.3, friction: 0.6, collisionCategory: 'A', collisionMask: 'A', isStatic: false };
                store.addBody(newBody);
                const wasmId = await api.addBox({ ...newBody, categoryBits: 1, maskBits: 1 });
                if (wasmId !== undefined) store.setIdMap({ ...store.idMap, [newId]: wasmId });
            }
            api.requestRenderData();
            store.setActiveTool('select');
            return;
        }

        const isConstraintTool = ['hinge','motor','spring','rod','weld','slider'].includes(mode);
        if (isConstraintTool) {
            dragStartRef.current = snappedPointRef.current
                ? { ...snappedPointRef.current }
                : { wx: mx, wy: my, reactId: null };
            return;
        }

        if (mode === 'select') {
            const data = api.getLatestRenderData();
            if (!data) return;
            const count      = data[0];
            const reverseMap = {};
            for (const [rId, wIdx] of Object.entries(store.idMap)) reverseMap[wIdx] = parseInt(rId);

            let hitId = null;
            for (let i = 0; i < count; i++) {
                const idx  = 1 + i * BODY_STRIDE;
                const type = Math.round(data[idx]);
                const x = data[idx+1], y = data[idx+2], w = data[idx+4], h = data[idx+5];
                const hit = type === 0
                    ? (mx-x)**2 + (my-y)**2 <= w*w
                    : mx >= x-w/2 && mx <= x+w/2 && my >= y-h/2 && my <= y+h/2;
                if (hit) { hitId = reverseMap[Math.round(data[idx+9])]; break; }
            }
            store.setSelectedNodeId(hitId ?? null);
        }
    }, [api]);

    const handleCanvasMouseUp = useCallback(async () => {
        const mode      = activeToolRef.current;
        const dragStart = dragStartRef.current;
        dragStartRef.current = null;
        if (!dragStart) return;

        const store    = useEditorStore.getState();
        const endPoint = snappedPointRef.current;
        const mx = mouseRef.current.x, my = mouseRef.current.y;

        const bodyA   = dragStart.reactId || null;
        const bodyB   = endPoint ? endPoint.reactId : null;
        const ax1 = dragStart.wx, ay1 = dragStart.wy;
        const ax2 = endPoint ? endPoint.wx : mx;
        const ay2 = endPoint ? endPoint.wy : my;

        if (bodyA === bodyB) return;

        const newConstraint = {
            id: Date.now() + 1,
            visualType: mode,
            type: mode.charAt(0).toUpperCase() + mode.slice(1),
            bodyA, bodyB,
            anchorX: ax1, anchorY: ay1,
            ax1, ay1, ax2, ay2,
        };

        if (mode === 'pulley') {
            newConstraint.bodyAnchorAX = ax1; newConstraint.bodyAnchorAY = ay1;
            newConstraint.bodyAnchorBX = ax2; newConstraint.bodyAnchorBY = ay2;
            newConstraint.pulleyAnchorX = (ax1 + ax2) / 2;
            newConstraint.pulleyAnchorY = Math.min(ay1, ay2) - 100;
        }

        const cDef = getConstraintDef(mode);
        if (cDef?.defaultProps) Object.assign(newConstraint, cDef.defaultProps);

        store.addConstraint(newConstraint);

        const freshMap = useEditorStore.getState().idMap;
        const mc = { ...newConstraint, bodyA: freshMap[bodyA], bodyB: freshMap[bodyB] };

        if      (mode === 'hinge'                 && api.addHingeConstraint)    api.addHingeConstraint(mc);
        else if ((mode === 'spring' || mode === 'rod') && api.addDistanceConstraint) api.addDistanceConstraint(mc);
        else if (mode === 'motor'                 && api.addMotorConstraint)  { api.addHingeConstraint?.(mc); api.addMotorConstraint(mc); }
        else if (mode === 'weld'                  && api.addWeldConstraint)     api.addWeldConstraint(mc);

        store.setActiveTool('select');
        api.requestRenderData();
    }, [api]);

    useEffect(() => {
        if (!ready) return;

        let animationFrameId;
        let lastTime    = performance.now();
        let accumulator = 0.0;
        const fixedDt   = 1.0 / 60.0;
        let fpsFrames   = 0;
        let fpsTimer    = performance.now();
        let displayFps  = 0;

        const draw = () => {
            fpsFrames++;
            const now = performance.now();
            if (now - fpsTimer >= 500) {
                displayFps = Math.round(fpsFrames / ((now - fpsTimer) / 1000));
                fpsFrames  = 0;
                fpsTimer   = now;
            }

            try {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const data = api.getLatestRenderData();
                if (!data) return;

                const count = data[0];
                if (count > 1000 || count < 0) {
                    ctx.fillStyle = '#ef4444';
                    ctx.font = 'bold 14px Inter, sans-serif';
                    ctx.fillText('Error: Invalid shape count ' + count, 20, 40);
                    return;
                }

                const storeState = useEditorStore.getState();
                const { reverseMap, liveBodyData } = buildLiveData(data, count, storeState.idMap);

                useEditorStore.getState().setLiveBodyData(liveBodyData);

                drawSimGrid(ctx, canvas);
                drawBodiesLayer(ctx, data, count, reverseMap, liveBodyData, storeState);
                drawConstraintsLayer(ctx, storeState, liveBodyData);

                if (activeToolRef.current !== 'select') {
                    drawBuilderOverlay(ctx, data, count, reverseMap, mouseRef, snappedPointRef, dragStartRef);
                }

                const totalEnergy = api.getLatestEnergy() || 0;
                drawHUD(ctx, canvas, running, totalEnergy, displayFps, storeState);
            } catch (err) { console.error(err); }
        };

        const tick = () => {
            const time      = performance.now();
            const frameTime = (time - lastTime) / 1000.0;
            lastTime = time;

            if (running && sceneSetupDone) {
                accumulator += Math.min(frameTime, 0.1);
                while (accumulator >= fixedDt) {
                    const g = gravityRef.current;
                    if (g !== 1.0) {
                        const rd = api.getLatestRenderData();
                        if (rd) {
                            const count  = Math.round(rd[0]);
                            const extraVy = (g - 1.0) * G_BUILTIN * fixedDt;
                            for (let i = 0; i < count; i++) {
                                const idx = 1 + i * BODY_STRIDE;
                                api.setLinearVelocity({
                                    bodyId: Math.round(rd[idx + 9]),
                                    vx:     rd[idx + 6],
                                    vy:     rd[idx + 7] + extraVy,
                                });
                            }
                        }
                    }
                    api.step(fixedDt, 20);
                    accumulator -= fixedDt;
                }
            } else {
                api.requestRenderData();
            }

            draw();
            animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationFrameId);
    }, [ready, api, running, sceneSetupDone]);

    if (!ready) return <div className="canvas-placeholder">Initializing Physics Engine…</div>;

    const cursorStyle = builderMode === 'select' ? 'default'
        : builderMode === 'place_spring' ? 'crosshair'
        : 'cell';

    return (
        <div className="canvas-wrapper">
            <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                className="simulation-canvas"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                title={activeTool === 'select' ? 'Click a body to select it' : 'Click to place — hover near bodies to snap'}
                style={{ cursor: cursorStyle }}
            />
        </div>
    );
};

export default SimulationCanvas;
