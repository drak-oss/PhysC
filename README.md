# PhysC — 2D Physics Simulation Platform

> A full-stack web application where users design mechanical systems in a visual builder and run them through a custom physics engine compiled to WebAssembly. The simulation runs entirely in the browser at 60 fps — no server-side computation, no plugins.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [The Physics Engine (C++ → WebAssembly)](#3-the-physics-engine)
   - 3.1 [Memory Model — Generational Pool](#31-memory-model--generational-pool)
   - 3.2 [The Simulation Step Loop](#32-the-simulation-step-loop)
   - 3.3 [XPBD Solver](#33-xpbd-solver)
   - 3.4 [Constraints](#34-constraints)
   - 3.5 [Broad-Phase — Dynamic AABB Tree](#35-broad-phase--dynamic-aabb-tree)
   - 3.6 [Narrow-Phase — Contact Generation](#36-narrow-phase--contact-generation)
4. [WebAssembly Bridge & Web Worker](#4-webassembly-bridge--web-worker)
   - 4.1 [Zero-Copy Render Protocol](#41-zero-copy-render-protocol)
   - 4.2 [Web Worker Message Bus](#42-web-worker-message-bus)
5. [Frontend — React Application](#5-frontend--react-application)
   - 5.1 [Global State with Zustand](#51-global-state-with-zustand)
   - 5.2 [The Builder](#52-the-builder)
   - 5.3 [The Simulator](#53-the-simulator)
   - 5.4 [Undo/Redo — Command Pattern](#54-undoredo--command-pattern)
   - 5.5 [CSS Architecture](#55-css-architecture)
6. [Backend — Spring Boot REST API](#6-backend--spring-boot-rest-api)
   - 6.1 [Database Schema](#61-database-schema)
   - 6.2 [Authentication — JWT](#62-authentication--jwt)
   - 6.3 [REST Endpoints](#63-rest-endpoints)
7. [Running the Project](#7-running-the-project)

---

## 1. Project Overview

PhysC has three modes:

**Builder** — a canvas where you place rigid bodies (disks, blocks, static pins) and wire them together with constraints (hinges, springs, rods, motors, sliders, welds, pulleys, gears). You set per-body material properties — density, friction, restitution — and configure a per-body collision layer (A / B / C / None) so that only specific body groups collide with each other.

**Simulator** — launches the physics engine on the scene you built. A 60 Hz animation loop ticks the XPBD solver, draws the result on a `<canvas>` element, and streams live body state (position, velocity) to the inspector panel. You can adjust gravity in real time, step one frame at a time while paused, or inject velocity impulses into any body without stopping the simulation.

**Gallery** — authenticated users save their machines (name, description, public/private). Public machines are browsable and forkable by anyone. The full scene data is stored as JSON in MySQL.

---

## 2. System Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    Browser (single tab)                    │
│                                                           │
│  ┌─────────────────────────┐  ┌────────────────────────┐ │
│  │   Main Thread           │  │   Web Worker           │ │
│  │   React 19 + Vite 8     │  │   physicsWorker.js     │ │
│  │   Zustand store         │◄─┤   solver.wasm (C++)    │ │
│  │   Canvas 2D rendering   │  │   XPBD solver          │ │
│  │   Command Manager       │  │   Collision detection  │ │
│  └─────────────────────────┘  └────────────────────────┘ │
│             │ HTTPS / JWT                                  │
└─────────────┼─────────────────────────────────────────────┘
              │
     ┌────────▼────────┐
     │  Spring Boot 3  │
     │  Java 21        │
     │  JWT Auth       │
     └────────┬────────┘
              │ JPA / Hibernate
     ┌────────▼────────┐
     │   MySQL 8       │
     │   users         │
     │   machines      │
     └─────────────────┘
```

The physics work is entirely client-side. The backend only handles user accounts and persisting machine JSON — it never runs any simulation itself.

---

## 3. The Physics Engine

The engine is hand-written in C++ (no Box2D, no Bullet, no third-party physics library) and lives in `physc-frontend/engine/`. It is compiled to WebAssembly using Emscripten and loaded at runtime.

```
engine/
├── core/
│   ├── Handle.h          — Generational index (avoids dangling pointers)
│   ├── Pool.h            — Object pool backed by Handle<T>
│   └── Math.h            — Vec2, Mat22
├── physics/
│   ├── BodyManager.h/cpp — Rigid body state (position, velocity, mass, inertia)
│   └── ShapeManager.h/cpp— Circle and Box shapes, mass/inertia computation
├── collision/
│   ├── DynamicTree.h/cpp — AABB broad-phase (self-balancing binary tree)
│   ├── Narrowphase.h/cpp — Contact manifold generation (circle-circle, box-box, circle-box)
│   ├── CollisionManager  — Ties broad and narrow phase together; ignore-pair filtering
│   └── ContactConstraint — Contact resolved as an XPBD positional constraint
├── constraints/
│   ├── Constraint.h           — Abstract base (preSolve / solvePosition / solveVelocity)
│   ├── HingeConstraint.h      — Pins two anchor points together, allows rotation
│   ├── DistanceConstraint.h   — Maintains a rest length (rigid rod or spring via compliance)
│   ├── MotorConstraint.h      — Drives a body at a target angular velocity
│   ├── SliderConstraint.h     — Restricts motion to one linear axis
│   ├── WeldConstraint.h       — Locks both translation and rotation between two bodies
│   ├── PulleyConstraint.h     — Two-segment rope over a fixed pulley pair
│   └── GearConstraint.h       — Couples two bodies' angular velocities at a ratio
├── solver/
│   └── XPBDSolver.h      — Runs preSolve → solvePositions (4 sub-steps) → solveVelocities
└── wasm/
    └── Bindings.cpp      — EMSCRIPTEN_BINDINGS — exposes SimulationAPI to JavaScript
```

### 3.1 Memory Model — Generational Pool

Every body and shape is stored in a `Pool<T>`. Instead of raw pointers, everything is referenced by a `Handle<T>`:

```cpp
template<typename T>
struct Handle {
    uint32_t index;       // slot in the pool
    uint32_t generation;  // incremented every time a slot is reused
};
```

When a body is removed, its pool slot is recycled but the generation counter increments. Any old `Handle` that points to the recycled slot now has a stale generation and `pool.get(handle)` returns `nullptr` instead of corrupted data. This eliminates dangling pointer bugs without heap allocation overhead — every body is stored inline in a contiguous `std::vector<Slot>`.

### 3.2 The Simulation Step Loop

`World::step(dt, subSteps)` divides each frame's time delta into `subSteps` equal sub-steps (called with `subSteps = 20` from JS). For each sub-step:

```
1. Integrate forces → update velocity → predict new position (symplectic Euler)
2. Broad-phase: update AABB tree, query overlapping pairs
3. Narrow-phase: generate contact manifolds
4. preSolve: reset Lagrange multiplier λ on every constraint
5. solvePositions (×4 position iterations):
     - solve all joint constraints
     - solve all contact constraints
6. Velocity correction (derive velocity from position delta):
     velocity = (position_new − position_old) / subDt
7. solveVelocities: friction and restitution impulses on contacts
```

The key insight of XPBD is that velocity is *derived* from position change (step 6) rather than being the primary state. Constraints only operate on positions — making them unconditionally stable regardless of time step size.

### 3.3 XPBD Solver

XPBD (Extended Position-Based Dynamics, Müller et al. 2020) is the alternative to traditional impulse-based solvers. The core formula for a single scalar constraint is:

```
ΔC = C(x) — the constraint violation
w  = Σ (invMass + r × r * invInertia)   — generalized inverse mass
α̃  = compliance / dt²                   — time-scaled compliance

Δλ = (−C − α̃ · λ) / (w + α̃)
ΔP = Δλ · ∇C                            — positional correction impulse
```

`λ` is the accumulated Lagrange multiplier, reset every sub-step (XPBD's "warm starting reset"). `compliance` is the physical softness of the constraint — 0.0 is perfectly rigid, higher values make it elastic. This means a spring and a rigid rod are the same code path, just different compliance values.

**Why XPBD instead of impulse-based?**
Impulse-based solvers (like Box2D) solve velocity corrections and can become unstable at large time steps or with many constraint cycles. XPBD works directly on positions, is unconditionally stable, and naturally handles compliance without extra springs. The trade-off is that XPBD needs multiple sub-steps to converge — hence the `subSteps = 20` call per frame.

### 3.4 Constraints

**HingeConstraint** — the constraint violation is the 2D vector `C = pA − pB` (the gap between the two anchor points in world space). The effective mass matrix is a 2×2 system:

```cpp
K.m00 = invMassA + invMassB + rA.y² * invInertiaA + rB.y² * invInertiaB;
K.m11 = invMassA + invMassB + rA.x² * invInertiaA + rB.x² * invInertiaB;
K.m01 = K.m10 = −rA.x*rA.y*invInertiaA − rB.x*rB.y*invInertiaB;
```

Adding `α̃` to the diagonal regularises it (prevents singularity for bodies with zero inverse mass) and gives compliance. `K` is inverted to get the correction impulse `ΔP`, which is applied as both a translational and rotational correction to each body.

**DistanceConstraint** — scalar constraint `C = |pB − pA| − restLength`. The direction vector `n` becomes the gradient `∇C`. The effective mass is a scalar `w = wA + wB` where each weight accounts for both linear and angular contribution of the anchor offset:

```cpp
rnA = rA × n;    // scalar cross product
wA  = invMassA + rnA² * invInertiaA;
```

Setting `compliance = 0` makes it a rigid rod. `compliance = 0.005` makes it a spring.

**MotorConstraint** — instead of a positional correction it directly drives angular velocity:
`angularVelocityA += torque * invInertiaA`, clamped to `maxTorque` per sub-step.

**GearConstraint** — keeps `rotationB + ratio * rotationA = constant`. Useful for synchronized gear trains.

### 3.5 Broad-Phase — Dynamic AABB Tree

The broad-phase uses a self-balancing binary tree where every leaf node is a body's fat AABB (axis-aligned bounding box inflated by a small margin so minor movement doesn't require a tree update). Interior nodes store the union of their children's AABBs.

Querying for overlapping pairs is a traversal: start at the root, descend only into branches whose AABB intersects the query AABB. This gives O(n log n) pair detection instead of O(n²) brute force.

The tree rebalances via AVL-style rotations (`balance()`) after every insertion or removal. The `freeList` is a singly-linked list of recycled nodes to avoid repeated allocation.

### 3.6 Narrow-Phase — Contact Generation

Four contact generation paths:
- **Circle–Circle**: distance < rA + rB → one contact point, normal along centre-to-centre axis
- **Box–Box**: Separating Axis Test (SAT) on 4 edge normals → up to 2 contact points (clipped edge features)
- **Circle–Box**: find closest point on box to circle centre, check distance < radius
- **Box–Circle**: symmetric to above

Each contact produces a `ContactManifold` with one or two `ContactPoint`s carrying penetration depth, contact normal, and local anchor offsets. These are fed into the XPBD solver as `ContactConstraint` instances — they use the same `solvePosition` / `solveVelocity` interface as all other constraints, keeping the solver generic.

---

## 4. WebAssembly Bridge & Web Worker

### 4.1 Zero-Copy Render Protocol

After each `world.step()`, the engine calls `getRenderData()` which fills a `std::vector<float>` (a member of `SimulationAPI`, so it never heap-allocates during the render loop):

```
[count, type,x,y,rot,w,h,vx,vy,angVel,bodyId, ... ×count, segCount, x1,y1,x2,y2, ... ×segCount]
```

Each body occupies exactly **10 floats** (stride). The function returns this as an `emscripten::typed_memory_view` — a JavaScript `Float32Array` that directly aliases the C++ vector's memory. No copy, no JSON serialisation. The JS render loop reads from this array at 60 fps without allocating a single object.

```js
// zero-copy: renderData is a Float32Array into WASM linear memory
const count = data[0];
for (let i = 0; i < count; i++) {
    const idx = 1 + i * 10;
    const x = data[idx+1], y = data[idx+2], rot = data[idx+3];
    // ... draw
}
```

### 4.2 Web Worker Message Bus

The WASM module runs inside `public/physicsWorker.js` — a dedicated Web Worker. This keeps the physics step off the main thread so React rendering is never blocked by a slow frame.

The worker receives typed messages (`STEP`, `ADD_BOX`, `ADD_HINGE_CONSTRAINT`, etc.) and replies with either fire-and-forget responses or promise-tracked `RESULT` messages:

```js
// in main thread (usePhysicsWorker.js)
const sendMessageWithResult = (type, payload) => {
    return new Promise((resolve) => {
        const id = ++msgIdCounter.current;
        callbacks.current.set(id, resolve);
        worker.postMessage({ type, payload, id });
    });
};
// worker replies: { type: 'RESULT', id, result: wasmBodyId }
// main thread resolves the promise → stores wasmId in idMap
```

`addBox` and `addCircle` are async because they need the WASM body ID back to build the `idMap` (the mapping from React-side body IDs to WASM slot indices). Everything else (`step`, `setLinearVelocity`, constraint additions) is fire-and-forget.

**rebuildScene** is called whenever a structural change happens that cannot be patched incrementally (body type change, rotation change, any constraint modification). It clears the WASM world, replays all bodies and constraints from Zustand state, and reconstructs `idMap`. A hidden "global ground" body (invisible, zero-size static box) is always added first — any constraint whose bodies include `null` (anchored to world) binds to this ground body instead.

---

## 5. Frontend — React Application

**Stack:** React 19, Vite 8, Zustand 5, React Router 7, Axios.

```
src/
├── store/editorStore.js       — single source of truth for all scene state
├── commands/CommandManager.js — undo/redo stack
├── hooks/
│   ├── usePhysicsWorker.js    — Web Worker bridge + api object
│   └── useWasm.js             — alternative: loads WASM on main thread
├── builder/                   — visual scene editor
│   ├── componentRegistry.js   — defines every body/constraint type and its defaults
│   ├── serializationSystem.js — converts builder format → simulator format
│   └── components/            — BuilderCanvas, LeftPalette, BuilderToolbar, property panels
├── simulator/                 — live simulation view
│   ├── SimulationCanvas.jsx   — rAF loop, calls api.step(), draws to Canvas 2D
│   ├── HierarchyPanel.jsx     — scene graph tree
│   ├── InspectorPanel.jsx     — live property editor
│   └── canvas/simDraw.js      — all Canvas 2D draw calls (bodies, constraints, HUD, grid)
├── pages/                     — BuilderPage, SimulatorPage, GalleryPage, AccountPage, Landing
└── styles/                    — tokens.css, base.css, layout.css, toolbar.css, panels.css
```

### 5.1 Global State with Zustand

A single `editorStore` holds:

```js
{
  bodies: [],           // array of body definitions
  constraints: [],      // array of constraint definitions
  selectedNodeId: null, // currently selected body or constraint
  idMap: {},            // { reactBodyId: wasmBodyIndex }
  liveBodyData: {},     // { reactBodyId: { x, y, vx, vy, rotation, angularVelocity } }
  gravity: 1.0,
  sceneVersion: 0,      // incremented to force full re-mount of SimulationCanvas
  activeTool: 'select', // or 'disk', 'block', 'hinge', 'spring', ...
}
```

**Why Zustand over Redux?** Zustand has no boilerplate — you import a hook and read a slice. The store is also accessible outside React components (as `useEditorStore.getState()`) which is important for the Command Manager, which runs outside the component tree.

The `liveBodyData` slice is written at 60 fps by `SimulationCanvas` as it reads the `Float32Array` from the worker. The InspectorPanel reads from it to display live position/velocity. Only the selected body's slice triggers a re-render because of Zustand's selector subscriptions.

### 5.2 The Builder

`BuilderCanvas` renders on a `<canvas>` element using Canvas 2D APIs. All drawing logic is in `builder/canvas/builderDraw.js`. Mouse input (click, drag, hover) is handled in `builder/canvas/useBuilderInput.js` as a custom hook.

**Collision detection in the builder (pre-simulation check):** Before you can launch the simulator, the builder checks whether any two bodies that can actually collide with each other (based on their collision category/mask bitmasks) are currently overlapping. This is done in Zustand via a JS AABB check on every body mutation. If overlaps exist, the "Simulate" button is blocked and the offending bodies are highlighted — because overlapping bodies in WASM would cause the constraint solver to diverge immediately.

**Component Registry:** `componentRegistry.js` is a declarative map that describes every supported body and constraint type — its display name, icon, colour, default property values, and which property controls to render. Adding a new constraint type means adding one entry here and a matching C++ constraint class.

**Serialization:** The builder stores bodies with a `shape` field (`'Circle'`, `'Box'`) and `isStatic` bool. The simulator uses a numeric `type` field (0 = Static, 1 = Kinematic, 2 = Dynamic) matching the WASM `BodyType` enum. `serializationSystem.js` translates between these formats before switching pages.

### 5.3 The Simulator

`SimulationCanvas` owns the `requestAnimationFrame` loop:

```
each frame:
  1. accumulate frameTime (capped at 100 ms to avoid spiral of death)
  2. while accumulator >= fixedDt (1/60 s):
       if gravity ≠ 1×: inject extra vy into all dynamic bodies via setLinearVelocity
       api.step(fixedDt, 20)       — sends STEP to worker
       accumulator -= fixedDt
  3. api.requestRenderData()       — requests Float32Array back from worker
  4. draw()                        — reads Float32Array, draws to canvas
```

The gravity multiplier is handled by injecting an extra velocity per tick rather than changing the WASM world's gravity constant. This is because changing the gravity field in WASM would require a message round-trip and reset accumulated forces. Adding `(gravity - 1.0) × G_BUILTIN × dt` to every dynamic body's vy achieves the same effect without any API change.

`simDraw.js` draws:
- **Grid** — faint lines every 50 px as spatial reference
- **Bodies** — filled rectangles (boxes) and circles with selection highlight, static body hatching, body name labels
- **Constraints** — coloured line segments between anchor points; motors get a circular arc, springs get a zigzag, pulleys get a three-segment rope
- **Velocity vectors** — arrows scaled to body speed, optionally toggled per body
- **HUD** — FPS counter, total mechanical energy (KE + PE), run/pause indicator

### 5.4 Undo/Redo — Command Pattern

`CommandManager` maintains two stacks (`undoStack`, `redoStack`, max 50 entries). Every mutation is wrapped in a `Command` object with `execute()` and `undo()` methods:

**`ModifyPropertyCommand`** — covers property edits in the InspectorPanel. It knows which of three code paths to take after updating Zustand:
- **Velocity props** (`vx`, `vy`): call `physicsApi.setLinearVelocity()` directly — no rebuild needed
- **Material props** (`density`, `friction`, `restitution`): call `physicsApi.setBodyMaterial()` — updates mass/inertia in WASM without rebuild
- **Structural props** (`rotation`, `type`): call `physicsApi.rebuildScene()` — must fully reconstruct the WASM world

**`TranslateGroupCommand`** — moving a body in the simulator. Because bodies are constraint-connected, moving one needs to move the entire connected component (graph traversal via BFS on the constraint graph). The command snapshots the full scene before and after, so undo restores the entire connected subgraph.

**`AddBodyCommand`** — places a body via both Zustand and the WASM worker, undone by removing from Zustand and calling `rebuildScene`.

The CommandManager also has a `subscribe(listener)` method that the Toolbar watches — when the stack changes, the Undo/Redo buttons update their `disabled` state.

### 5.5 CSS Architecture

Global design tokens live in `src/styles/tokens.css` as CSS custom properties:
```css
--bg-void, --bg-surface, --bg-active
--text-primary, --text-secondary, --text-muted, --text-disabled
--accent, --accent-light, --accent-border
--border-subtle, --border-mid
--radius, --radius-sm
--green, --green-dim, --blue, --blue-dim, --orange, --teal
```

Every component has a co-located `.css` file with a short BEM-style prefix to prevent class name collisions:
`bt-` (BuilderToolbar), `lpal-` (LeftPalette), `ip-` (InspectorPanel), `simp-` (SimulatorPage), etc.

Dynamic per-instance colors (constraint badge colors, active-card highlights) use CSS custom properties passed as inline `style`:
```jsx
// jsx
<button style={{ '--lpal-color': color }} className="lpal-card lpal-card--active" />
```
```css
/* css */
.lpal-card--active {
  background: color-mix(in srgb, var(--lpal-color) 12%, transparent);
  border-color: var(--lpal-color);
}
```
This eliminates all JavaScript colour math at paint time — the browser resolves `color-mix()` natively.

---

## 6. Backend — Spring Boot REST API

**Stack:** Spring Boot 3.3, Java 21, Spring Security, Spring Data JPA, jjwt 0.12, Lombok, MySQL 8.

### 6.1 Database Schema

```sql
CREATE TABLE users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,      -- bcrypt hash
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FULLTEXT INDEX ft_users_search (username)
);

CREATE TABLE machines (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    forked_from_id  BIGINT NULL,             -- NULL if original; points to parent if forked
    name            VARCHAR(100) NOT NULL,
    description     TEXT NULL,
    machine_data    JSON NOT NULL,           -- full bodies + constraints JSON blob
    thumbnail       TEXT NULL,               -- base64 canvas snapshot
    is_public       TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_machines_user       FOREIGN KEY (user_id)        REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_machines_forked_from FOREIGN KEY (forked_from_id) REFERENCES machines(id) ON DELETE SET NULL,
    FULLTEXT INDEX ft_machines_search (name, description)
);
```

`machine_data` stores the complete scene as a MySQL JSON column — no separate tables for bodies or constraints. This makes save and load a single row read/write and keeps the schema simple. The trade-off is that you cannot query individual bodies, but the use case never requires it.

`forked_from_id` being `ON DELETE SET NULL` means if the original machine is deleted, forks keep their data but lose their lineage pointer — which is the right behaviour.

### 6.2 Authentication — JWT

Spring Security is configured as stateless (no session). Every protected endpoint goes through `JwtAuthFilter`:

1. Extract `Authorization: Bearer <token>` header
2. Parse and validate the JWT signature using the secret key (HS256)
3. Check expiry
4. Load `UserDetails` from DB by username claim
5. Set `UsernamePasswordAuthenticationToken` in `SecurityContextHolder`

Passwords are hashed with `BCryptPasswordEncoder` (Spring Security default, cost factor 10). The JWT payload contains only `{ sub: username, iat, exp }` — no roles, no sensitive data.

### 6.3 REST Endpoints

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/api/auth/signup` | — | Register — validates unique username/email, stores bcrypt hash, returns JWT |
| POST | `/api/auth/login` | — | Verify password, return signed JWT |
| GET | `/api/machines/gallery` | — | Paginated public machines, optional search query (FULLTEXT) |
| GET | `/api/machines/my` | JWT | All machines owned by the calling user |
| GET | `/api/machines/{id}` | optional | Machine detail — returns full `machine_data` JSON |
| POST | `/api/machines/save` | JWT | Upsert — creates or updates owned machine |
| POST | `/api/machines/{id}/fork` | JWT | Copies a public machine to the caller's account, sets `forked_from_id` |
| DELETE | `/api/machines/{id}` | JWT | Delete — service layer verifies `user_id` matches caller |
| GET | `/api/users/profile` | JWT | Return username, email, machine count |
| PUT | `/api/users/profile` | JWT | Update username or email |
| PUT | `/api/users/password` | JWT | Verify old password, store new bcrypt hash |
| DELETE | `/api/users/account` | JWT | Delete account and all owned machines (CASCADE) |

Global exception handling via `@ControllerAdvice` — `ResourceNotFoundException` → 404, `UnauthorizedException` → 403, Bean Validation errors → 400 with field-level messages.

---

## 7. Running the Project

### Prerequisites
- Node.js 20+, Java 21, MySQL 8
- Emscripten SDK only if you need to recompile WASM (pre-built `solver.js` + `solver.wasm` are in `physc-frontend/public/`)

### Database
```bash
mysql -u root -p < physc-backend/src/main/resources/schema.sql
```

### Backend
```bash
# set these or put them in application.properties
export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/physc_db
export SPRING_DATASOURCE_USERNAME=root
export SPRING_DATASOURCE_PASSWORD=your_password
export JWT_SECRET=your_256_bit_secret_key_here

cd physc-backend
./mvnw spring-boot:run
# listening on http://localhost:8080
```

### Frontend
```bash
cd physc-frontend
npm install
npm run dev
# http://localhost:5173
```

### Rebuild WASM (optional)
```bash
# inside physc-frontend/ with emsdk activated
npm run build:wasm
# runs: cmake → emcmake → ninja → copies solver.js + solver.wasm to public/
```

---
