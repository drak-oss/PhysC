# PhysC Engine — Deep Explanation
## C++ Physics Engine + WebAssembly + Emscripten

> A custom 2D rigid-body physics engine written in C++17, compiled to WebAssembly via Emscripten, running in a Web Worker so the browser's main thread is never blocked. Implements XPBD (Extended Position-Based Dynamics) with constraint-based contacts, a generational pool, and a zero-copy Float32Array render protocol.

---

## Table of Contents

1. [What the Engine Does](#1-what-the-engine-does)
2. [Engine Source Layout](#2-engine-source-layout)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Memory Model — Pool & Handle](#4-memory-model--pool--handle)
5. [World Step Loop — Frame Lifecycle](#5-world-step-loop--frame-lifecycle)
6. [XPBD Solver — The Math](#6-xpbd-solver--the-math)
7. [Constraint Implementations](#7-constraint-implementations)
8. [Broad Phase — Dynamic AABB Tree](#8-broad-phase--dynamic-aabb-tree)
9. [Narrow Phase — Contact Generation](#9-narrow-phase--contact-generation)
10. [Collision Manager](#10-collision-manager)
11. [WebAssembly Bridge (Bindings.cpp)](#11-webassembly-bridge-bindingscpp)
12. [Zero-Copy Render Protocol](#12-zero-copy-render-protocol)
13. [Emscripten Build Pipeline](#13-emscripten-build-pipeline)
14. [Web Worker Message Bus](#14-web-worker-message-bus)

---

## 1. What the Engine Does

The engine owns the entire physics lifecycle:

- **Integration** — velocity Verlet: advance positions/angles from current velocities
- **Broad phase** — find potentially-colliding pairs cheaply (AABB tree)
- **Narrow phase** — exact contact points and normals for each pair (SAT / distance checks)
- **Constraint solving** — XPBD position corrections for all joints AND contacts (same interface)
- **Velocity derivation** — angular and linear velocity derived from position delta (not integrated separately)
- **Velocity solve** — friction and restitution impulses
- **Render export** — write all body state to a contiguous Float32Array shared with JavaScript (zero copy)

The engine does NOT:
- Render anything
- Know about React, Zustand, or any frontend concept
- Touch the DOM

---

## 2. Engine Source Layout

```
physc-frontend/engine/
│
├── core/
│   ├── Handle.h                — { index: uint32_t, generation: uint32_t }
│   ├── Pool.h                  — generational slot-based object pool
│   ├── Body.h / Body.cpp       — rigid body data + integration
│   ├── World.h / World.cpp     — simulation root (owns all subsystems)
│   └── SimulationAPI.h / .cpp  — public interface exposed to Emscripten
│
├── math/
│   ├── Vec2.h                  — 2D vector: add, sub, dot, cross, rotate, length
│   └── Mat2.h                  — 2×2 matrix: identity, from-angle, mul, inverse, solve2x2
│
├── broadphase/
│   └── DynamicTree.h / .cpp    — self-balancing AABB tree (no sweep, O(n log n))
│
├── collision/
│   ├── CollisionManager.h/.cpp — broad+narrow pipeline, contact cache, ignorePairs
│   ├── shapes/
│   │   ├── Shape.h             — base Shape interface (Circle, Box)
│   │   ├── CircleShape.h
│   │   └── BoxShape.h
│   └── narrowphase/
│       ├── CircleCircle.h/.cpp — collision detection: two circles
│       ├── BoxBox.h/.cpp       — collision detection: two boxes (SAT)
│       ├── CircleBox.h/.cpp    — collision detection: circle vs box (closest point)
│       └── BoxCircle.h/.cpp    — collision detection: box vs circle (redirect)
│
├── constraints/
│   ├── Constraint.h            — abstract base: solvePosition(), solveVelocity()
│   ├── ContactConstraint.h/.cpp— position + velocity solve for a contact point
│   ├── HingeConstraint.h/.cpp  — 2D revolute joint (2-DOF position lock)
│   ├── DistanceConstraint.h/.cpp — fixed or spring distance between anchor points
│   ├── MotorConstraint.h/.cpp  — drives relative angular velocity
│   ├── SliderConstraint.h/.cpp — prismatic joint (slide along one axis)
│   ├── WeldConstraint.h/.cpp   — fully rigid joint (position + angle lock)
│   ├── PulleyConstraint.h/.cpp — rope over pulley (3-segment length conservation)
│   └── GearConstraint.h/.cpp  — couple angular velocities of two bodies
│
└── Bindings.cpp                — Emscripten EMSCRIPTEN_BINDINGS block
```

---

## 3. Architecture Diagram

```
                      JavaScript (React / Worker)
                               │
                    postMessage('STEP', { dt, substeps })
                               │
                               ▼
              ┌─────────────────────────────────────┐
              │          physicsWorker.js            │
              │   (runs in a dedicated Web Worker)   │
              │                                      │
              │   wasmModule.SimulationAPI.step(dt)  │
              └─────────────────┬───────────────────┘
                                │ calls into WASM linear memory
                                ▼
              ┌─────────────────────────────────────────────────────────┐
              │                  SimulationAPI (C++)                    │
              │  ┌─────────────────────────────────────────────────┐   │
              │  │                    World                         │   │
              │  │                                                  │   │
              │  │  Pool<Body>          Pool<Constraint>            │   │
              │  │  Pool<Shape>         Pool<ContactConstraint>     │   │
              │  │                                                  │   │
              │  │  ┌─────────────┐   ┌─────────────────────────┐ │   │
              │  │  │ DynamicTree │   │   ConstraintSolver       │ │   │
              │  │  │ (AABB tree) │   │   XPBD pos iterations    │ │   │
              │  │  └─────┬───────┘   │   velocity corrections   │ │   │
              │  │        │           └─────────────────────────┘ │   │
              │  │        ▼                                        │   │
              │  │  CollisionManager                               │   │
              │  │  ├─ broadphase  → candidate pairs              │   │
              │  │  ├─ narrowphase → manifolds (ContactData)      │   │
              │  │  └─ contactCache → persistent ContactConstraint │   │
              │  │                                                  │   │
              │  └─────────────────────────────────────────────────┘   │
              │                                                         │
              │  getRenderData() → typed_memory_view (Float32Array)     │
              └─────────────────────────────────────────────────────────┘
                                │
                    Float32Array view (zero copy)
                                │
                                ▼
              ┌──────────────────────────────────────┐
              │        SimulationCanvas.jsx           │
              │   reads Float32Array on each rAF     │
              │   draws via Canvas 2D API             │
              └──────────────────────────────────────┘
```

---

## 4. Memory Model — Pool & Handle

### The Problem

If bodies are stored in a `std::vector<Body>`, then:
- Removing an element invalidates all existing pointers/indices beyond that element
- You can't hold a raw pointer or raw index to a body and trust it across frame boundaries

### The Solution: Generational Pool

```
Pool<Body>
┌─────────────────────────────────────────────────────┐
│ slots: vector<Slot>                                 │
│  ┌───────────────────────────────────────────────┐ │
│  │ index 0: { data: Body, generation: 0, active: true  } │
│  │ index 1: { data: Body, generation: 2, active: false } │ ← removed, gen bumped
│  │ index 2: { data: Body, generation: 0, active: true  } │
│  └───────────────────────────────────────────────┘ │
│ freeIndices: [1]                                    │
└─────────────────────────────────────────────────────┘

Handle<Body> h = { index: 1, generation: 2 }

pool.get(h):
  slots[1].active == false  → returns nullptr  ← stale handle detected!

Next insert reuses slot 1:
  slots[1].generation = 2   (same generation — the slot was already bumped on remove)
  slots[1].active = true
  returns Handle{ index: 1, generation: 2 }  ← old handle now resolves correctly again
```

**Handle.h:**
```cpp
template<typename T>
struct Handle {
    uint32_t index;
    uint32_t generation;
    bool operator==(const Handle& o) const {
        return index == o.index && generation == o.generation;
    }
};
```

**Pool.h key operations:**
```cpp
Handle<T> insert(const T& item);   // reuse free slot or push new slot
T* get(Handle<T> handle);           // returns nullptr if stale
void remove(Handle<T> handle);      // marks inactive, bumps generation
void forEach(Func&& func);          // iterate all active slots
```

This means you can hold a `Handle<Body>` across frames (even across vector reallocations as the pool grows) and call `get()` to check if the body still exists.

**Why this matters in practice:** `HingeConstraint` stores `Handle<Body> bodyA, bodyB`. When `bodyA` is deleted, the handle becomes stale, `get()` returns `nullptr`, and the constraint skips its solve without crashing.

---

## 5. World Step Loop — Frame Lifecycle

`SimulationAPI::step(dt)` calls `world.step(dt / substeps)` 20 times per frame.

Each sub-step:

```
World::step(subDt)
│
├─ 1. INTEGRATE POSITIONS
│      for each active Body:
│          if static: skip
│          body.velocity += gravity * subDt
│          body.prevPosition = body.position
│          body.prevAngle = body.angle
│          body.position += body.velocity * subDt
│          body.angle += body.angularVelocity * subDt
│
├─ 2. BROAD PHASE
│      collisionManager.updateBroadPhase()
│          for each active body: update its AABB in DynamicTree
│          DynamicTree.query() → candidate pairs
│
├─ 3. NARROW PHASE
│      collisionManager.generateContacts()
│          for each candidate pair (shapeA, shapeB):
│              skip if in ignorePairs
│              call narrowphase function (circle-circle, box-box, etc.)
│              if collision: look up / create ContactConstraint in contactCache
│              else: remove stale ContactConstraint from contactCache
│
├─ 4. PRE-SOLVE
│      for each Constraint (joints + contacts):
│          constraint.preSolve(subDt)
│          → resets accumulated lambda (λ) to zero for the new sub-step
│
├─ 5. SOLVE POSITIONS (4 iterations)
│      for iteration in 0..3:
│          for each Constraint (joints first, contacts second):
│              constraint.solvePosition(subDt)
│
├─ 6. DERIVE VELOCITIES
│      for each active Body:
│          body.velocity = (body.position - body.prevPosition) / subDt
│          body.angularVelocity = (body.angle - body.prevAngle) / subDt
│
└─ 7. SOLVE VELOCITIES
       for each Constraint:
           constraint.solveVelocity(subDt)
           → friction impulse (tangential, proportional to normal impulse × friction)
           → restitution impulse (bounce if closing velocity > threshold)
```

**Why 20 sub-steps?** XPBD converges better with more, smaller steps than fewer, larger ones. 20 sub-steps with `dt = 1/60` means each sub-step is 0.833ms — small enough that one iteration of position solving gives accurate results.

**Why 4 position iterations per sub-step?** Constraint interactions (e.g., two hinges sharing a body) need multiple passes to converge. 4 is empirically sufficient for the constraint types used.

---

## 6. XPBD Solver — The Math

XPBD (Müller et al. 2020) corrects constraint violations directly in position space, not in velocity/force space. This makes it unconditionally stable at any timestep.

### Core Formula

For a constraint with scalar violation `C` and generalized inverse masses `w = Σ(1/m_i · ∇C_i · ∇C_i)`:

```
           −C − α̃ · λ
Δλ = ─────────────────────
              w + α̃

α̃ = compliance / dt²

New lambda:    λ ← λ + Δλ
Position correction for body i:
   Δx_i = (1/m_i) · ∇C_i · Δλ
```

Where:
- `λ` is the accumulated constraint impulse (Lagrange multiplier)
- `α̃` (alpha-tilde) is the time-step-scaled compliance
- `compliance = 0` → rigid (infinitely stiff) constraint
- `compliance > 0` → soft spring-like constraint
- `∇C_i` is the gradient of the constraint function with respect to body i's position

**In a hinge joint** the constraint `C` = (position of anchor on bodyA in world space) − (position of anchor on bodyB in world space). This is a 2D vector, so the "scalar formula" becomes a 2×2 matrix solve.

**In a distance constraint** `C = |anchorA − anchorB| − targetDistance` — a scalar, so Δλ is a single float.

### Velocity Solve (Restitution + Friction)

After positions are corrected, velocities are re-derived and then a velocity-level solve adds:

```
Normal impulse (restitution):
   v_rel_n = dot(relativeVelocity, normal)
   if v_rel_n < -threshold:
       impulse = −(1 + e) · v_rel_n / (1/mA + 1/mB)
       where e = restitution coefficient

Friction impulse (Coulomb):
   v_rel_t = relativeVelocity − v_rel_n · normal
   tangentialImpulse = clamp(−|v_rel_t| / (1/mA + 1/mB), −μ·normalImpulse, μ·normalImpulse)
```

---

## 7. Constraint Implementations

All constraints implement the same interface:
```cpp
class Constraint {
public:
    virtual void preSolve(float dt) = 0;
    virtual void solvePosition(float dt) = 0;
    virtual void solveVelocity(float dt) = 0;
};
```

This means the solver loop doesn't need to know the type — it just calls `solvePosition()` on every constraint in the list.

### HingeConstraint (Revolute Joint)

**What it does:** locks the relative position of two anchor points. Bodies can still rotate relative to each other.

**Math:** `C = anchorWorldA − anchorWorldB` (2D vector)

For a 2D positional constraint, the generalized mass matrix becomes 2×2:

```
K = [1/mA + 1/mB + ...inertia terms...]   (2×2)
Δλ₂ₓ₁ = K⁻¹ · (−C − α̃ · λ)

Position corrections:
  bodyA.position += (1/mA) · Δλ
  bodyB.position -= (1/mB) · Δλ

Rotation corrections (using cross products for moment arms):
  bodyA.angle += (1/IA) · cross(rA_world, Δλ)
  bodyB.angle -= (1/IB) · cross(rB_world, Δλ)
```

Where `rA_world` is the world-space moment arm from bodyA's center to anchor point A.

The K matrix (also called the effective mass matrix):
```
K₁₁ = 1/mA + 1/mB + rAy²/IA + rBy²/IB
K₁₂ = K₂₁ = −(rAx·rAy/IA + rBx·rBy/IB)
K₂₂ = 1/mA + 1/mB + rAx²/IA + rBx²/IB
```
Solved via `Mat2::solve2x2()` (Cramer's rule, 4 multiplications).

### DistanceConstraint

**What it does:** maintains a fixed or spring-like distance between two anchor points.

**Math:** `C = |anchorA − anchorB| − d` (scalar)

```
n = normalize(anchorA − anchorB)   ← contact normal

w = dot(n, n)/mA + dot(−n, −n)/mB + (cross(rA, n))²/IA + (cross(rB, n))²/IB

Δλ = (−C − α̃ · λ) / (w + α̃)

bodyA.position += (1/mA) · n · Δλ
bodyB.position -= (1/mB) · n · Δλ
bodyA.angle    += (1/IA) · cross(rA, n) · Δλ
bodyB.angle    -= (1/IB) · cross(rB, n) · Δλ
```

- `compliance = 0` → rigid rod
- `compliance = 0.0001` → stiff spring
- Frontend maps: `'Rod' → compliance=0`, `'Spring' → compliance=0.0001`, `'Distance' → compliance=0`

### MotorConstraint

**What it does:** drives the relative angular velocity of two bodies toward a target.

**Unusual aspect:** uses position-level XPBD but targets *velocity*, not position.

```
angularError = (bodyA.angle − bodyB.angle) − previousAngle
previousAngle += targetOmega · dt

C = angularError   (1 DOF)

w = 1/IA + 1/IB

Δλ = (−C − α̃ · λ) / (w + α̃)

λ = clamp(λ + Δλ, −maxL, maxL)     ← torque clamping
    where maxL = maxTorque · dt / compliance

Δλ_actual = λ − λ_before_clamp

bodyA.angle += (1/IA) · Δλ_actual
bodyB.angle -= (1/IB) · Δλ_actual
```

By clamping `λ`, the motor stops driving when it hits its torque limit (it can be stalled).

### SliderConstraint (Prismatic Joint)

**What it does:** allows relative translation along one axis only. Locks the perpendicular direction and locks relative rotation.

- 2D position constraint on the perpendicular axis: `C_perp = dot(anchorB − anchorA, perp)` where `perp = rotate90(axisDirection)`
- 1D angular constraint: `C_angle = bodyA.angle − bodyB.angle − referenceAngle`

Both solved as separate XPBD sub-constraints in `solvePosition()`.

### WeldConstraint

**What it does:** fully rigid joint — locks both translation (2D) and rotation (1D).

Same K matrix as hinge for the translational part, plus a separate scalar solve for the rotational mismatch:
```
C_rot = bodyA.angle − bodyB.angle − (referenceAngleA − referenceAngleB)
```

### PulleyConstraint

**What it does:** conserves total rope length across three rope segments: A-to-pulley1, pulley1-to-pulley2 (fixed), pulley2-to-B.

```
segA = |anchorA − pulley1|
segB = |anchorB − pulley2|
C = segA + segB − totalLength
```

Scalar XPBD solve. The gradient is split between the A-side normal and the B-side normal.

### GearConstraint

**What it does:** couples the angular velocities of two bodies with a gear ratio.

```
C = bodyA.angle · ratio − bodyB.angle
w = ratio² / IA + 1/IB
Δλ = (−C − α̃ · λ) / (w + α̃)
bodyA.angle += ratio · Δλ / IA
bodyB.angle -= Δλ / IB
```

### ContactConstraint

**What it does:** prevents bodies from overlapping. Implements the same `Constraint` interface as joints.

Persistent across frames via `contactCache` — this is important for friction stability (warm starting).

**Position solve:**
```
C = penetrationDepth   (must be ≤ 0; positive means overlap)
if C >= 0: skip (no overlap, no correction needed)

n = contact normal (pointing from B to A)
w = 1/mA + 1/mB + (cross(rA,n))²/IA + (cross(rB,n))²/IB

Δλ = (−C) / (w + α̃)
Δλ = max(0, Δλ)   ← contact only pushes, never pulls

bodyA.position += n · Δλ/mA
bodyB.position -= n · Δλ/mB
bodyA.angle    += cross(rA, n) · Δλ/IA
bodyB.angle    -= cross(rB, n) · Δλ/IB
```

**Velocity solve (after velocity derivation):**
```
v_rel = bodyA.vel + cross(bodyA.ω, rA) − bodyB.vel − cross(bodyB.ω, rB)
v_n = dot(v_rel, n)

// restitution
if v_n < -threshold:
    j_n = −(1 + e) · v_n / w
    apply j_n along normal to both bodies

// friction
v_t = v_rel − v_n · n
j_t = −|v_t| / w
j_t = clamp(j_t, −μ · j_n, μ · j_n)    ← Coulomb cone
apply j_t along tangent to both bodies
```

---

## 8. Broad Phase — Dynamic AABB Tree

The broad phase finds pairs of bodies that *might* be colliding. It uses an AABB (axis-aligned bounding box) tree.

```
DynamicTree structure (each frame):

                    [root AABB]
                   /          \
         [merged AABB]     [leaf AABB — body 5]
        /            \
[leaf — body 1]  [leaf — body 2]

Each leaf = one body's AABB (with a small fat margin)
Each internal node = union of children's AABBs
```

**Insertion:** walk the tree, at each node choose the child whose AABB would grow the least to accommodate the new leaf. Insert there and rebalance upward. O(log n) per insertion.

**Query:** start from root. If a node's AABB doesn't intersect the query AABB, prune that entire subtree. If it's a leaf, report it. O(log n) average, O(n) worst case.

**Pair detection:** for each body's AABB, query the tree for overlaps. This yields candidate pairs. Duplicates (A,B) and (B,A) are deduplicated using an ordered pair key.

**Why better than brute force O(n²)?** With 50 bodies, brute force tests 50×49/2 = 1225 pairs. The AABB tree prunes most of them, checking only nearby bodies.

---

## 9. Narrow Phase — Contact Generation

Narrow phase computes exact contact data (point, normal, depth) for pairs that passed the broad phase.

### Circle vs Circle

```cpp
Vec2 delta = circleB.center − circleA.center;
float dist = delta.length();
float overlap = circleA.radius + circleB.radius − dist;
if (overlap <= 0) return;  // no contact

Vec2 normal = delta / dist;   // unit vector A→B
Vec2 contactPoint = circleA.center + normal * circleA.radius;
float penetration = overlap;
```

### Box vs Box (SAT — Separating Axis Theorem)

For two oriented boxes, test 4 axes: the 2 face normals of box A and the 2 face normals of box B. If any axis separates the boxes, there's no collision.

```
For each axis n (4 total):
    project all 4 corners of A onto n → interval [minA, maxA]
    project all 4 corners of B onto n → interval [minB, maxB]
    overlap = min(maxA, maxB) − max(minA, minB)
    if overlap <= 0: NO COLLISION (separating axis found)
    if overlap < best_overlap:
        best_overlap = overlap
        best_normal = n

Contact: manifold with up to 2 contact points on the penetrating edge
```

Contact point clipping uses the Sutherland-Hodgman algorithm to clip one box's reference edge against the side planes of the other box's incident face.

### Circle vs Box

```
Find closest point on box to circle center:
    p = clamp(circleCenter, box.min, box.max)   ← in box's local space

delta = circleCenter − p
dist = delta.length()

if dist >= radius: no collision
if dist < epsilon (center inside box):
    use face normal as fallback

normal = delta / dist
penetration = radius − dist
contactPoint = circleCenter − normal * radius
```

### Box vs Circle

Simply calls Circle vs Box with normal flipped.

---

## 10. Collision Manager

```
CollisionManager owns:
  ├─ DynamicTree dynamicTree
  ├─ std::vector<std::pair<uint32_t,uint32_t>> ignorePairs
  └─ std::unordered_map<uint64_t, ContactConstraint> contactCache
         key = PairHash(indexA, indexB)
         where hash = (uint64_t(indexA) << 32) ^ uint64_t(indexB)
```

**Why cache contacts?** Persistent contacts enable warm starting — the accumulated `λ` from the previous frame is reused as the starting guess for this frame's solve. This dramatically improves convergence for stacking scenarios (heavy objects resting on each other).

**Contact lifecycle:**
```
Each frame:
  newPairs = broadphase query results
  for each newPair:
    if in ignorePairs: skip
    result = narrowphase(shapeA, shapeB)
    key = PairHash(A, B)
    if result.hasContact:
        if key not in contactCache:
            contactCache[key] = ContactConstraint(A, B, result)
        else:
            contactCache[key].update(result)   ← update normal/depth, keep λ
    else:
        contactCache.erase(key)                ← stale, remove

  // World calls solvePosition on all contactCache entries
```

**ignorePairs:** a list of `(bodyIndexA, bodyIndexB)` pairs that should never collide. Used for:
- Hinge-connected bodies (would constantly generate contacts at their pivot point)
- Weld-connected bodies
- Motor "orbital" bodies (synthetic invisible bodies in the serialization system)
- Bodies that are being dragged (to avoid self-collision during setup)

---

## 11. WebAssembly Bridge (Bindings.cpp)

`Bindings.cpp` uses `EMSCRIPTEN_BINDINGS` to expose a `SimulationAPI` class to JavaScript.

```cpp
#include <emscripten/bind.h>
#include "core/SimulationAPI.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(PhysicsEngine) {
    class_<SimulationAPI>("SimulationAPI")
        .constructor<>()
        .function("step",              &SimulationAPI::step)
        .function("addBox",            &SimulationAPI::addBox)
        .function("addCircle",         &SimulationAPI::addCircle)
        .function("clearScene",        &SimulationAPI::clearScene)
        .function("addHinge",          &SimulationAPI::addHinge)
        .function("addDistance",       &SimulationAPI::addDistance)
        .function("addMotor",          &SimulationAPI::addMotor)
        .function("addSlider",         &SimulationAPI::addSlider)
        .function("addWeld",           &SimulationAPI::addWeld)
        .function("addPulley",         &SimulationAPI::addPulley)
        .function("addIgnorePair",     &SimulationAPI::addIgnorePair)
        .function("setPosition",       &SimulationAPI::setPosition)
        .function("setRotation",       &SimulationAPI::setRotation)
        .function("setLinearVelocity", &SimulationAPI::setLinearVelocity)
        .function("setMotorParams",    &SimulationAPI::setMotorParams)
        .function("setBodyMaterial",   &SimulationAPI::setBodyMaterial)
        .function("getRenderData",     &SimulationAPI::getRenderData)
        .function("getEnergy",         &SimulationAPI::getEnergy);
}
```

**How JavaScript calls it:**
```javascript
// in physicsWorker.js
const module = await loadPhysicsEngine();
const sim = new module.SimulationAPI();

sim.addBox({ type: 2, x: 700, y: 400, w: 60, h: 60, density: 1.0, ... });
sim.step(1/60, 20);

const view = sim.getRenderData();  // typed_memory_view → Float32Array
```

**Memory ownership:** `SimulationAPI::getRenderData()` returns `emscripten::typed_memory_view<float>`. This is a JavaScript `Float32Array` that *aliases* WASM linear memory directly. The data lives in WASM memory, not in JavaScript's heap. Reading this array from JavaScript is a direct memory read — no data is copied.

**Emscripten value types:** Emscripten automatically converts between:
- `float` / `int` → JavaScript number
- `bool` → JavaScript boolean
- `std::string` → JavaScript string
- C++ classes with `class_<T>` binding → JavaScript objects with bound methods
- `emscripten::typed_memory_view<float>` → `Float32Array` view

---

## 12. Zero-Copy Render Protocol

This is the most performance-critical part of the engine boundary.

### The Protocol

`getRenderData()` writes body state into a pre-allocated internal `std::vector<float>` buffer and returns a typed_memory_view of it. JavaScript reads it without any copy.

**Buffer layout:**

```
Index  0: bodyCount (N)
Indices 1 to N*10:
  For each body (stride = 10 floats):
    [0]  type        (0=static, 1=kinematic, 2=dynamic)
    [1]  x           (center x in world coordinates)
    [2]  y           (center y in world coordinates)
    [3]  rotation    (angle in radians)
    [4]  w           (half-width for Box, radius for Circle)
    [5]  h           (half-height for Box, same as w for Circle)
    [6]  vx          (linear velocity x)
    [7]  vy          (linear velocity y)
    [8]  angVel      (angular velocity)
    [9]  bodyId      (uint32_t cast to float — stable React ID)

Index N*10+1: segmentCount (M)
Indices N*10+2 to N*10+2+M*4:
  For each rope/pulley segment (stride = 4 floats):
    [0]  x1, [1] y1  (start point)
    [2]  x2, [3] y2  (end point)
```

**JavaScript side (SimulationCanvas.jsx):**
```javascript
// called every animation frame
const view = api.getLatestRenderData();   // Float32Array view into WASM memory
if (!view || view.length < 1) return;

const count = view[0];
for (let i = 0; i < count; i++) {
    const base = 1 + i * 10;
    const type     = view[base + 0];
    const x        = view[base + 1];
    const y        = view[base + 2];
    const rotation = view[base + 3];
    const w        = view[base + 4];
    const h        = view[base + 5];
    const bodyId   = view[base + 9];   // used to look up body definition in Zustand
    // draw body using Canvas 2D API
}
```

**Why this is critical:** if instead you used Emscripten's `val::array()` or returned a `std::vector<float>` by value, Emscripten would serialize the entire vector into a new JavaScript array on each call. At 60fps with 50 bodies, that's 60 × 50 × 10 = 30,000 float copies per second through JavaScript's serialization layer. The `typed_memory_view` approach has zero copy overhead — it's as fast as reading a regular JavaScript typed array.

---

## 13. Emscripten Build Pipeline

```
C++ Source Files (*.cpp, *.h)
        │
        ▼
emcc (Emscripten Compiler)
  = clang + LLVM IR → WASM backend

Flags:
  -O3                      ← full optimization (crucial for physics perf)
  -s WASM=1                ← output .wasm + .js glue
  -s MODULARIZE=1          ← export as ES module factory function
  -s EXPORT_NAME='loadPhysicsEngine'
  -s ALLOW_MEMORY_GROWTH=1 ← WASM linear memory can grow (not fixed at compile time)
  -s NO_EXIT_RUNTIME=1     ← keep runtime alive (physics runs continuously)
  --bind                   ← enable Embind (required for EMSCRIPTEN_BINDINGS)
  -s SINGLE_FILE=1         ← embed .wasm as base64 in the .js file
        │
        ▼
physics_engine.js
  ├─ WASM binary embedded as base64 string
  ├─ JavaScript glue code (memory layout, type marshaling)
  └─ export: async function loadPhysicsEngine() → Module
        │
  physc-frontend/public/
  └─ physics_engine.js     ← served as a static file, loaded by physicsWorker.js
```

**Why `-s SINGLE_FILE=1`?** Without it, the WASM binary is a separate `.wasm` file that the `.js` glue loads via `fetch()`. This requires a server. With `SINGLE_FILE=1`, the binary is base64-encoded into the `.js` file itself, so the Web Worker can load it with `importScripts('/physics_engine.js')` from any origin without extra HTTP requests.

**Why `ALLOW_MEMORY_GROWTH=1`?** The number of bodies and constraints isn't known at compile time. Without this, WASM memory is fixed at 16MB (default). With it, `malloc()` inside WASM can grow the linear memory (at a performance cost on growth). For a small simulation (< 100 bodies), growth almost never happens in practice.

**Build command (in package.json):**
```bash
emcc engine/**/*.cpp -o public/physics_engine.js \
    -O3 --bind \
    -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='loadPhysicsEngine' \
    -s ALLOW_MEMORY_GROWTH=1 -s NO_EXIT_RUNTIME=1 -s SINGLE_FILE=1
```

---

## 14. Web Worker Message Bus

The WASM engine runs in `physicsWorker.js` — a dedicated Web Worker. This is critical: the physics computation runs on a separate OS thread, so a 2ms physics step doesn't cause a dropped frame on the React side.

### Worker Initialization

```javascript
// physicsWorker.js (runs in Worker thread)
importScripts('/physics_engine.js');

let sim = null;

loadPhysicsEngine().then(module => {
    sim = new module.SimulationAPI();
    postMessage({ type: 'INIT_SUCCESS' });
}).catch(err => {
    postMessage({ type: 'INIT_ERROR', error: err.message });
});
```

### Message Protocol

```
Main Thread → Worker:

STEP               { dt, substeps }         → sim.step(dt); postMessage RENDER_DATA
ADD_BOX            { x, y, w, h, ... }      → wasmId = sim.addBox(...); RESULT{wasmId}
ADD_CIRCLE         { x, y, radius, ... }    → wasmId = sim.addCircle(...); RESULT{wasmId}
CLEAR_SCENE        {}                       → sim.clearScene(); RESULT{}
ADD_HINGE_CONSTRAINT  { bodyA, bodyB, ... } → sim.addHinge(...)
ADD_DISTANCE_CONSTRAINT ...
ADD_MOTOR_CONSTRAINT  ...
ADD_SLIDER_CONSTRAINT ...
ADD_WELD_CONSTRAINT   ...
ADD_PULLEY_CONSTRAINT ...
ADD_IGNORE_PAIR    { bodyA, bodyB }         → sim.addIgnorePair(...)
SET_POSITION       { bodyId, x, y }         → sim.setPosition(...)
SET_ROTATION       { bodyId, angle }        → sim.setRotation(...)
SET_LINEAR_VELOCITY { bodyId, vx, vy }      → sim.setLinearVelocity(...)
SET_MOTOR_PARAMS   { bodyA, targetOmega, maxTorque } → sim.setMotorParams(...)
SET_BODY_MATERIAL  { bodyId, density, friction, restitution } → sim.setBodyMaterial(...)
REQUEST_RENDER_DATA {}                      → postMessage RENDER_DATA (once)

Worker → Main Thread:

INIT_SUCCESS       {}
INIT_ERROR         { error: string }
RENDER_DATA        { payload: Float32Array, energy: float }
RESULT             { id: msgId, result: any }   ← response to messages that need a return value
```

### Promise Tracking

Messages that need a return value (ADD_BOX, ADD_CIRCLE, CLEAR_SCENE) are tracked by a monotonic `id`:

```javascript
// usePhysicsWorker.js
const msgIdCounter = useRef(0);
const callbacks = useRef(new Map());

const sendMessageWithResult = (type, payload) => {
    return new Promise(resolve => {
        const id = ++msgIdCounter.current;
        callbacks.current.set(id, resolve);
        workerRef.current.postMessage({ type, payload, id });
    });
};

worker.onmessage = (e) => {
    if (e.data.type === 'RESULT') {
        const resolve = callbacks.current.get(e.data.id);
        if (resolve) {
            resolve(e.data.result);
            callbacks.current.delete(e.data.id);
        }
    }
};
```

This enables `await api.addBox(params)` — the Promise resolves when the worker sends back `RESULT` with the matching `id`.

### rebuildScene() — Full WASM World Reconstruction

When the simulation state changes structurally (body added, constraint added, body type changed, scene reset), the entire WASM world is rebuilt from the Zustand state:

```
rebuildScene()
│
├─ await CLEAR_SCENE               ← wipe all WASM bodies/constraints
│
├─ add invisible globalGround body (wasmId stored for world-anchored constraints)
│
├─ for each body in editorStore.bodies:
│       map collision layer string ('A' → 1, 'B' → 2, 'C' → 4)
│       await ADD_BOX or ADD_CIRCLE
│       idMap[reactBodyId] = wasmBodyId
│
├─ for each constraint in editorStore.constraints:
│       skip if _visualOnly flag
│       resolve bodyA/bodyB: idMap[reactId] or globalGroundId if undefined
│       send ADD_*_CONSTRAINT message (fire-and-forget, no await)
│
├─ for each pair in editorStore.ignorePairs:
│       resolve both IDs via idMap
│       send ADD_IGNORE_PAIR
│
├─ editorStore.setIdMap(idMap)     ← React state updated
│
├─ computeLocalAnchors(...)        ← recalculate body-local anchor offsets
│   and editorStore.setLocalAnchors(...)
│
└─ REQUEST_RENDER_DATA             ← get one frame immediately
```

**Why globalGround?** Some constraints (like a world-anchored hinge) have `bodyA = undefined` (anchored to the world). The WASM engine doesn't have a concept of "world" — every constraint needs two body IDs. The globalGround is a massive static box at (0,0) with collision disabled (`categoryBits = 0, maskBits = 0`) that serves as the "world" body for these constraints.
