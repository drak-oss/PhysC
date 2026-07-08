importScripts('/solver.js');

let api = null;
let Module = null;

// Initialize the WASM Module
async function initEngine() {
    try {
        if (!self.createSolver) {
            throw new Error("createSolver not found. Ensure solver.js was loaded correctly.");
        }
        Module = await self.createSolver();
        api = new Module.SimulationAPI();
        postMessage({ type: 'INIT_SUCCESS' });
    } catch (e) {
        console.error("Failed to initialize physics engine:", e);
        postMessage({ type: 'INIT_ERROR', error: e.message });
    }
}

initEngine();

self.onmessage = function(e) {
    const msg = e.data;
    if (!api) {
        console.warn("Physics API not initialized yet. Ignored message:", msg.type);
        return;
    }

    switch (msg.type) {
        case 'STEP':
            const { dt, substeps } = msg.payload;
            api.step(dt, substeps);
            
            // Get Render Data
            const dataView = api.getRenderData();
            // We MUST copy the view because it points to WASM memory that gets detached or invalidated
            const renderDataCopy = new Float32Array(dataView);
            const totalEnergy = api.getTotalEnergy();
            
            // Send it back as a transferable for zero-copy postMessage
            postMessage({ type: 'RENDER_DATA', payload: renderDataCopy, energy: totalEnergy }, [renderDataCopy.buffer]);
            break;

        case 'REQUEST_RENDER_DATA':
            {
                const dv = api.getRenderData();
                const copy = new Float32Array(dv);
                postMessage({ type: 'RENDER_DATA', payload: copy, energy: api.getTotalEnergy() }, [copy.buffer]);
            }
            break;

        case 'CLEAR_SCENE':
            {
                api.clearScene();
                if (msg.id) postMessage({ type: 'RESULT', id: msg.id, result: true });
            }
            break;

        case 'ADD_BOX':
            {
                const p = msg.payload;
                const id = api.addBox(
                    p.type, p.x, p.y, p.rotation || 0,
                    p.vx || 0, p.vy || 0, p.angularVelocity || 0,
                    p.density || 1, p.friction !== undefined ? p.friction : 0.2, p.restitution || 0,
                    p.categoryBits !== undefined ? p.categoryBits : 1, 
                    p.maskBits !== undefined ? p.maskBits : 65535,
                    p.w, p.h
                );
                if (msg.id) postMessage({ type: 'RESULT', id: msg.id, result: id });
            }
            break;

        case 'ADD_CIRCLE':
            {
                const p = msg.payload;
                const id = api.addCircle(
                    p.type, p.x, p.y, p.rotation || 0,
                    p.vx || 0, p.vy || 0, p.angularVelocity || 0,
                    p.density || 1, p.friction !== undefined ? p.friction : 0.2, p.restitution || 0,
                    p.categoryBits !== undefined ? p.categoryBits : 1, 
                    p.maskBits !== undefined ? p.maskBits : 65535,
                    p.radius
                );
                if (msg.id) postMessage({ type: 'RESULT', id: msg.id, result: id });
            }
            break;

        case 'ADD_HINGE_CONSTRAINT':
            {
                const p = msg.payload;
                // Provide fallback to anchorX/anchorY for backwards compatibility
                const ax1 = p.ax1 !== undefined ? p.ax1 : p.anchorX;
                const ay1 = p.ay1 !== undefined ? p.ay1 : p.anchorY;
                const ax2 = p.ax2 !== undefined ? p.ax2 : p.anchorX;
                const ay2 = p.ay2 !== undefined ? p.ay2 : p.anchorY;

                if (p.bB_x !== undefined && p.bB_y !== undefined) {
                    // Temporarily shift BodyB so that its target anchor coincides with ax1
                    const tempX = p.bB_x + ax1 - ax2;
                    const tempY = p.bB_y + ay1 - ay2;
                    api.setPosition(p.bodyB, tempX, tempY);
                    
                    api.addHingeConstraint(p.bodyA, p.bodyB, ax1, ay1, p.compliance || 0);
                    
                    // Restore original position
                    api.setPosition(p.bodyB, p.bB_x, p.bB_y);
                } else {
                    api.addHingeConstraint(p.bodyA, p.bodyB, ax1, ay1, p.compliance || 0);
                }
            }
            break;

        case 'ADD_DISTANCE_CONSTRAINT':
            {
                const p = msg.payload;
                let d = p.distance !== undefined ? p.distance : p.restLength;
                if (d === undefined || d === null) {
                    const dx = p.ax1 - p.ax2;
                    const dy = p.ay1 - p.ay2;
                    d = Math.sqrt(dx * dx + dy * dy);
                }
                api.addDistanceConstraint(p.bodyA, p.bodyB, p.ax1, p.ay1, p.ax2, p.ay2, d, p.compliance || 0);
            }
            break;

        case 'ADD_MOTOR_CONSTRAINT':
            {
                const p = msg.payload;
                api.addMotorConstraint(p.bodyA, p.bodyB, p.targetOmega, p.maxTorque);
            }
            break;

        case 'SET_MOTOR_PARAMS':
            {
                const p = msg.payload;
                api.setMotorParams(p.bodyA, p.targetOmega, p.maxTorque);
            }
            break;

        case 'SET_BODY_MATERIAL':
            {
                const p = msg.payload;
                api.setBodyMaterial(p.bodyId, p.density, p.friction, p.restitution);
            }
            break;

        case 'ADD_SLIDER_CONSTRAINT':
            {
                const p = msg.payload;
                const ax1 = p.ax1 ?? 0, ay1 = p.ay1 ?? 0;
                const ax2 = p.ax2 ?? 0, ay2 = p.ay2 ?? 0;
                // Physics convention: separationAlongAxis=(pB-pA)·axis = -(slider offset from rail anchor).
                // When null, auto-bound: maxLimit=0 (can't go past rail start), minLimit=-axLen (can't go past rail end).
                const axLen = Math.hypot(p.axisX || 0, p.axisY || 0);
                const minL = (p.minLimit !== null && p.minLimit !== undefined && isFinite(p.minLimit)) ? p.minLimit : -axLen;
                const maxL = (p.maxLimit !== null && p.maxLimit !== undefined && isFinite(p.maxLimit)) ? p.maxLimit : 0;
                const restitution = (p.limitRestitution !== null && p.limitRestitution !== undefined && isFinite(p.limitRestitution)) ? p.limitRestitution : 0.8;
                api.addSliderConstraint(p.bodyA, p.bodyB, ax1, ay1, ax2, ay2, p.axisX || 0, p.axisY || 0, minL, maxL, restitution);
            }
            break;

        case 'ADD_WELD_CONSTRAINT':
            {
                const p = msg.payload;
                const c = p.compliance || 0;
                api.addWeldConstraint(p.bodyA, p.bodyB, p.anchorX, p.anchorY, c, c);
            }
            break;

        case 'ADD_PULLEY_CONSTRAINT':
            {
                const p = msg.payload;
                api.addPulleyConstraint(p.bodyA, p.bodyB, p.gxA, p.gyA, p.gxB, p.gyB, p.localAx, p.localAy, p.localBx, p.localBy, p.ratio, p.compliance || 0);
            }
            break;

        case 'SET_COLLISION_FILTER':
            {
                const p = msg.payload;
                api.setCollisionFilter(p.bodyId, p.categoryBits, p.maskBits);
            }
            break;

        case 'ADD_IGNORE_PAIR':
            {
                const p = msg.payload;
                api.addIgnorePair(p.bodyA, p.bodyB);
            }
            break;

        case 'SET_ROTATION':
            {
                const p = msg.payload;
                api.setRotation(p.bodyId, p.rotation);
            }
            break;

        case 'SET_POSITION':
            {
                const p = msg.payload;
                api.setPosition(p.bodyId, p.x, p.y);
            }
            break;
            
        case 'SET_LINEAR_VELOCITY':
            {
                const p = msg.payload;
                api.setLinearVelocity(p.bodyId, p.vx, p.vy);
            }
            break;

        default:
            console.warn("Unknown message type:", msg.type);
    }
};
