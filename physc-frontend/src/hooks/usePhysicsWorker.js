import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { computeLocalAnchors } from '../utils/localAnchors';

export function usePhysicsWorker() {
    const workerRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(null);
    const renderDataRef = useRef(null);
    const energyRef = useRef(0);
    const msgIdCounter = useRef(0);
    const callbacks = useRef(new Map());

    useEffect(() => {
        const worker = new Worker('/physicsWorker.js');
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const msg = e.data;
            switch (msg.type) {
                case 'INIT_SUCCESS':
                    setReady(true);
                    break;
                case 'INIT_ERROR':
                    setError(new Error(msg.error));
                    break;
                case 'RENDER_DATA':
                    renderDataRef.current = msg.payload;
                    energyRef.current = msg.energy;
                    break;
                case 'RESULT':
                    if (callbacks.current.has(msg.id)) {
                        callbacks.current.get(msg.id)(msg.result);
                        callbacks.current.delete(msg.id);
                    }
                    break;
                default:
                    console.log("Unhandled worker message:", msg);
            }
        };

        worker.onerror = (err) => { setError(err); };
        return () => { worker.terminate(); };
    }, []);

    const sendMessage = (type, payload) => {
        if (!workerRef.current) return;
        workerRef.current.postMessage({ type, payload });
    };

    const sendMessageWithResult = (type, payload) => {
        return new Promise((resolve) => {
            if (!workerRef.current) { resolve(null); return; }
            const id = ++msgIdCounter.current;
            callbacks.current.set(id, resolve);
            workerRef.current.postMessage({ type, payload, id });
        });
    };

    
    const rebuildScene = async () => {
        await sendMessageWithResult('CLEAR_SCENE', null);

        const state = useEditorStore.getState();
        const idMap = {};

        const globalGroundId = await sendMessageWithResult('ADD_BOX', {
            type: 0, x: 0, y: 0, rotation: 0,
            vx: 0, vy: 0, angularVelocity: 0,
            density: 1.0, friction: 0.2, restitution: 0.0,
            categoryBits: 0, maskBits: 0, w: 10, h: 10
        });

        for (const b of state.bodies) {
            let wasmId;
            const bMapped = { ...b };

            if (bMapped.type !== undefined) {
                
            } else if (bMapped.isStatic) {
                bMapped.type = 0;
            } else {
                bMapped.type = 2;
            }
            if (bMapped.isHiddenPin) bMapped.type = 0;

            const mapLayer = (layerStr) => {
                if (layerStr === 'A') return 1;
                if (layerStr === 'B') return 2;
                if (layerStr === 'C') return 4;
                if (layerStr === 'None') return 0;
                return layerStr;
            };
            if (bMapped.collisionCategory) bMapped.categoryBits = mapLayer(bMapped.collisionCategory);
            if (bMapped.collisionMask)     bMapped.maskBits     = mapLayer(bMapped.collisionMask);

            if (bMapped.shape === 'Box') {
                wasmId = await sendMessageWithResult('ADD_BOX', bMapped);
            } else if (bMapped.shape === 'Circle') {
                wasmId = await sendMessageWithResult('ADD_CIRCLE', bMapped);
            }
            if (wasmId !== undefined) idMap[b.id] = wasmId;
        }

        for (const c of state.constraints) {
            if (c._visualOnly) continue;

            let a = idMap[c.bodyA];
            let b = idMap[c.bodyB];

            const origBodyA = state.bodies.find(bd => bd.id === c.bodyA);
            const origBodyB = state.bodies.find(bd => bd.id === c.bodyB);

            if (a === undefined) a = globalGroundId;
            if (b === undefined) b = globalGroundId;

            const mc = {
                ...c,
                bodyA: a,
                bodyB: b,
                bB_x: origBodyB ? origBodyB.x : 0,
                bB_y: origBodyB ? origBodyB.y : 0
            };

            if (c.type === 'Hinge') {
                sendMessage('ADD_HINGE_CONSTRAINT', mc);
            } else if (c.type === 'Distance' || c.type === 'Spring' || c.type === 'Rod') {
                sendMessage('ADD_DISTANCE_CONSTRAINT', mc);
            } else if (c.type === 'Motor') {
                sendMessage('ADD_MOTOR_CONSTRAINT', mc);
            } else if (c.type === 'Slider') {
                sendMessage('ADD_SLIDER_CONSTRAINT', mc);
            } else if (c.type === 'Weld') {
                sendMessage('ADD_WELD_CONSTRAINT', mc);
            } else if (c.type === 'Pulley') {
                sendMessage('ADD_PULLEY_CONSTRAINT', mc);
            }
        }

        if (state.ignorePairs) {
            for (const pair of state.ignorePairs) {
                const resolvedA = idMap[pair[0]];
                const resolvedB = idMap[pair[1]];
                if (resolvedA !== undefined && resolvedB !== undefined) {
                    sendMessage('ADD_IGNORE_PAIR', { bodyA: resolvedA, bodyB: resolvedB });
                }
            }
        }

        useEditorStore.getState().setIdMap(idMap);

        const updatedState = useEditorStore.getState();
        useEditorStore.getState().setLocalAnchors(
            computeLocalAnchors(updatedState.bodies, updatedState.constraints)
        );

        sendMessage('REQUEST_RENDER_DATA', null);

        return idMap;
    };

    const api = {
        step:    (dt, substeps) => sendMessage('STEP', { dt, substeps }),
        addBox:    async (p) => sendMessageWithResult('ADD_BOX',    p),
        addCircle: async (p) => sendMessageWithResult('ADD_CIRCLE', p),
        clearScene: async () => sendMessageWithResult('CLEAR_SCENE', null),

        addHingeConstraint:   (p) => sendMessage('ADD_HINGE_CONSTRAINT',   p),
        addDistanceConstraint:(p) => sendMessage('ADD_DISTANCE_CONSTRAINT',p),
        addMotorConstraint:   (p) => sendMessage('ADD_MOTOR_CONSTRAINT',   p),
        addSliderConstraint:  (p) => sendMessage('ADD_SLIDER_CONSTRAINT',  p),
        addWeldConstraint:    (p) => sendMessage('ADD_WELD_CONSTRAINT',    p),
        addPulleyConstraint:  (p) => sendMessage('ADD_PULLEY_CONSTRAINT',  p),

        setCollisionFilter: (p) => sendMessage('SET_COLLISION_FILTER', p),
        addIgnorePair:      (p) => sendMessage('ADD_IGNORE_PAIR',      p),
        setRotation:        (p) => sendMessage('SET_ROTATION',         p),
        setPosition:        (p) => sendMessage('SET_POSITION',         p),
        setLinearVelocity:  (p) => sendMessage('SET_LINEAR_VELOCITY',  p),
        setMotorParams:     (p) => sendMessage('SET_MOTOR_PARAMS',     p),
        setBodyMaterial:    (p) => sendMessage('SET_BODY_MATERIAL',    p),

        requestRenderData: () => sendMessage('REQUEST_RENDER_DATA', null),

        rebuildScene,

        getLatestRenderData: () => renderDataRef.current,
        getLatestEnergy:     () => energyRef.current,
    };

    return { api, ready, error };
}
