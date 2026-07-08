import { create } from 'zustand';

const INITIAL_BODIES = [
    { id: 101, shape: 'Box',    isStatic: true,  x: 700, y: 290, w: 20,  h: 20,  rotation: 0, vx: 0, vy: 0, angularVelocity: 0, density: 1,     friction: 0.2, restitution: 0, collisionCategory: 'None', collisionMask: 'None', name: 'Lever Anchor'   },
    { id: 102, shape: 'Box',    isStatic: true,  x: 850, y: 250, w: 20,  h: 20,  rotation: 0, vx: 0, vy: 0, angularVelocity: 0, density: 1,     friction: 0.2, restitution: 0, collisionCategory: 'None', collisionMask: 'None', name: 'Crank Anchor'   },
    { id: 103, shape: 'Box',    isStatic: false, x: 450, y: 290, w: 500, h: 20,  rotation: 0, vx: 0, vy: 0, angularVelocity: 0, density: 0.001, friction: 0.8, restitution: 0, collisionCategory: 'A',    collisionMask: 'B',    name: 'Lever'          },
    { id: 104, shape: 'Circle', isStatic: true,  x: 200, y: 550, radius: 20,     rotation: 0, vx: 0, vy: 0, angularVelocity: 0, density: 1,     friction: 0.2, restitution: 0, collisionCategory: 'None', collisionMask: 'None', name: 'Spring Anchor'  },
    { id: 105, shape: 'Circle', isStatic: false, x: 500, y: 200, radius: 80,     rotation: 0, vx: 0, vy: 0, angularVelocity: 0, density: 0.001, friction: 0.9, restitution: 0, collisionCategory: 'B',    collisionMask: 'A',    name: 'Disk'           },
    { id: 106, shape: 'Box',    isStatic: false, x: 850, y: 200, w: 20,  h: 100, rotation: 0, vx: 0, vy: 0, angularVelocity: 0, density: 0.005, friction: 0.2, restitution: 0, collisionCategory: 'C',    collisionMask: 'None', name: 'Crank'          },
    { id: 107, shape: 'Box',    isStatic: false, x: 675, y: 200, w: 350, h: 10,  rotation: 0, vx: 0, vy: 0, angularVelocity: 0, density: 0.001, friction: 0.1, restitution: 0, collisionCategory: 'C',    collisionMask: 'None', name: 'Connecting Rod' },
];
const INITIAL_CONSTRAINTS = [
    { id: 201, visualType: 'hinge',  type: 'Hinge',    bodyA: 101, bodyB: 103, anchorX: 700, anchorY: 290, compliance: 0.0   },
    { id: 202, visualType: 'spring', type: 'Distance', bodyA: 103, bodyB: 104, ax1: 200, ay1: 290, ax2: 200, ay2: 550, distance: 260.0, compliance: 0.005 },
    { id: 203, visualType: 'hinge',  type: 'Hinge',    bodyA: 102, bodyB: 106, anchorX: 850, anchorY: 250, compliance: 0.0   },
    { id: 204, visualType: 'motor',  type: 'Motor',    bodyA: 102, bodyB: 106, targetOmega: -2.0, maxTorque: -1.0            },
    { id: 205, visualType: 'hinge',  type: 'Hinge',    bodyA: 105, bodyB: 107, anchorX: 500, anchorY: 200, compliance: 0.0   },
    { id: 206, visualType: 'hinge',  type: 'Hinge',    bodyA: 106, bodyB: 107, anchorX: 850, anchorY: 200, compliance: 0.0   },
];

function bodiesOverlap(a, b) {
    const aCanHitB = (a.categoryBits & b.maskBits) !== 0;
    const bCanHitA = (b.categoryBits & a.maskBits) !== 0;
    if (!aCanHitB && !bCanHitA) return false;

    if (a.shape === 'Circle' && b.shape === 'Circle') {
        const dx = a.x - b.x, dy = a.y - b.y;
        return (dx * dx + dy * dy) < (a.radius + b.radius) ** 2;
    }
    if (a.shape === 'Box' && b.shape === 'Box') {
        return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
               Math.abs(a.y - b.y) < (a.h + b.h) / 2;
    }
    const box    = a.shape === 'Box'    ? a : b;
    const circle = a.shape === 'Circle' ? a : b;
    const r      = circle.radius ?? 0;
    const cx = Math.max(box.x - box.w / 2, Math.min(circle.x, box.x + box.w / 2));
    const cy = Math.max(box.y - box.h / 2, Math.min(circle.y, box.y + box.h / 2));
    const dx = circle.x - cx, dy = circle.y - cy;
    return dx * dx + dy * dy < r * r;
}
function detectCollisions(bodies) {
    const colliding = new Set();
    for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++)
            if (bodiesOverlap(bodies[i], bodies[j])) {
                colliding.add(bodies[i].id);
                colliding.add(bodies[j].id);
            }
    return colliding;
}

