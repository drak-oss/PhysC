export const BODY_COMPONENTS = {
  disk: {
    id: 'disk',
    category: 'body',
    label: 'Disk',
    description: 'Circular rigid body',
    details: 'A Disk is a circular rigid body that rolls, spins, and bounces realistically. Its moment of inertia scales with radius squared, so larger disks are proportionally harder to spin up or slow down. Ideal for wheels, balls, cams, and any mechanism that needs natural rotational dynamics. Mass is computed automatically from radius squared times density — increase density for a heavier disk without changing its size.',
    isStatic: false,
    defaultProps: {
      radius: 40,
      density: 0.005,
      friction: 0.5,
      restitution: 0.3,
      isStatic: false,
      collisionCategory: 'A',
      collisionMask: 'A',
    },
    getAnchors: (obj) => [
      { key: 'center', label: 'Center', local: { x: 0, y: 0 } },
      { key: 'top',    label: 'Top',    local: { x: 0, y: -obj.radius } },
      { key: 'bottom', label: 'Bottom', local: { x: 0, y:  obj.radius } },
      { key: 'left',   label: 'Left',   local: { x: -obj.radius, y: 0 } },
      { key: 'right',  label: 'Right',  local: { x:  obj.radius, y: 0 } },
    ],
    properties: [
      { key: 'radius',      label: 'Radius',      type: 'number', min: 5,    max: 300, step: 1,    unit: 'px' },
      { key: 'density',     label: 'Density',     type: 'number', min: 0.001, max: 10,  step: 0.001 },
      { key: 'friction',    label: 'Friction',    type: 'slider', min: 0,    max: 1,   step: 0.05 },
      { key: 'restitution', label: 'Restitution', type: 'slider', min: 0,    max: 1,   step: 0.05 },
    ],
  },

  block: {
    id: 'block',
    category: 'body',
    label: 'Block',
    description: 'Rectangular rigid body',
    details: 'A Block is a rectangular rigid body with four hard corners that slides, tilts, and collides realistically. It responds to all forces and torques, tipping over under off-center impacts. Adjust Width and Height to control its footprint; Density scales mass per unit area. Friction governs how much it grips other surfaces, and Restitution controls how elastically it bounces on collision.',
    isStatic: false,
    defaultProps: {
      width: 80,
      height: 40,
      density: 0.005,
      friction: 0.5,
      restitution: 0.3,
      isStatic: false,
      collisionCategory: 'A',
      collisionMask: 'A',
    },
    getAnchors: (obj) => {
      const hw = obj.width  / 2;
      const hh = obj.height / 2;
      return [
        { key: 'center',       label: 'Center',     local: { x: 0,   y: 0   } },
        { key: 'top-left',     label: 'Top-Left',   local: { x: -hw, y: -hh } },
        { key: 'top-right',    label: 'Top-Right',  local: { x:  hw, y: -hh } },
        { key: 'bottom-left',  label: 'Bot-Left',   local: { x: -hw, y:  hh } },
        { key: 'bottom-right', label: 'Bot-Right',  local: { x:  hw, y:  hh } },
        { key: 'top',          label: 'Top',        local: { x: 0,   y: -hh } },
        { key: 'bottom',       label: 'Bottom',     local: { x: 0,   y:  hh } },
        { key: 'left',         label: 'Left',       local: { x: -hw, y: 0   } },
        { key: 'right',        label: 'Right',      local: { x:  hw, y: 0   } },
      ];
    },
    properties: [
      { key: 'width',       label: 'Width',       type: 'number', min: 4,    max: 800, step: 1,    unit: 'px' },
      { key: 'height',      label: 'Height',      type: 'number', min: 4,    max: 800, step: 1,    unit: 'px' },
      { key: 'density',     label: 'Density',     type: 'number', min: 0.001, max: 10,  step: 0.001 },
      { key: 'friction',    label: 'Friction',    type: 'slider', min: 0,    max: 1,   step: 0.05 },
      { key: 'restitution', label: 'Restitution', type: 'slider', min: 0,    max: 1,   step: 0.05 },
    ],
  },

  staticAnchor: {
    id: 'staticAnchor',
    category: 'body',
    label: 'Static Pin',
    description: 'Fixed point in space',
    details: 'A Static Pin is a fixed anchor embedded into the world with infinite effective mass. No force — gravity, collision, spring, or motor torque — can move it. It serves as the unmovable hub for rods, springs, hinges, and motor pivots. When a Motor is placed on a Static Pin that is connected to a body via a rod or spring, the connected body will orbit the pin as a fixed axis rather than the pin spinning itself.',
    isStatic: true,
    defaultProps: {
      isStatic: true,
      collisionCategory: 'None',
      collisionMask: 'None',
    },
    getAnchors: (obj) => [
      { key: 'center', label: 'Center', local: { x: 0, y: 0 } },
    ],
    properties: [],
  },

  dynamicAnchor: {
    id: 'dynamicAnchor',
    category: 'body',
    label: 'Dynamic Pin',
    description: 'Falling anchor point',
    details: 'A Dynamic Pin is a small point-mass node that participates fully in the physics simulation. It falls under gravity, bounces off surfaces, and responds to all constraints just like any other dynamic body. Because it has no visible shape and minimal inertia, it acts as a lightweight mobile connection point — handy when you need an intermediate constraint node that itself moves freely through the scene.',
    isStatic: false,
    defaultProps: {
      density: 0.005,
      friction: 0.5,
      restitution: 0.3,
      isStatic: false,
      collisionGroup: 2,
      collisionMask: 1,
    },
    getAnchors: (obj) => [
      { key: 'center', label: 'Center', local: { x: 0, y: 0 } },
    ],
    properties: [
      { key: 'density', label: 'Density', type: 'number', min: 0.001, max: 10, step: 0.001 },
    ],
  },
};

