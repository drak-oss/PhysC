# PhysC Frontend — Deep Explanation

> React 19 single-page application. Contains the physics engine (compiled to WebAssembly), runs it in a Web Worker, and provides two main UIs: a Builder (drag-and-drop scene assembly) and a Simulator (live physics playback with live property editing).

---

## Table of Contents

1. [Tech Stack & Key Libraries](#1-tech-stack--key-libraries)
2. [Directory Structure](#2-directory-structure)
3. [Application Routing & Entry Points](#3-application-routing--entry-points)
4. [Auth System](#4-auth-system)
5. [API Layer](#5-api-layer)
6. [Zustand Stores](#6-zustand-stores)
7. [Hooks](#7-hooks)
8. [Builder System](#8-builder-system)
9. [Serialization System](#9-serialization-system)
10. [Simulator System](#10-simulator-system)
11. [Command Manager (Undo/Redo)](#11-command-manager-undoredo)
12. [Utils](#12-utils)
13. [CSS Architecture](#13-css-architecture)

---

## 1. Tech Stack & Key Libraries

| Library | Version | Role |
|---|---|---|
| React | 19 | UI component tree |
| Vite | 8 | Dev server + bundler |
| Zustand | 5 | Client state management (two stores) |
| React Router | 7 | SPA routing (data router) |
| Axios | latest | HTTP client with interceptors |
| jjwt | (backend only) | JWT — on the frontend, token is an opaque string |

The WASM engine is a first-party compiled artifact placed in `public/physics_engine.js`. It is not an npm dependency.

---

## 2. Directory Structure

```
physc-frontend/src/
│
├── App.jsx                     — router, usePhysicsWorker instantiation
├── main.jsx                    — ReactDOM.createRoot entry
│
├── auth/
│   └── AuthContext.jsx         — AuthProvider, useAuth hook, session restore
│
├── api/
│   ├── client.js               — Axios instance, request/response interceptors
│   ├── authApi.js              — signup, login, me
│   └── machineApi.js           — save, load, fork, delete; captureThumbnail, buildPayload
│
├── store/
│   ├── editorStore.js          — simulation runtime state (bodies, constraints, liveData)
│   └── builderStore.js         — builder UI state (components, anchors, selection)
│
├── hooks/
│   ├── usePhysicsWorker.js     — Web Worker lifecycle, message bus, rebuildScene
│   └── useWasm.js              — optional direct WASM load hook (used in worker setup)
│
├── commands/
│   └── CommandManager.js       — undo/redo stack + 3 command classes
│
├── builder/
│   ├── BuilderPage.jsx         — top-level builder route component
│   ├── builderStore.js         — (also src/store/builderStore.js — same file)
│   ├── componentRegistry.js    — maps builder type strings to config objects
│   ├── BuilderCanvas.jsx       — drag/drop canvas, ghost placement, selection
│   ├── BuilderToolbar.jsx      — left palette (component types)
│   ├── LeftPalette.jsx         — sidebar with component groups
│   ├── RightPanel.jsx          — properties editor for selected component
│   ├── builderDraw.js          — pure canvas drawing functions for builder
│   ├── serializationSystem.js  — builder→simulator format conversion (complex)
│   └── components/             — individual builder component renderers
│       ├── AnchorPoint.jsx
│       ├── Block.jsx
│       ├── Disk.jsx
│       ├── HingeConnector.jsx
│       └── ... (others)
│
├── simulator/
│   ├── SimulatorPage.jsx       — top-level simulator route component
│   ├── SimulationCanvas.jsx    — rAF loop, canvas rendering, mouse drag
│   ├── HierarchyPanel.jsx      — body/constraint tree view
│   ├── Toolbar.jsx             — play/pause/reset/step controls
│   ├── InspectorPanel.jsx      — live property editor for selected body/constraint
│   ├── SliderRow.jsx           — reusable slider + number input component
│   ├── simDraw.js              — pure canvas drawing functions for simulator
│   └── useSetupScene.js        — loads editorStore from URL/save data on mount
│
├── pages/
│   ├── LandingPage.jsx         — marketing page
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── AccountPage.jsx         — user's saved machines
│   └── GalleryPage.jsx         — public machine gallery + search
│
├── utils/
│   ├── localAnchors.js         — compute body-local anchor offsets from world space
│   ├── sceneConversion.js      — simulator format → builder format (round-trip)
│   ├── collisionDetection.js   — AABB pre-check for builder overlap validation
│   └── drawingHelpers.js       — shared canvas utilities (drawArrow, etc.)
│
├── styles/
│   ├── tokens.css              — CSS custom properties (colors, spacing, fonts)
│   └── global.css              — base resets, utility classes
│
└── public/
    ├── physics_engine.js       — compiled WASM (base64-embedded, not imported by webpack)
    └── physicsWorker.js        — Web Worker script (loaded via new Worker())
```

---

## 3. Application Routing & Entry Points

```
main.jsx
    ReactDOM.createRoot(document.getElementById('root'))
    .render(<AuthProvider><App /></AuthProvider>)
                │
                ▼
            App.jsx
    createBrowserRouter (React Router 7 data router)
    │
    ├── <AppRoutes />                     — wrapper component
    │       usePhysicsWorker()            ← instantiated ONCE here
    │           creates the Web Worker
    │           returns { api, ready, error }
    │
    ├── /                                 → LandingPage
    ├── /login                            → LoginPage
    ├── /signup                           → SignupPage
    ├── /gallery                          → GalleryPage
    │
    └── <ProtectedRoute>                  — redirects to /login if !isAuthenticated
        ├── /builder                      → BuilderPage (receives api, ready, error)
        ├── /simulator                    → SimulatorPage (receives api, ready, error)
        └── /account                      → AccountPage
```

**Why `usePhysicsWorker()` at AppRoutes level?** The Web Worker is expensive to start (~200ms for WASM init). By instantiating it at the app root, a single Worker is reused for both Builder and Simulator. Navigating from Builder to Simulator doesn't restart the Worker — it keeps the accumulated WASM world state, and the Simulator's `useSetupScene` hook handles rebuilding when needed.

**`ProtectedRoute`:**
```jsx
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <LoadingSpinner />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
}
```

---

## 4. Auth System

```
AuthContext.jsx
│
├── AuthProvider component
│   state: { user, token, loading }
│   │
│   ├── useEffect (on mount):
│   │     token = localStorage.getItem('token')
│   │     if token:
│   │         authApi.me()    ← GET /api/auth/me with Bearer token
│   │             success → setUser(data), setToken(token)
│   │             failure → localStorage.removeItem('token')
│   │     setLoading(false)
│   │
│   ├── login(credentials):
│   │     response = await authApi.login(credentials)
│   │     localStorage.setItem('token', response.token)
│   │     setUser(response.user)
│   │     setToken(response.token)
│   │
│   └── logout():
│         localStorage.removeItem('token')
│         setUser(null), setToken(null)
│
└── useAuth() → { user, token, login, logout, isAuthenticated, loading }
```

**Session restore flow:** on every page load, `AuthProvider` reads `localStorage` for a token and calls `/me`. If the token is valid, the user is logged in silently. If it's expired or invalid, the 401 response interceptor in `client.js` clears localStorage and the user stays logged out.

**Token storage:** `localStorage` (not cookies or sessionStorage). This means the token persists across browser sessions but is accessible to JavaScript. The tradeoff: simple to implement, no cookie CSRF issues, but vulnerable to XSS. Mitigation: the frontend never `eval()`s user-provided content.

---

## 5. API Layer

### client.js — Axios Instance

```javascript
const client = axios.create({
    baseURL: '/api',    // relative → hits Vite proxy → Spring Boot
    headers: { 'Content-Type': 'application/json' },
});

// REQUEST interceptor — inject auth token
client.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// RESPONSE interceptor — handle 401
client.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            const isAuthRoute = error.config.url?.startsWith('/auth');
            if (!isAuthRoute) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
```

**Vite proxy:** `vite.config.js` proxies `/api` → `http://localhost:8080` in development. In production, the React SPA and Spring Boot run on the same domain, so `/api` resolves directly.

**Why skip 401 redirect for `/auth` routes?** Login and signup can legitimately return 401 (wrong password). Redirecting to `/login` from the login page itself would cause a redirect loop.

### machineApi.js

Key functions beyond basic CRUD:

**`captureThumbnail(canvasRef)`:**
```javascript
// draws the simulation canvas to a 480×270 offscreen canvas
const offscreen = document.createElement('canvas');
offscreen.width = 480; offscreen.height = 270;
const ctx = offscreen.getContext('2d');
ctx.drawImage(canvasRef.current, 0, 0, 480, 270);
return offscreen.toDataURL('image/jpeg', 0.85);
// → "data:image/jpeg;base64,..." stored as-is in the DB thumbnail column
```

**`buildPayload(name, description, isPublic, canvasRef)`:**
```javascript
const state = useEditorStore.getState();
const thumbnail = await captureThumbnail(canvasRef);
const machineData = JSON.stringify({
    version: 1,
    machineTitle: name,
    bodies: state.bodies,
    constraints: state.constraints,
    ignorePairs: state.ignorePairs,
});
return { name, description, isPublic, thumbnail, machineData };
```

Reads directly from `useEditorStore.getState()` (not `useEditorStore()` hook) because this runs outside a React component tree (in an event handler). See [Zustand Stores](#6-zustand-stores) for why this works.

**`loadMachineIntoBuilderStore(machine)`:**
```javascript
// 1. parse machineData JSON string
const scene = JSON.parse(machine.machineData);
// 2. convert simulator format → builder format (sceneConversion.js)
const builderScene = simFormatToBuilderFormat(scene);
// 3. center the view (find bounding box of all components)
const centered = centerScene(builderScene);
// 4. load into builderStore
useBuilderStore.getState().loadScene(centered);
```

---

## 6. Zustand Stores

### editorStore.js

This is the simulation runtime state — the source of truth for what exists in the physics world.

```
editorStore state shape:
{
    bodies: Body[],              — array of body definitions (serializable objects)
    constraints: Constraint[],   — array of constraint definitions
    ignorePairs: [id,id][],      — pairs of body IDs that should not collide
    liveBodyData: {              — live simulation state (positions, velocities from WASM)
        [bodyId]: { x, y, rotation, vx, vy, angVel }
    },
    idMap: { [reactBodyId]: wasmBodyId },    — mapping maintained across rebuilds
    localAnchors: { [constraintId]: { ... } }, — body-local anchor offsets
    selectedNodeId: string | null,
    selectedNodeType: 'body' | 'constraint' | null,
    _initialBodies: Body[],      — snapshot for reset
    _initialConstraints: Constraint[],
    _initialIgnorePairs: [id,id][],
}
```

**Key actions:**

**`syncLiveToDefinitions()`** — called before taking a snapshot (for undo) or before rebuilding. Copies live position/angle/velocity from `liveBodyData` back into `bodies`, and recalculates constraint anchor world positions from `localAnchors`:

```javascript
syncLiveToDefinitions: () => set(state => {
    const newBodies = state.bodies.map(b => {
        const live = state.liveBodyData[b.id];
        if (!live) return b;
        return { ...b, x: live.x, y: live.y, rotation: live.rotation,
                       vx: live.vx, vy: live.vy, angularVelocity: live.angVel };
    });

    const newConstraints = state.constraints.map(c => {
        const la = state.localAnchors[c.id];
        if (!la) return c;
        const bodyA = newBodies.find(b => b.id === c.bodyA);
        const bodyB = newBodies.find(b => b.id === c.bodyB);
        // for each anchor (ax, ay, bx, by):
        //   world = bodyCenter + rotate(localOffset, bodyAngle)
        return { ...c, ...recalcAnchorsFromLocal(c, la, bodyA, bodyB) };
    });

    return { bodies: newBodies, constraints: newConstraints };
})
```

**`translateGroup(startBodyId, dx, dy)`** — BFS through constraint graph, moves entire connected component:

```javascript
translateGroup: (startId, dx, dy) => set(state => {
    // BFS: find all bodies reachable from startId via constraints
    const visited = new Set();
    const queue = [startId];
    while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        for (const c of state.constraints) {
            if (c.bodyA === id && c.bodyB && !visited.has(c.bodyB)) queue.push(c.bodyB);
            if (c.bodyB === id && c.bodyA && !visited.has(c.bodyA)) queue.push(c.bodyA);
        }
    }

    const newBodies = state.bodies.map(b =>
        visited.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b
    );
    const newConstraints = state.constraints.map(c => ({
        ...c,
        // shift all anchor coordinates for constraints between visited bodies
        ax: visited.has(c.bodyA) ? c.ax + dx : c.ax,
        ay: visited.has(c.bodyA) ? c.ay + dy : c.ay,
        bx: visited.has(c.bodyB) ? c.bx + dx : c.bx,
        by: visited.has(c.bodyB) ? c.by + dy : c.by,
        // pulley anchors, slider ref point, etc. — same pattern
    }));

    return { bodies: newBodies, constraints: newConstraints };
})
```

**`loadScene(bodies, constraints, ignorePairs)`** — loads a new scene and saves a snapshot for reset:
```javascript
loadScene: (bodies, constraints, ignorePairs) => set({
    bodies,
    constraints,
    ignorePairs,
    liveBodyData: {},
    _initialBodies: JSON.parse(JSON.stringify(bodies)),
    _initialConstraints: JSON.parse(JSON.stringify(constraints)),
    _initialIgnorePairs: JSON.parse(JSON.stringify(ignorePairs)),
});
```

**Why `useEditorStore.getState()` instead of `useEditorStore()`?**

`useEditorStore()` is a React hook — it can only be called inside a React component. `useEditorStore.getState()` is a plain function call that reads the Zustand store's current state synchronously, from anywhere: event handlers, command classes, Web Worker callbacks, etc. Zustand exposes this specifically for outside-React access.

### builderStore.js

Builder UI state — separate from simulation state because the builder has its own coordinate system and interaction model.

```
builderStore state shape:
{
    components: Component[],     — builder components (disks, blocks, anchors)
    connections: Connection[],   — drawn connections (hinge, distance, etc.)
    selectedId: string | null,
    hoveredId: string | null,
    scale: number,               — canvas zoom
    offset: { x, y },           — canvas pan
    activeTool: string,          — 'select', 'disk', 'block', 'hinge', ...
    isDragging: boolean,
}
```

**`getAllAnchors()`** — computes world-space anchor positions from body-local anchor definitions:
```javascript
getAllAnchors: () => {
    const anchors = {};
    for (const comp of state.components) {
        if (!comp.anchors) continue;
        for (const [key, localPos] of Object.entries(comp.anchors)) {
            const world = rotate(localPos, comp.rotation) + comp.position;
            anchors[`${comp.id}-${key}`] = world;
        }
    }
    return anchors;
}
```

Used by the builder canvas to draw anchor points and to detect anchor click targets.

---

## 7. Hooks

### usePhysicsWorker.js

Full documentation in [physc_engine_exp.md — Web Worker Message Bus].

Summary of what it returns:
```javascript
const { api, ready, error } = usePhysicsWorker();

// api exposes:
api.step(dt, substeps)
api.addBox(params) → Promise<wasmId>
api.addCircle(params) → Promise<wasmId>
api.rebuildScene() → Promise<idMap>
api.setLinearVelocity({ bodyId, vx, vy })
api.setMotorParams({ bodyA, targetOmega, maxTorque })
api.setBodyMaterial({ bodyId, density, friction, restitution })
api.requestRenderData()
api.getLatestRenderData() → Float32Array | null
api.getLatestEnergy() → number
```

**`ready`** becomes `true` when the Worker receives `INIT_SUCCESS` (WASM loaded and compiled). Builder and Simulator both gate all physics interactions on this flag.

### useSetupScene.js (Simulator)

Called on mount in `SimulatorPage`. Reads the scene from either:
1. URL query parameter `?id=<machineId>` → loads from backend via `machineApi.getById()`
2. `editorStore` state already populated (came from builder via navigate)

Then calls `api.rebuildScene()` to push the scene into WASM.

---

## 8. Builder System

### Component Registry (componentRegistry.js)

Maps builder type strings to their configuration:

```javascript
const registry = {
    disk: {
        label: 'Disk',
        defaultProps: { radius: 40, density: 0.005, friction: 0.5, ... },
        anchors: ['center', 'top', 'right', 'bottom', 'left'],
        category: 'bodies',
    },
    block: {
        label: 'Block',
        defaultProps: { width: 80, height: 40, density: 0.005, ... },
        anchors: ['center', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight',
                  'top', 'right', 'bottom', 'left'],
        category: 'bodies',
    },
    staticAnchor: {
        label: 'Static Anchor',
        defaultProps: { radius: 10, isStatic: true, ... },
        anchors: ['center'],
        category: 'bodies',
    },
    hinge: { category: 'connections', ... },
    distance: { category: 'connections', ... },
    motor: { category: 'connections', ... },
    // ...
};
```

This is the authoritative list of what the user can place. Adding a new component type means adding an entry here and a renderer in `builderDraw.js`.

### Builder Architecture

```
BuilderPage.jsx
├─ BuilderCanvas.jsx         — main interaction surface
│   ├─ HTML5 Canvas element
│   ├─ mouse event handlers (mousedown, mousemove, mouseup)
│   │   ├─ 'select' tool: pick component or anchor, start drag
│   │   ├─ body placement tools: add ghost component on hover, place on click
│   │   └─ connection tools: click first anchor, click second anchor to add connection
│   ├─ rAF loop → builderDraw.drawScene(ctx, store)
│   └─ collision pre-check before 'Simulate' button
│
├─ LeftPalette.jsx           — sidebar list of component types
│   └─ click → builderStore.setActiveTool(type)
│
└─ RightPanel.jsx            — property editor
    └─ shows props of selected component/connection
    └─ edits via builderStore.updateComponent(id, props)
```

### Collision Pre-Check

Before allowing "Simulate", the builder checks for overlapping bodies using a fast AABB bitmask test in `collisionDetection.js`:

```javascript
// collisionDetection.js
function checkCollisions(components) {
    for (let i = 0; i < components.length; i++) {
        for (let j = i+1; j < components.length; j++) {
            const a = components[i], b = components[j];
            // skip if same collision category (won't collide in simulation either)
            if (a.collisionCategory !== b.collisionCategory) {
                const aabb_a = getAABB(a), aabb_b = getAABB(b);
                if (aabbOverlap(aabb_a, aabb_b)) return true;  // overlap found
            }
        }
    }
    return false;
}
```

If this returns `true`, the "Simulate" button shows a warning and is disabled until the user resolves the overlap.

---

## 9. Serialization System

`serializationSystem.js` converts the builder's high-level component model into the simulator's body/constraint format. This is the most complex piece of the frontend.

### Builder Format vs Simulator Format

**Builder format** (what the user places):
```json
{
    "type": "disk",        // conceptual type
    "props": {
        "radius": 40,
        "density": 0.005,
        "collisionCategory": "A"
    },
    "position": { "x": 700, "y": 400 },
    "anchors": { "center": { "x": 0, "y": 0 } }
}
```

**Simulator format** (what WASM understands):
```json
{
    "id": 101,
    "shape": "Circle",     // Circle or Box
    "type": 2,             // 0=static, 1=kinematic, 2=dynamic
    "x": 700, "y": 400,
    "radius": 40,
    "density": 0.005,
    "categoryBits": 1      // collision layer bitmask
}
```

### serializeToSimulator(builderState)

The main conversion function. Here's the non-trivial part — the "orbital motor" pattern:

**Problem:** A `motor` connection in the builder means "rotate body A relative to body B at a constant speed." But WASM `MotorConstraint` applies a torque to two bodies. If one body is a static anchor, the dynamic body just spins in place with no constraint on where it orbits.

**Solution:** When a motor connects a `staticAnchor` (or world-anchored point) to a disk, inject synthetic bodies and constraints:

```
Builder: [StaticAnchor] --motor--> [Disk]

Simulator equivalent:
    [World Pin] (static, hidden, at staticAnchor position)
        │
        ├─── HingeConstraint ──── [Orbital Pivot] (hidden, massless, at staticAnchor position)
        │                                │
        ├─── MotorConstraint ────────────┤ (drives Pivot's angular velocity)
        │                                │
        └─── Spring ─────────────── [Disk]     (_visualOnly flag — renders but not simulated)
                 (from Pivot to Disk, maintains orbit radius)
             DistanceConstraint ──── [Disk]    (actual constraint at correct orbit radius)
```

The synthetic bodies are named with prefixes:
- `"World Pin <id>"` — invisible static body at the anchor
- `"Orbital Pivot <id>"` — massless rotating body
- `"Rotor <id>"` — the mass that orbits

These name prefixes are used by `sceneConversion.js` to filter out synthetic bodies when converting back to builder format.

### _visualOnly Flag

Some constraints are rendered on the canvas but never submitted to WASM:
- The spring "arm" in the orbital motor pattern (the visual rope showing orbit radius)
- Debug visualizers

In `rebuildScene()`:
```javascript
for (const c of state.constraints) {
    if (c._visualOnly) continue;  // skip — only rendered, not simulated
    // ... send to WASM
}
```

### ignorePairs Generation

The serialization system also generates `ignorePairs` — body ID pairs that the collision system should ignore. These come from:
1. Hinge-connected bodies (they'd constantly collide at the pivot)
2. Weld-connected bodies
3. Motor orbital bodies (World Pin + Disk, Orbital Pivot + Disk)
4. Bodies in the same logical component group that are placed overlapping by design

---

## 10. Simulator System

### SimulationCanvas.jsx — The rAF Loop

The simulation render loop runs in `requestAnimationFrame`:

```javascript
useEffect(() => {
    let animFrameId;

    const loop = () => {
        animFrameId = requestAnimationFrame(loop);

        if (!isRunning || !api.ready) return;

        // step physics
        api.step(1/60, 20);    // 20 sub-steps per frame

        // read render data (Float32Array view into WASM memory)
        const view = api.getLatestRenderData();
        if (!view) return;

        // update React store with live body positions (for InspectorPanel)
        const liveData = parseLiveData(view);
        useEditorStore.getState().setLiveBodyData(liveData);

        // draw to canvas
        const ctx = canvasRef.current.getContext('2d');
        simDraw.drawScene(ctx, view, bodyDefinitions, selectedBodyId, showVectors);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
}, [isRunning, api.ready, selectedBodyId, showVectors]);
```

**Why `useEditorStore.getState()` in the rAF callback?** The rAF callback is not a React render — calling `useEditorStore()` (the hook) there would violate React hooks rules. `getState()` is the escape hatch for accessing Zustand outside the render cycle.

### simDraw.js — Canvas Drawing

Pure functions that take a canvas context and the render data:

```javascript
// simDraw.js
export function drawScene(ctx, renderView, bodyDefs, selectedId, showVectors) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const count = renderView[0];
    for (let i = 0; i < count; i++) {
        const base = 1 + i * 10;
        const type     = renderView[base];
        const x        = renderView[base + 1];
        const y        = renderView[base + 2];
        const rotation = renderView[base + 3];
        const w        = renderView[base + 4];
        const h        = renderView[base + 5];
        const vx       = renderView[base + 6];
        const vy       = renderView[base + 7];
        const bodyId   = renderView[base + 9];

        const def = bodyDefs[bodyId];   // look up color, label from Zustand definition
        if (def?.isHiddenPin) continue; // skip invisible synthetic bodies

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        drawBody(ctx, w, h, type, def, bodyId === selectedId);
        ctx.restore();

        if (showVectors) drawVelocityArrow(ctx, x, y, vx, vy);
    }

    // draw rope/pulley segments
    const segStart = 1 + count * 10;
    const segCount = renderView[segStart];
    for (let s = 0; s < segCount; s++) {
        const sb = segStart + 1 + s * 4;
        drawSegment(ctx, renderView[sb], renderView[sb+1], renderView[sb+2], renderView[sb+3]);
    }
}
```

### HierarchyPanel.jsx

Shows a tree of all bodies and constraints. Clicking selects a node — updates `editorStore.selectedNodeId` and `selectedNodeType`. `InspectorPanel` reads the same state.

Bodies show their shape type and a color dot. Constraints show their type and the two bodies they connect.

### InspectorPanel.jsx

Shows live + editable properties for the selected body or constraint:

**For a selected body:**
- Shape, type (static/dynamic)
- Position and angle (read-only, from liveBodyData)
- Velocity (vx, vy, angularVelocity) — editable via `ModifyPropertyCommand`
- Material (density, friction, restitution) — editable via `ModifyPropertyCommand`
- Description (from body definition)

**For a selected constraint:**
- Type badge
- Compliance / stiffness (for Distance)
- Target angular velocity, max torque (for Motor) — editable, updates WASM via `setMotorParams` without a full rebuild

**`SliderRow.jsx`:** reusable component used throughout InspectorPanel. Has two modes:
- Editable: renders `<input type="range">` + `<input type="number">`, fires `onChange`
- ReadOnly: renders `ReadRow` (label + value display, styled differently)

---

## 11. Command Manager (Undo/Redo)

`commandManager` is a module-level singleton (not React state). It persists across renders. React components subscribe to it to re-render when the stack changes.

```
CommandManager
├── undoStack: Command[]      (max 50)
├── redoStack: Command[]
│
├── executeCommand(cmd):
│       cmd.execute()
│       undoStack.push(cmd)
│       if undoStack.length > 50: undoStack.shift()
│       redoStack = []        ← redo stack clears on new action
│       notifyListeners()
│
├── undo():
│       cmd = undoStack.pop()
│       cmd.undo()
│       redoStack.push(cmd)
│       notifyListeners()
│
└── redo():
        cmd = redoStack.pop()
        cmd.execute()
        undoStack.push(cmd)
        notifyListeners()
```

### TranslateGroupCommand

Used when the user drags a body in the simulator (while paused).

```
execute() first call:
    1. syncLiveToDefinitions()     ← capture current live positions into body defs
    2. preSnapshot = deep clone of { bodies, constraints }
    3. translateGroup(startBodyId, dx, dy)
    4. postSnapshot = deep clone of { bodies, constraints }
    5. rebuildScene()

execute() subsequent calls (redo):
    restoreSnapshot(postSnapshot)
    rebuildScene()

undo():
    restoreSnapshot(preSnapshot)
    rebuildScene()
```

### ModifyPropertyCommand

Used when the user edits a body/constraint property in InspectorPanel. Has 3 code paths:

```
_apply(value):
│
├─ VELOCITY_PROPS (vx, vy, angularVelocity):
│       updateBody() in store
│       angularVelocity:
│           must sync positions first (bodies may have moved)
│           then rebuildScene() (can't just set angular velocity live — XPBD)
│       vx / vy:
│           api.setLinearVelocity({ bodyId: wasmId, vx, vy })  ← live update, no rebuild
│
├─ MATERIAL_PROPS (density, friction, restitution):
│       updateBody() in store
│       api.setBodyMaterial({ bodyId: wasmId, density, friction, restitution })
│       ← WASM hot-updates material without rebuild
│
├─ REBUILD_PROPS (rotation, type):
│       updateBody() in store
│       syncLiveToDefinitions()
│       rebuildScene()   ← must rebuild (structural change)
│
└─ MOTOR_PARAMS (targetOmega, maxTorque):
        updateConstraint() in store
        api.setMotorParams({ bodyA: wasmId, targetOmega, maxTorque })
        ← WASM hot-updates motor without rebuild
```

The distinction between live-update (setLinearVelocity, setBodyMaterial, setMotorParams) and full-rebuild (rebuildScene) is important for performance. A full rebuild takes ~10ms; a live update is immediate.

### AddBodyCommand

```
execute():
    editorStore.addBody(body)
    api.addBox(body)  or  api.addCircle(body)

undo():
    editorStore.removeBody(body.id)
    api.rebuildScene()   ← rebuild because removeBody can't be done incrementally in WASM
```

---

## 12. Utils

### localAnchors.js

When the simulation runs, bodies move. The constraint anchors stored in `editorStore.constraints` are world-space coordinates from when the scene was built. They become stale as bodies move.

`localAnchors` stores each anchor's position in body-local space. Then at any point in simulation, the world-space anchor position can be recomputed from the current body position and angle.

**`computeLocalAnchors(bodies, constraints)`:**
```javascript
// For a HingeConstraint:
// anchor world pos = bodyCenter + rotate(localOffset, bodyAngle)
// → localOffset = rotate(anchorWorld - bodyCenter, -bodyAngle)

function toLocal(worldAnchor, body) {
    const dx = worldAnchor.x - body.x;
    const dy = worldAnchor.y - body.y;
    return rotate({ x: dx, y: dy }, -body.rotation);
}

// called for each constraint type's anchors
localAnchors[c.id] = {
    aLocal: toLocal({ x: c.ax, y: c.ay }, bodyA),
    bLocal: toLocal({ x: c.bx, y: c.by }, bodyB),
};
```

**`recalcFromLocal(c, la, bodyA, bodyB)`** (used in syncLiveToDefinitions):
```javascript
function toWorld(localOffset, body) {
    const rotated = rotate(localOffset, body.rotation);
    return { x: body.x + rotated.x, y: body.y + rotated.y };
}

return {
    ax: toWorld(la.aLocal, bodyA).x,
    ay: toWorld(la.aLocal, bodyA).y,
    bx: toWorld(la.bLocal, bodyB).x,
    by: toWorld(la.bLocal, bodyB).y,
};
```

### sceneConversion.js — `simFormatToBuilderFormat()`

The reverse of `serializationSystem.js`. Converts a simulator-format JSON (as loaded from the DB) back to builder-format components and connections. This is how "Edit" works on a saved machine.

**Key challenge:** filtering out synthetic bodies injected by serializationSystem:
```javascript
function isSyntheticBody(body) {
    return /^(World Pin |Orbital Pivot |Rotor )/.test(body.name);
}
const realBodies = scene.bodies.filter(b => !isSyntheticBody(b));
```

**Reconstructing connections from constraints:**
```javascript
// For each constraint, find which builder anchor keys correspond to the constraint's anchor positions
function findAnchorKey(bodyComponent, worldAnchorPos) {
    // iterate body's defined anchors, find closest one to worldAnchorPos
    let best = null, bestDist = Infinity;
    for (const [key, localPos] of Object.entries(bodyComponent.anchors)) {
        const worldPos = localToWorld(localPos, bodyComponent);
        const dist = distance(worldPos, worldAnchorPos);
        if (dist < bestDist) { bestDist = dist; best = key; }
    }
    return best;
}
```

This lets the editor reconstruct which anchor points the user connected when they built the machine.

---

## 13. CSS Architecture

### Design Tokens (tokens.css)

All colors, spacing, and typography are CSS custom properties:

```css
:root {
    /* background layers */
    --bg-base:    #0a0a0f;
    --bg-surface: #111118;
    --bg-panel:   #1a1a24;
    --bg-hover:   #22222e;

    /* text */
    --text-primary:   #e2e2ef;
    --text-secondary: #9898b2;
    --text-muted:     #5a5a7a;
    --text-disabled:  #3a3a52;

    /* accent */
    --accent:       #6c63ff;
    --accent-hover: #7c74ff;
    --accent-dim:   rgba(108,99,255,0.15);

    /* status */
    --success: #4ade80;
    --danger:  #f87171;
    --warning: #fbbf24;

    /* spacing */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
}
```

### Per-Component BEM-prefix CSS Files

Every component has its own CSS file in the same directory:

```
SimulatorPage.jsx  →  SimulatorPage.css  (prefix: simp-)
HierarchyPanel.jsx →  HierarchyPanel.css (prefix: hp-)
InspectorPanel.jsx →  InspectorPanel.css (prefix: ip-)
Toolbar.jsx        →  Toolbar.css        (prefix: stb-)
SimulationCanvas.jsx → SimulationCanvas.css (prefix: canvas-)
SliderRow.jsx      →  SliderRow.css      (prefix: sr-)
```

**BEM-prefix pattern:** instead of full BEM with `__` and `--`, the codebase uses short prefixes to achieve the same scoping without verbosity:
```css
/* HierarchyPanel.css */
.hp-root { display: flex; flex-direction: column; height: 100%; }
.hp-constraint-type { font-size: 11px; font-style: italic; }
```

**Dynamic colors as inline styles:** values computed at runtime (e.g., constraint type colors from a `CONSTRAINT_TYPE_COLORS` map, type badge background from `bodyType`) stay as `style={{ color: accentColor }}`. Only structural styles (layout, spacing, font size) live in CSS files.

**Example: Modifier classes for state:**
```jsx
// Toolbar.jsx
<button
    className={`stb-icon-btn${showVectors ? ' stb-vectors-btn--active' : ''}`}
    onClick={() => setShowVectors(v => !v)}
>
```

```css
/* Toolbar.css */
.stb-vectors-btn--active {
    color: var(--accent);
    background: var(--accent-dim);
}
```

**Palette color mixing (builder):** body layer colors use CSS `color-mix()`:
```css
.component {
    --lpal-color: #6c63ff;     /* set inline from palette config */
    background: color-mix(in srgb, var(--lpal-color) 15%, var(--bg-panel));
    border-color: color-mix(in srgb, var(--lpal-color) 60%, transparent);
}
```

This lets a single CSS class produce different tinted appearances by only changing one custom property inline.

---

## End-to-End Data Flow Diagram

```
User Action: "Simulate" button in Builder
        │
        ▼
BuilderPage.jsx:
    serializeToSimulator(builderStore.getState())
        │
        ▼ builder format → simulator format + synthetic bodies + ignorePairs
        │
    editorStore.loadScene(bodies, constraints, ignorePairs)
        │
        ▼
    navigate('/simulator')
        │
        ▼
SimulatorPage.jsx mounted:
    useSetupScene() calls api.rebuildScene()
        │
        ▼
usePhysicsWorker.js:
    rebuildScene():
        CLEAR_SCENE → Worker
        ADD_BOX / ADD_CIRCLE for each body → Worker → returns wasmId
        ADD_*_CONSTRAINT for each constraint → Worker
        ADD_IGNORE_PAIR for each pair → Worker
        editorStore.setIdMap(idMap)
        computeLocalAnchors() → editorStore.setLocalAnchors()
        REQUEST_RENDER_DATA → Worker
        │
        ▼
physicsWorker.js:
    sim.clearScene()
    sim.addBox(...) → returns uint32_t wasmId
    sim.addHinge(...) etc.
    sim.getRenderData() → Float32Array view
    postMessage({ type: 'RENDER_DATA', payload: Float32Array })
        │
        ▼
usePhysicsWorker.js:
    renderDataRef.current = msg.payload
        │
        ▼
SimulationCanvas.jsx rAF loop:
    api.step(1/60, 20)         → Worker → WASM step
    view = api.getLatestRenderData()
    editorStore.setLiveBodyData(parseLiveData(view))
    simDraw.drawScene(ctx, view, ...)
        │
        ▼
User sees: animated physics simulation on canvas
InspectorPanel reads: editorStore.liveBodyData for live position/velocity display
```
