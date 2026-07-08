import { getAllAnchors } from '../builder/builderStore';

export function simFormatToBuilderFormat(data) {
  const { machineTitle, bodies: simBodies = [], constraints: simConstraints = [] } = data;

  const builderBodies = simBodies.map(b => {
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

  const typeMap = {
    Hinge: 'hinge', Distance: 'spring', Rod: 'rod',
    Motor: 'motor', Weld: 'weld', Slider: 'slider', Pulley: 'pulley',
  };

  const builderConstraints = simConstraints
    .filter(c => !c._visualOnly && c.bodyA != null && c.bodyB != null)
    .map(c => {
      const ax1 = c.ax1 ?? c.anchorX ?? (simBodies.find(b => b.id === c.bodyA)?.x ?? 0);
      const ay1 = c.ay1 ?? c.anchorY ?? (simBodies.find(b => b.id === c.bodyA)?.y ?? 0);
      const ax2 = c.ax2 ?? c.anchorX ?? (simBodies.find(b => b.id === c.bodyB)?.x ?? 0);
      const ay2 = c.ay2 ?? c.anchorY ?? (simBodies.find(b => b.id === c.bodyB)?.y ?? 0);

      const builderType = typeMap[c.type] ?? c.visualType ?? 'spring';
      const steps = [
        { bodyId: c.bodyA, anchorKey: findAnchorKey(c.bodyA, ax1, ay1), worldPos: { x: ax1, y: ay1 } },
        { bodyId: c.bodyB, anchorKey: findAnchorKey(c.bodyB, ax2, ay2), worldPos: { x: ax2, y: ay2 } },
      ];

      const props = {};
      if (c.compliance  !== undefined) props.compliance  = c.compliance;
      if (c.distance    !== undefined) props.restLength  = c.distance;
      if (c.targetOmega !== undefined) props.targetOmega = c.targetOmega;
      if (c.maxTorque   !== undefined) props.maxTorque   = c.maxTorque;
      if (c.axisX       !== undefined) { props.axisX = c.axisX; props.axisY = c.axisY; }

      return { id: c.id, name: `${builderType} ${c.id}`, type: builderType, steps, props };
    });

  return { machineTitle: machineTitle ?? 'Imported Scene', bodies: builderBodies, constraints: builderConstraints };
}