export const CONSTRAINT_COMPONENTS = {
  spring: {
    id: 'spring',
    category: 'constraint',
    label: 'Spring',
    description: 'A Spring creates an elastic connection between two anchor points. Unlike a rigid rod, it stretches and compresses — applying a restoring force proportional to how far it deviates from its rest length. Stiffness controls how hard the spring fights displacement; Damping bleeds energy out of each oscillation so the system settles rather than bouncing forever. If Rest Length is left blank, the spring adopts the current distance at placement as its natural length.',
    maxAnchors: 2,
    steps: [
      { label: 'Select Body A anchor', allowFreeSpace: false, note: 'Click an anchor point to attach the first end of the spring.' },
      { label: 'Select Body B anchor', allowFreeSpace: false, requireDifferentBody: true, note: 'Click an anchor on a different body to attach the other end.' }
    ],
    defaultProps: { stiffness: 500, damping: 10, restLength: null, compliance: 0.002 },
    properties: [
      { key: 'stiffness',  label: 'Stiffness',   type: 'number', min: 0, max: 50000, step: 100, description: 'Spring force per unit of stretch. Higher = stiffer spring.' },
      { key: 'damping',    label: 'Damping',     type: 'number', min: 0, max: 1000,  step: 1,   description: 'Energy dissipation per step. Higher = spring settles faster.' },
      { key: 'restLength', label: 'Rest Length', type: 'number', min: 0, max: 2000,  step: 1, unit: 'px', nullable: true, description: 'Natural length when no force is applied. Defaults to current distance between bodies.' },
      { key: 'compliance', label: 'Compliance',  type: 'number', min: 0, max: 0.1,   step: 0.0001, description: '0 = perfectly rigid. Higher values make the constraint softer and stretchier.' },
    ],
  },

  rod: {
    id: 'rod',
    category: 'constraint',
    label: 'Rod',
    description: 'A Rod is a rigid distance constraint that locks two anchor points to a fixed separation. It transmits both tension and compression instantly, acting like an inextensible link with no give. Compliance can be raised slightly to allow a barely-perceptible flex under high load. If only one body anchor is selected, the far end is pinned to a fixed world point — effectively nailing that spot in space.',
    maxAnchors: 2,
    minSteps: 1,
    steps: [
      { label: 'Select Body A anchor', allowFreeSpace: false, note: 'Click an anchor to attach.' },
      { label: 'Select Body B anchor', allowFreeSpace: false, requireDifferentBody: true, note: 'Click an anchor on a different body.' }
    ],
    defaultProps: { length: null, compliance: 0.0 },
    properties: [
      { key: 'length',     label: 'Length',     type: 'number', min: 0, max: 2000, step: 1, unit: 'px', nullable: true, description: 'Fixed distance between the two anchor points. Defaults to current distance between bodies.' },
      { key: 'compliance', label: 'Compliance', type: 'number', min: 0, max: 0.1,  step: 0.0001, description: '0 = perfectly rigid rod. Higher values allow slight stretch under load.' },
    ],
  },

  motor: {
    id: 'motor',
    category: 'constraint',
    label: 'Motor',
    description: 'A Motor drives continuous rotation around a pivot. When placed on a Static Pin that is connected to a body via a rod or spring, the connected body orbits the pin as a fixed axis — the pin stays still while the body sweeps circles around it. Target Speed sets the desired angular velocity in radians per second; negative values spin clockwise. Max Torque caps how much rotational force is applied each simulation tick; set it to -1 for unlimited torque.',
    maxAnchors: 1,
    minSteps: 1,
    steps: [
      { label: 'Select pivot anchor', allowFreeSpace: false, note: 'Click an anchor on the body that acts as the pivot. Connected bodies will orbit around it.' },
    ],
    defaultProps: { targetOmega: -2.0, maxTorque: -1.0 },
    properties: [
      { key: 'targetOmega', label: 'Target Speed', type: 'number', min: -50, max: 50, step: 0.1, unit: 'rad/s', description: 'Angular velocity the motor drives toward. Negative = clockwise.' },
      { key: 'maxTorque',   label: 'Max Torque',   type: 'number', min: -1000, max: 1000, step: 1, description: 'Maximum rotational force applied. -1 = unlimited.' },
    ],
  },

  weld: {
    id: 'weld',
    category: 'constraint',
    label: 'Weld',
    description: 'A Weld rigidly fuses two bodies together, locking both their relative position and their relative angle at the moment of placement. The welded pair behaves as one combined rigid object under all physics forces. Unlike a hinge, there is zero rotational freedom between the bodies — it is a permanent rigid bond. Use welds to assemble multi-piece composite shapes from simpler primitives.',
    maxAnchors: 2,
    steps: [
      { label: 'Select Body A anchor', allowFreeSpace: false, note: 'Click an anchor to attach the first end of the weld.' },
      { label: 'Select Body B anchor', allowFreeSpace: false, requireDifferentBody: true, note: 'Click an anchor on a different body to weld them.' }
    ],
    defaultProps: { compliance: 0.0 },
    properties: [
      { key: 'compliance', label: 'Compliance', type: 'number', min: 0, max: 0.1, step: 0.0001 },
    ],
  },

  slider: {
    id: 'slider',
    category: 'constraint',
    label: 'Slider',
    description: 'A Slider (prismatic joint) constrains a body to translate along a defined axis while preventing all other motion. First click two points to define the rail direction, then click the body that should slide — it snaps onto the rail automatically. Min Limit and Max Limit are auto-computed from the rail length (leave null to keep defaults). Restitution controls how elastically the body bounces off the end-stops: 0 = dead stop, 1 = fully elastic.',
    maxAnchors: 3,
    steps: [
      { label: 'Select rail start', allowFreeSpace: true, note: 'Click an anchor or free space for the start of the rail.' },
      { label: 'Select rail end', allowFreeSpace: true, note: 'Click an anchor or free space for the end of the rail.' },
      { label: 'Select sliding body', allowFreeSpace: false, note: 'Click an anchor on the body that will slide — it snaps onto the rail.' }
    ],
    defaultProps: { minLimit: null, maxLimit: null, limitRestitution: 0.8 },
    properties: [
      { key: 'minLimit',         label: 'Min Limit',   type: 'number', min: -2000, max: 0, step: 1,    unit: 'px',  nullable: true, description: 'Leftmost travel limit (negative = left of rail start). Auto-computed from rail length when null.' },
      { key: 'maxLimit',         label: 'Max Limit',   type: 'number', min: 0,  max: 2000, step: 1,    unit: 'px',  nullable: true, description: 'Rightmost travel limit. 0 = slider cannot go left of rail start. Auto-computed when null.' },
      { key: 'limitRestitution', label: 'Restitution', type: 'slider', min: 0,  max: 1,    step: 0.05,              description: 'Bounciness at end-stops. 0 = dead stop, 1 = fully elastic.' },
    ],
  },

  pulley: {
    id: 'pulley',
    category: 'constraint',
    label: 'Pulley',
    description: 'A Pulley connects two loads through an overhead fixed wheel, conserving the total rope length shared between them. As one load descends, the other rises by a corresponding amount. The Ratio parameter sets mechanical advantage — a ratio of 2 means one load moves twice as fast as the other. The pulley wheel point must be a static anchor or free space.',
    maxAnchors: 3,
    steps: [
      { label: 'Select Pulley point', allowFreeSpace: true, bodyTypes: ['staticAnchor'], note: 'Click free space or a static anchor for the overhead pulley wheel.' },
      { label: 'Select Load A anchor', allowFreeSpace: false, note: 'Click an anchor for the first load.' },
      { label: 'Select Load B anchor', allowFreeSpace: false, requireDifferentBody: true, note: 'Click an anchor for the second load.' }
    ],
    defaultProps: { ratio: 1.0 },
    properties: [
      { key: 'ratio', label: 'Pulley Ratio', type: 'number', min: 0.1, max: 10, step: 0.1 },
    ],
  },
};