function getConnectedBodyIds(startId, bodies, constraints) {
    const visited = new Set([startId]), queue = [startId];
    while (queue.length > 0) {
        const curr = queue.shift();
        for (const c of constraints) {
            if (c.bodyA === curr && !visited.has(c.bodyB)) { visited.add(c.bodyB); queue.push(c.bodyB); }
            if (c.bodyB === curr && !visited.has(c.bodyA)) { visited.add(c.bodyA); queue.push(c.bodyA); }
        }
    }
    return visited;
}
function shiftConstraintAnchors(c, dx, dy) {
    const u = { ...c };
    if (u.anchorX !== undefined) { u.anchorX += dx; u.anchorY += dy; }
    if (u.ax1     !== undefined) { u.ax1 += dx; u.ay1 += dy; }
    if (u.ax2     !== undefined) { u.ax2 += dx; u.ay2 += dy; }
    return u;
}

function rotate(x, y, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: x * c - y * s, y: x * s + y * c };
}

export const useEditorStore = create((set, get) => ({

    running: false,
    setRunning: (v) => set({ running: v }),

    gravity: 1.0,
    setGravity: (v) => set({ gravity: Math.max(0, Math.min(3, v)) }),

    
    showVelocityVectors: false,
    setShowVelocityVectors: (v) => set({ showVelocityVectors: v }),

    
    bodyVectors: {},
    toggleBodyVector: (id) => set((state) => ({
        bodyVectors: { ...state.bodyVectors, [id]: !state.bodyVectors[id] }
    })),

    
    activeTool: 'select',
    setActiveTool: (tool) => set({ activeTool: tool }),

    hoveredId: null,
    hoveredType: null,
    setHovered: (id, type) => set({ hoveredId: id, hoveredType: type }),
    clearHovered: () => set({ hoveredId: null, hoveredType: null }),

    panX: 0,
    panY: 0,
    zoom: 1,
    setPan: (x, y) => set({ panX: x, panY: y }),
    setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(5, z)) }),
    resetView: () => set({ panX: 0, panY: 0, zoom: 1 }),

    
    collidingIds:  new Set(),
    hasCollisions: false,

    
    bodies:      JSON.parse(JSON.stringify(INITIAL_BODIES)),
    constraints: JSON.parse(JSON.stringify(INITIAL_CONSTRAINTS)),
    selectedNodeId: null,
    selectedNodeType: null,
    idMap:        {},
    liveBodyData: {},
    machineTitle: 'Untitled Machine',
    sceneVersion: 0,  

    
    
    localAnchors: {},
    setLocalAnchors: (la) => set({ localAnchors: la }),

    setMachineTitle:   (title) => set({ machineTitle: title }),
    bumpSceneVersion:  ()      => set(s => ({ sceneVersion: s.sceneVersion + 1 })),
    setIdMap:          (map)   => set({ idMap: map }),
    setLiveBodyData:   (data) => set({ liveBodyData: data }),
    setSelectedNodeId: (id, type = null) => set({ selectedNodeId: id, selectedNodeType: type }),

    
    
    
    
    
    syncLiveToDefinitions: () => {
        const state = get();
        const live  = state.liveBodyData;
        const la    = state.localAnchors;

        const newBodies = state.bodies.map(b => {
            const liveB = live[b.id];
            if (!liveB) return b;
            return {
                ...b,
                x: liveB.x, y: liveB.y, rotation: liveB.rotation,
                vx: liveB.vx ?? b.vx ?? 0,
                vy: liveB.vy ?? b.vy ?? 0,
                angularVelocity: liveB.angularVelocity ?? b.angularVelocity ?? 0,
            };
        });

        
        const newConstraints = state.constraints.map(c => {
            const anchors = la[c.id];
            if (!anchors) return c;

            const bodyA = newBodies.find(b => b.id === c.bodyA);
            const bodyB = newBodies.find(b => b.id === c.bodyB);
            if (!bodyA) return c;

            if (c.type === 'Hinge' || c.type === 'Motor') {
                
                const wA = rotate(anchors.axA, anchors.ayA, bodyA.rotation);
                const newAx1 = bodyA.x + wA.x, newAy1 = bodyA.y + wA.y;
                if (bodyB) {
                    const wB = rotate(anchors.axB, anchors.ayB, bodyB.rotation);
                    return { ...c, ax1: newAx1, ay1: newAy1, ax2: bodyB.x + wB.x, ay2: bodyB.y + wB.y };
                }
                return { ...c, ax1: newAx1, ay1: newAy1, ax2: newAx1, ay2: newAy1 };
            }
            if (c.type === 'Weld') {
                
                const wA = rotate(anchors.axA, anchors.ayA, bodyA.rotation);
                const newAx1 = bodyA.x + wA.x, newAy1 = bodyA.y + wA.y;
                if (bodyB) {
                    const wB = rotate(anchors.axB, anchors.ayB, bodyB.rotation);
                    return { ...c, anchorX: (newAx1 + bodyB.x + wB.x) / 2, anchorY: (newAy1 + bodyB.y + wB.y) / 2 };
                }
                return { ...c, anchorX: newAx1, anchorY: newAy1 };
            }
            if ((c.type === 'Distance' || c.type === 'Spring' || c.type === 'Rod') && bodyB) {
                const wA = rotate(anchors.axA, anchors.ayA, bodyA.rotation);
                const wB = rotate(anchors.axB, anchors.ayB, bodyB.rotation);
                return {
                    ...c,
                    ax1: bodyA.x + wA.x, ay1: bodyA.y + wA.y,
                    ax2: bodyB.x + wB.x, ay2: bodyB.y + wB.y,
                };
            }
            if (c.type === 'Slider' && bodyB) {
                
                const wA = rotate(anchors.axA, anchors.ayA, bodyB.rotation);
                const wB = rotate(anchors.axB, anchors.ayB, bodyB.rotation);
                return {
                    ...c,
                    ax1: bodyB.x + wA.x, ay1: bodyB.y + wA.y,
                    ax2: bodyB.x + wB.x, ay2: bodyB.y + wB.y,
                };
            }
            if (c.type === 'Pulley' && bodyB) {
                const wA = rotate(anchors.axA, anchors.ayA, bodyA.rotation);
                const wB = rotate(anchors.axB, anchors.ayB, bodyB.rotation);
                return {
                    ...c,
                    localAx: bodyA.x + wA.x, localAy: bodyA.y + wA.y,
                    localBx: bodyB.x + wB.x, localBy: bodyB.y + wB.y,
                };
            }
            return c;
        });

        set({ bodies: newBodies, constraints: newConstraints });
    },

    
    translateGroup: (startBodyId, dx, dy) => set((state) => {
        const connected = getConnectedBodyIds(startBodyId, state.bodies, state.constraints);
        const newBodies = state.bodies.map(b =>
            connected.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b
        );
        const newConstraints = state.constraints.map(c =>
            (connected.has(c.bodyA) || connected.has(c.bodyB))
                ? shiftConstraintAnchors(c, dx, dy) : c
        );
        const collidingIds = detectCollisions(newBodies);
        return { bodies: newBodies, constraints: newConstraints, collidingIds, hasCollisions: collidingIds.size > 0 };
    }),

    restoreSnapshot: (snapshot) => {
        const collidingIds = detectCollisions(snapshot.bodies);
        set({ bodies: snapshot.bodies, constraints: snapshot.constraints, collidingIds, hasCollisions: collidingIds.size > 0 });
    },

    
    
    
    resetScene: () => set(s => {
        const b  = s._initialBodies      || INITIAL_BODIES;
        const c  = s._initialConstraints || INITIAL_CONSTRAINTS;
        const ip = s._initialIgnorePairs || [];
        return {
            bodies:          JSON.parse(JSON.stringify(b)),
            constraints:     JSON.parse(JSON.stringify(c)),
            ignorePairs:     JSON.parse(JSON.stringify(ip)),
            selectedNodeId:  null,
            selectedNodeType: null,
            idMap:           {},
            liveBodyData:    {},
            localAnchors:    {},
            collidingIds:    new Set(),
            hasCollisions:   false,
            bodyVectors:     {},
            sceneVersion:    s.sceneVersion + 1,
        };
    }),

    
    addBody:    (body) => set((state) => ({ bodies: [...state.bodies, body] })),
    removeBody: (id)   => set((state) => ({
        bodies: state.bodies.filter(b => b.id !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),
    updateBody: (id, updates) => set((state) => ({
        bodies: state.bodies.map(b => b.id === id ? { ...b, ...updates } : b),
    })),

    addConstraint:    (c)  => set((state) => ({ constraints: [...state.constraints, c] })),
    removeConstraint: (id) => set((state) => ({
        constraints: state.constraints.filter(c => c.id !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),
    updateConstraint: (id, updates) => set((state) => ({
        constraints: state.constraints.map(c => c.id === id ? { ...c, ...updates } : c),
    })),

    clearScene: () => set(s => ({
        bodies: [], constraints: [], selectedNodeId: null, selectedNodeType: null,
        idMap: {}, liveBodyData: {}, collidingIds: new Set(), hasCollisions: false, bodyVectors: {},
        sceneVersion: s.sceneVersion + 1,   
    })),

    
    
    
    loadScene: ({ bodies, constraints, ignorePairs, machineTitle }) => set(s => ({
        bodies,
        constraints,
        ignorePairs:         ignorePairs || [],
        machineTitle,
        _initialBodies:      JSON.parse(JSON.stringify(bodies)),
        _initialConstraints: JSON.parse(JSON.stringify(constraints)),
        _initialIgnorePairs: JSON.parse(JSON.stringify(ignorePairs || [])),
        selectedNodeId:      null,
        selectedNodeType:    null,
        idMap:               {},
        liveBodyData:        {},
        localAnchors:        {},
        collidingIds:        new Set(),
        hasCollisions:       false,
        bodyVectors:         {},
        sceneVersion:        s.sceneVersion + 1,
    })),
}));
