import { getAllAnchors } from '../builder/builderStore';

// Bodies injected by serializeToSimulator that have no builder equivalent
const SYNTHETIC_NAME = /^(World Pin |Orbital Pivot |Rotor )/;

export function simFormatToBuilderFormat(data) {
  const { machineTitle, bodies: simBodies = [], constraints: simConstraints = [] } = data;

  // IDs of synthetic bodies added during serialization (world pins, rotors, pivots)
  const syntheticIds = new Set(
    simBodies.filter(b => SYNTHETIC_NAME.test(b.name ?? '')).map(b => b.id)
  );

  const builderBodies = simBodies
    .filter(b => !syntheticIds.has(b.id))
    .map(b => {
      const isStatic = b.isStatic || b.type === 0 || b.type === 'staticAnchor';
      if (b.shape === 'Circle') {
        return {
          id: b.id, name: b.name || `Disk ${b.id}`,
          x: b.x, y: b.y, rotation: b.rotation ?? 0,
          type: isStatic ? 'staticAnchor' : 'disk',
          props: isStatic ? {} : {
            radius:            b.radius ?? 30,
            density:           b.density ?? 0.005,
            friction:          b.friction ?? 0.5,
            restitution:       b.restitution ?? 0.3,
            collisionCategory: b.collisionCategory ?? 'A',
            collisionMask:     b.collisionMask ?? 'A',
          },
        };
      }
      const small = (b.w ?? 999) <= 30 && (b.h ?? 999) <= 30;
      if (isStatic && small) {
        return {
          id: b.id, name: b.name || `Anchor ${b.id}`,
          x: b.x, y: b.y, rotation: b.rotation ?? 0,
          type: 'staticAnchor', props: {},
        };
      }
      return {
        id: b.id, name: b.name || `Block ${b.id}`,
        x: b.x, y: b.y, rotation: b.rotation ?? 0,
        type: isStatic ? 'staticAnchor' : 'block',
        props: isStatic ? {} : {
          width:             b.w ?? 80,
          height:            b.h ?? 40,
          density:           b.density ?? 0.005,
          friction:          b.friction ?? 0.5,
          restitution:       b.restitution ?? 0.3,
          collisionCategory: b.collisionCategory ?? 'A',
          collisionMask:     b.collisionMask ?? 'A',
        },
      };
    });

  const findAnchorKey = (bodyId, wx, wy) => {
    const body = builderBodies.find(b => b.id === bodyId);
    if (!body) return 'center';
    const anchors = getAllAnchors(body);
    if (!anchors.length) return 'center';
    let best = 'center', bestDist = Infinity;
    for (const a of anchors) {
      const d = Math.hypot(wx - a.world.x, wy - a.world.y);
      if (d < bestDist) { bestDist = d; best = a.anchorKey; }
    }
    return best;
  };

  // Prefer visualType so rod/slider/etc. survive the Distance/Hinge type map
  const typeMap = {
    Hinge: 'hinge', Distance: 'spring',
    Motor: 'motor', Weld: 'weld', Slider: 'slider', Pulley: 'pulley',
  };

  const builderConstraints = simConstraints
    .filter(c =>
      c.bodyA != null &&
      c.bodyB != null &&
      c.visualType !== 'hidden_hinge' &&
      // _visspring_ are purely synthetic orbital visual helpers — exclude only those.
      // All other _visualOnly constraints (rods marked visual-only by the orbital
      // motor system) are real user constraints and must be restored in the builder.
      !String(c.id).includes('_visspring_')
    )
    .map(c => {
      const ax1 = c.ax1 ?? c.anchorX ?? (simBodies.find(b => b.id === c.bodyA)?.x ?? 0);
      const ay1 = c.ay1 ?? c.anchorY ?? (simBodies.find(b => b.id === c.bodyA)?.y ?? 0);
      const ax2 = c.ax2 ?? c.anchorX ?? (simBodies.find(b => b.id === c.bodyB)?.x ?? 0);
      const ay2 = c.ay2 ?? c.anchorY ?? (simBodies.find(b => b.id === c.bodyB)?.y ?? 0);

      // visualType reliably encodes the builder type; fall back to the sim type map
      const builderType = (c.visualType && c.visualType !== 'hidden_hinge')
        ? c.visualType
        : (typeMap[c.type] ?? 'spring');

      let steps;

      if (builderType === 'slider') {
        // Sim format: bodyA = sliding body, bodyB = rail-start anchor or synthetic world pin
        // ax1/ay1 = slider body pos, ax2/ay2 = rail-start pos, axisX/Y = axis direction
        // Builder needs 3 steps: [rail start, rail end, sliding body]
        const isSyntheticRail = syntheticIds.has(c.bodyB);
        const railBodyId  = isSyntheticRail ? null : c.bodyB;
        const railEndX    = ax2 + (c.axisX ?? 0);
        const railEndY    = ay2 + (c.axisY ?? 0);
        steps = [
          { bodyId: railBodyId, anchorKey: railBodyId ? findAnchorKey(railBodyId, ax2, ay2) : 'center', worldPos: { x: ax2,     y: ay2     } },
          { bodyId: null,       anchorKey: 'center',                                                     worldPos: { x: railEndX, y: railEndY } },
          { bodyId: c.bodyA,    anchorKey: findAnchorKey(c.bodyA, ax1, ay1),                             worldPos: { x: ax1,     y: ay1     } },
        ];
      } else {
        steps = [
          { bodyId: c.bodyA, anchorKey: findAnchorKey(c.bodyA, ax1, ay1), worldPos: { x: ax1, y: ay1 } },
          { bodyId: c.bodyB, anchorKey: findAnchorKey(c.bodyB, ax2, ay2), worldPos: { x: ax2, y: ay2 } },
        ];
      }

      const props = {};
      if (c.compliance       !== undefined) props.compliance       = c.compliance;
      if (c.targetOmega      !== undefined) props.targetOmega      = c.targetOmega;
      if (c.maxTorque        !== undefined) props.maxTorque        = c.maxTorque;
      if (c.axisX            !== undefined) { props.axisX = c.axisX; props.axisY = c.axisY; }
      if (c.minLimit         !== undefined) props.minLimit         = c.minLimit;
      if (c.maxLimit         !== undefined) props.maxLimit         = c.maxLimit;
      if (c.limitRestitution !== undefined) props.limitRestitution = c.limitRestitution;
      // rod uses 'length'; spring uses 'restLength'
      if (c.distance !== undefined) {
        if (builderType === 'rod') props.length = c.distance;
        else props.restLength = c.distance;
      }

      return { id: c.id, name: `${builderType} ${c.id}`, type: builderType, steps, props };
    });

  return { machineTitle: machineTitle ?? 'Imported Scene', bodies: builderBodies, constraints: builderConstraints };
}