export const ALL_COMPONENTS    = { ...BODY_COMPONENTS, ...CONSTRAINT_COMPONENTS };
export const BODY_TYPES        = Object.values(BODY_COMPONENTS);
export const CONSTRAINT_TYPES  = Object.values(CONSTRAINT_COMPONENTS);

export function getComponentDef(typeId) { return ALL_COMPONENTS[typeId] ?? null; }
export function getBodyDef(typeId)      { return BODY_COMPONENTS[typeId] ?? null; }
export function getConstraintDef(typeId){ return CONSTRAINT_COMPONENTS[typeId] ?? null; }

export function validateConstraintStep(stepDef, body, anchorKey, previousSteps) {
  if (!stepDef) return { valid: false, reason: 'Invalid step.' };
  
  if (!body) {
    if (!stepDef.allowFreeSpace) return { valid: false, reason: 'Must select an anchor point on a body.' };
    return { valid: true, reason: null };
  }

  if (stepDef.bodyTypes && !stepDef.bodyTypes.includes(body.type)) {
    return { valid: false, reason: `Must select a body of type: ${stepDef.bodyTypes.join(', ')}` };
  }

  if (stepDef.anchorKey && anchorKey !== stepDef.anchorKey) {
    return { valid: false, reason: `Must select the ${stepDef.anchorKey} anchor.` };
  }

  if (stepDef.requireDifferentBody) {
    const prevBodyIds = previousSteps.map(s => s.bodyId).filter(id => id !== undefined);
    if (prevBodyIds.includes(body.id)) {
      return { valid: false, reason: 'Must select an anchor on a different body.' };
    }
  }

  return { valid: true, reason: null };
}
