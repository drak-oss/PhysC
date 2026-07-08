import { CONSTRAINT_COMPONENTS } from './componentRegistry';

let _extraIdCounter = 9000;  
const nextExtraId = () => ++_extraIdCounter;



function serializeBody(b) {
  const p = b.props ?? {};
  const base = {
    id:              b.id,
    name:            b.name,
    x:               b.x,
    y:               b.y,
    rotation:        b.rotation ?? 0,
    vx:              0,
    vy:              0,
    angularVelocity: 0,
  };

  switch (b.type) {
    case 'disk':
      return {
        ...base,
        shape:             'Circle',
        isStatic:          p.isStatic ?? false,
        radius:            Math.max(4, p.radius ?? 40),
        density:           p.density ?? 0.005,
        friction:          p.friction ?? 0.5,
        restitution:       p.restitution ?? 0.3,
        collisionCategory: p.collisionCategory ?? 'A',
        collisionMask:     p.collisionMask ?? 'A',
      };

    case 'block':
      return {
        ...base,
        shape:             'Box',
        isStatic:          p.isStatic ?? false,
        w:                 Math.max(4, p.width ?? 80),
        h:                 Math.max(4, p.height ?? 40),
        density:           p.density ?? 0.005,
        friction:          p.friction ?? 0.5,
        restitution:       p.restitution ?? 0.3,
        collisionCategory: p.collisionCategory ?? 'A',
        collisionMask:     p.collisionMask ?? 'A',
      };

    case 'staticAnchor':
      return {
        ...base,
        shape:        'Box',
        type:         0,   
        isStatic:     true,
        w:            16,
        h:            16,
        density:      1,
        friction:     0.2,
        restitution:  0.0,
        categoryBits: 0,
        maskBits:     0,
      };

    case 'dynamicAnchor':
      return {
        ...base,
        shape:        'Box',
        type:         2,   
        isStatic:     false,
        w:            16,
        h:            16,
        density:      p.density     ?? 0.005,
        friction:     p.friction    ?? 0.5,
        restitution:  p.restitution ?? 0.3,
        categoryBits: p.collisionGroup ?? 2,
        maskBits:     p.collisionMask  ?? 1,
      };

    default:
      return null;
  }
}



function stepWorld(c, idx) {
  const steps = c.steps ?? [];
  if (idx < 0 || idx >= steps.length) return { x: 0, y: 0 };
  return steps[idx]?.worldPos ?? { x: 0, y: 0 };
}

function dist2(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}



function serializeConstraint(c, bodies) {
  const p = c.props ?? {};

  
  const steps = c.steps ?? [];
  const bodyAId = steps[0]?.bodyId ?? c.bodyAId;
  const bodyBId = steps[1]?.bodyId ?? c.bodyBId;
  const wA = stepWorld(c, 0);
  const wB = steps.length > 1 ? stepWorld(c, 1) : wA;
  const wC = stepWorld(c, 2); 

  switch (c.type) {

    case 'weld': {
      const mx = (wA.x + wB.x) / 2;
      const my = (wA.y + wB.y) / 2;
      return {
        id:         c.id,
        visualType: c.type,
        type:       'Weld',
        bodyA:      bodyAId,
        bodyB:      bodyBId,
        anchorX:    mx,
        anchorY:    my,
        compliance: p.compliance ?? 0.0,
      };
    }

    case 'hinge': {
      
      
      if (!bodyBId) {
        
        return {
          id:         c.id,
          visualType: c.type,
          type:       'Hinge',
          bodyA:      bodyAId,
          bodyB:      null,
          _singleStepWorldPin: true,
          _anchorX:   wA.x,
          _anchorY:   wA.y,
          ax1:        wA.x,
          ay1:        wA.y,
          ax2:        wA.x,
          ay2:        wA.y,
          compliance: p.compliance ?? 0.0,
        };
      }
      return {
        id:         c.id,
        visualType: c.type,
        type:       'Hinge',
        bodyA:      bodyAId,
        bodyB:      bodyBId,
        ax1:        wA.x,
        ay1:        wA.y,
        ax2:        wB.x,
        ay2:        wB.y,
        compliance: p.compliance ?? 0.0,
      };
    }

    case 'spring': {
      const d = dist2(wA, wB);
      return {
        id:         c.id,
        visualType: c.type,
        type:       'Distance',
        bodyA:      bodyAId,
        bodyB:      bodyBId,
        ax1:        wA.x, ay1: wA.y,
        ax2:        wB.x, ay2: wB.y,
        distance:   p.restLength ?? d,
        compliance: p.compliance ?? 0.002,
      };
    }

    case 'rod': {
      if (!bodyBId) {
      
      
        return {
          id:          c.id,
          visualType:  c.type,
          type:        'Distance',
          bodyA:       bodyAId,
          bodyB:       null,   
          _singleStepWorldPin: true,
          ax1:         wA.x, ay1: wA.y,
          ax2:         wA.x, ay2: wA.y,
          distance:    p.length ?? 0,
          compliance:  p.compliance ?? 0.0,
          _anchorX:    wA.x,
          _anchorY:    wA.y,
        };
      }
      const d = dist2(wA, wB);
      return {
        id:         c.id,
        visualType: c.type,
        type:       'Distance',
        bodyA:      bodyAId,
        bodyB:      bodyBId,
        ax1:        wA.x, ay1: wA.y,
        ax2:        wB.x, ay2: wB.y,
        distance:   p.length ?? d,
        compliance: p.compliance ?? 0.0,
      };
    }

    case 'motor': {
      if (!bodyBId) {
        
        
        
        return [
        {
          id:          c.id + '_hinge',
          visualType:  'hidden_hinge',
          type:        'Hinge',
          bodyA:       bodyAId,
          bodyB:       null,
          _singleStepWorldPin: true,
          _sharedWorldPin: true,
          _anchorX:    wB.x,
          _anchorY:    wB.y,
          ax1:         wA.x,
          ay1:         wA.y,
          ax2:         wB.x,
          ay2:         wB.y,
          compliance:  0.0,
        },
        {
          id:          c.id,
          visualType:  c.type,
          type:        'Motor',
          bodyA:       bodyAId,
          bodyB:       null,
          _singleStepWorldPin: true,
          _sharedWorldPin: true,
          _anchorX:    wB.x,
          _anchorY:    wB.y,
          targetOmega: p.targetOmega ?? -2.0,
          maxTorque:   p.maxTorque   ?? -1.0,
          _makesBodyDynamic: true,
        }
        ];
      }
      return [
        {
          id:          c.id + '_hinge',
          visualType:  'hidden_hinge',
          type:        'Hinge',
          bodyA:       bodyAId,
          bodyB:       bodyBId,
          ax1:         wA.x,
          ay1:         wA.y,
          ax2:         wB.x,
          ay2:         wB.y,
          compliance:  0.0,
        },
        {
          id:          c.id,
          visualType:  c.type,
          type:        'Motor',
          bodyA:       bodyAId,
          bodyB:       bodyBId,
          ax1:         wA.x,
          ay1:         wA.y,
          ax2:         wB.x,
          ay2:         wB.y,
          targetOmega: p.targetOmega ?? -2.0,
          maxTorque:   p.maxTorque   ?? -1.0,
          _makesBodyDynamic: true,
        }
      ];
    }

    case 'slider': {
      
      const sliderBodyId = steps[2]?.bodyId;
      const anchorAId    = steps[0]?.bodyId;
      const axisX = wB.x - wA.x;
      const axisY = wB.y - wA.y;
      const axLen = Math.hypot(axisX, axisY);
      
      const minLimit = (p.minLimit !== null && p.minLimit !== undefined) ? p.minLimit : -Math.round(axLen);
      const maxLimit = (p.maxLimit !== null && p.maxLimit !== undefined) ? p.maxLimit : 0;
      const limitRestitution = p.limitRestitution ?? 0.8;

      if (!anchorAId) {
        return {
          id: c.id, visualType: c.type, type: 'Slider',
          bodyA: sliderBodyId, bodyB: null,
          _singleStepWorldPin: true,
          _anchorX: wA.x, _anchorY: wA.y,
          axisX, axisY,
          ax1: wC.x, ay1: wC.y,
          ax2: wA.x, ay2: wA.y,
          minLimit, maxLimit, limitRestitution,
        };
      }
      return {
        id: c.id, visualType: c.type, type: 'Slider',
        bodyA: sliderBodyId, bodyB: anchorAId,
        axisX, axisY,
        ax1: wC.x, ay1: wC.y,
        ax2: wA.x, ay2: wA.y,
        minLimit, maxLimit, limitRestitution,
      };
    }

    case 'pulley': {
      const pulleyBodyId = steps[0]?.bodyId;
      const bodyAId2     = steps[1]?.bodyId;
      const bodyBId2     = steps[2]?.bodyId;
      return {
        id:           c.id,
        visualType:   c.type,
        type:         'Pulley',
        pulleyBody:   pulleyBodyId ?? null,
        bodyA:        bodyAId2,
        bodyB:        bodyBId2,
        gxA:          wA.x, gyA: wA.y,
        gxB:          wA.x, gyB: wA.y,
        localAx:      wB.x, localAy: wB.y,
        localBx:      wC.x, localBy: wC.y,
        ratio:        p.ratio ?? 1.0,
        compliance:   p.compliance ?? 0.0,
      };
    }

    default:
      return null;
  }
}




export function serializeToSimulator({ bodies, constraints }) {
  _extraIdCounter = 9000;
  const errors = [];
  const ignorePairs = [];

  
  const simBodies = [];
  for (const b of bodies) {
    const serialized = serializeBody(b);
    if (!serialized) {
      errors.push(`Cannot serialize body "${b.name}" (type: ${b.type})`);
    } else {
      simBodies.push(serialized);
    }
  }
  if (simBodies.length !== bodies.length) {
    errors.push(`Body count mismatch: ${bodies.length} in builder, ${simBodies.length} serialized`);
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const orbitalEntries   = [];
  const orbitalMotorIds  = new Set(); 
  const orbitalAnchorIds = new Set(); 
  const orbitalExcludeIds = new Set(); 

  for (const c of constraints) {
    if (c.type !== 'motor') continue;
    const cSteps = c.steps ?? [];
    if (cSteps.length < 1) continue;

    const bodyAId      = cSteps[0].bodyId;
    const builderBodyA = bodies.find(b => b.id === bodyAId);
    if (!builderBodyA) continue;

    const p           = c.props ?? {};
    const targetOmega = p.targetOmega ?? -2.0;
    const maxTorque   = p.maxTorque   ?? -1.0;

    
    
    const addEntry = (pivotX, pivotY, dynId, anchorConstraintId,
                      springRestLength = null, springCompliance = null, makeVisualOnly = true) => {
      const isSpring = springRestLength !== null;
      orbitalEntries.push({ pivotX, pivotY, dynId, motorConstraintId: c.id, anchorConstraintId,
                            targetOmega, maxTorque, springRestLength, springCompliance, isSpring });
      if (isSpring && anchorConstraintId != null) {
        
        orbitalExcludeIds.add(anchorConstraintId);
      } else if (!isSpring && makeVisualOnly && anchorConstraintId != null) {
        
        orbitalAnchorIds.add(anchorConstraintId);
      }
      orbitalMotorIds.add(c.id);
    };

    if (builderBodyA.type === 'staticAnchor') {
      
      const pivotX = builderBodyA.x, pivotY = builderBodyA.y;
      const connectedDynIds = new Set();
      for (const dc of constraints) {
        if (dc.type !== 'rod' && dc.type !== 'spring' && dc.type !== 'weld') continue;
        const dcSteps = dc.steps ?? [];
        if (dcSteps.length < 2) continue;
        const dcA = dcSteps[0].bodyId, dcB = dcSteps[1].bodyId;
        const isAnchorFirst = dcA === bodyAId;
        const dynId = isAnchorFirst ? dcB : dcB === bodyAId ? dcA : null;
        if (dynId === null) continue;
        const dynBuilder = bodies.find(b => b.id === dynId);
        if (!dynBuilder || dynBuilder.type === 'staticAnchor') continue;
        const dynStep = isAnchorFirst ? dcSteps[1] : dcSteps[0];
        const isCenterArm = dynStep.anchorKey === 'center';
        const sRL = dc.type === 'spring'
          ? (dc.props?.restLength ?? Math.hypot(
              (dcSteps[1].worldPos?.x ?? 0) - (dcSteps[0].worldPos?.x ?? 0),
              (dcSteps[1].worldPos?.y ?? 0) - (dcSteps[0].worldPos?.y ?? 0)))
          : null;
        const sCL = dc.type === 'spring' ? (dc.props?.compliance ?? 0.002) : null;
        addEntry(pivotX, pivotY, dynId, dc.id, sRL, sCL, isCenterArm);
        connectedDynIds.add(dynId);
      }
      
      for (const otherBody of bodies) {
        if (otherBody.id === bodyAId) continue;
        if (otherBody.type === 'staticAnchor') continue;
        if (connectedDynIds.has(otherBody.id)) continue;
        if (Math.abs(otherBody.x - pivotX) < 1 && Math.abs(otherBody.y - pivotY) < 1) {
          addEntry(pivotX, pivotY, otherBody.id, null, null, null, false);
        }
      }
    } else {
      
      for (const dc of constraints) {
        if (dc.type !== 'rod' && dc.type !== 'spring' && dc.type !== 'weld') continue;
        const dcSteps = dc.steps ?? [];
        if (dcSteps.length < 2) continue;
        const dcA = dcSteps[0].bodyId, dcB = dcSteps[1].bodyId;
        const isMotorFirst = dcA === bodyAId;
        const otherId = isMotorFirst ? dcB : dcB === bodyAId ? dcA : null;
        if (otherId === null) continue;
        const otherBuilder = bodies.find(b => b.id === otherId);
        if (!otherBuilder || otherBuilder.type !== 'staticAnchor') continue;
        const motorStep = isMotorFirst ? dcSteps[0] : dcSteps[1];
        const isCenterArm = motorStep.anchorKey === 'center';
        const sRL = dc.type === 'spring'
          ? (dc.props?.restLength ?? Math.hypot(
              (dcSteps[1].worldPos?.x ?? 0) - (dcSteps[0].worldPos?.x ?? 0),
              (dcSteps[1].worldPos?.y ?? 0) - (dcSteps[0].worldPos?.y ?? 0)))
          : null;
        const sCL = dc.type === 'spring' ? (dc.props?.compliance ?? 0.002) : null;
        addEntry(otherBuilder.x, otherBuilder.y, bodyAId, dc.id, sRL, sCL, isCenterArm);
        break; 
      }
    }
  }

  
  
  

  
  const simConstraints = [];
  const sharedStaticPins = {};

  for (const c of constraints) {
    
    if (orbitalMotorIds.has(c.id)) continue;

    const steps    = c.steps ?? [];
    const cDef     = CONSTRAINT_COMPONENTS[c.type];
    const minSteps = cDef?.minSteps ?? cDef?.steps?.length ?? 2;

    if (steps.length < minSteps) {
      errors.push(`Constraint "${c.type}" is incomplete (${steps.length}/${minSteps} steps)`);
      continue;
    }

    const serializedResult = serializeConstraint(c, bodies);
    if (!serializedResult) {
      errors.push(`Cannot serialize constraint of type "${c.type}"`);
      continue;
    }

    const serializedArray = Array.isArray(serializedResult) ? serializedResult : [serializedResult];

    for (const serialized of serializedArray) {
      if (serialized._singleStepWorldPin) {
        let staticId;
        if (serialized._sharedWorldPin && sharedStaticPins[c.id]) {
          staticId = sharedStaticPins[c.id];
        } else {
          staticId = nextExtraId();
          if (serialized._sharedWorldPin) sharedStaticPins[c.id] = staticId;
          simBodies.push({
            id:              staticId,
            name:            `World Pin ${serialized.id}`,
            shape:           'Box',
            type:            0,
            isStatic:        true,
            x:               serialized._anchorX,
            y:               serialized._anchorY,
            w:               8, h: 8,
            rotation:        0, vx: 0, vy: 0, angularVelocity: 0,
            density:         1, friction: 0, restitution: 0,
            categoryBits:    0, maskBits: 0,
          });
        }

        simConstraints.push({
          ...serialized,
          bodyB:               staticId,
          _singleStepWorldPin: undefined,
          _sharedWorldPin:     undefined,
          _anchorX:            undefined,
          _anchorY:            undefined,
        });

        const b1 = bodies.find(b => b.id === serialized.bodyA);
        if (b1) {
          if (serialized._makesBodyDynamic) {
            const simBody = simBodies.find(b => b.id === b1.id);
            
            
            if (simBody && !simBody.isStatic) simBody.type = 2;
          }
          ignorePairs.push([b1.id, staticId]);
        }
      } else {
        
        if (orbitalExcludeIds.has(c.id)) continue;
        
        const isOrbitalAnchor = orbitalAnchorIds.has(c.id);
        simConstraints.push({
          ...serialized,
          ...(isOrbitalAnchor ? { _visualOnly: true } : {}),
        });

        if (!isOrbitalAnchor) {
          const b1 = bodies.find(b => b.id === serialized.bodyA);
          const b2 = bodies.find(b => b.id === serialized.bodyB);
          if (b1 && b2) {
            if (serialized._makesBodyDynamic) {
              const simBody = simBodies.find(b => b.id === b1.id);
              if (simBody && !simBody.isStatic) simBody.type = 2;
            }
            
            
            
            const vt = serialized.visualType;
            if (vt === 'hinge' || vt === 'weld') {
              ignorePairs.push([b1.id, b2.id]);
            }
          }
        }
      }
    }
  }

  
  
  
  const orbitalGroups = new Map();
  for (const e of orbitalEntries) {
    if (!orbitalGroups.has(e.motorConstraintId)) {
      orbitalGroups.set(e.motorConstraintId, {
        pivotX: e.pivotX, pivotY: e.pivotY,
        targetOmega: e.targetOmega, maxTorque: e.maxTorque,
        entries: [], 
      });
    }
    const g = orbitalGroups.get(e.motorConstraintId);
    if (!g.entries.find(en => en.dynId === e.dynId)) {
      g.entries.push({ dynId: e.dynId, isSpring: e.isSpring, springCompliance: e.springCompliance });
    }
  }

  for (const [motorConstraintId, g] of orbitalGroups) {
    const { pivotX, pivotY, targetOmega, maxTorque, entries } = g;

    const worldPinId = nextExtraId();
    simBodies.push({
      id:           worldPinId,
      name:         `Orbital Pivot ${motorConstraintId}`,
      shape:        'Box',
      type:         0,
      isStatic:     true,
      x:            pivotX, y: pivotY,
      w:            8, h: 8,
      rotation:     0, vx: 0, vy: 0, angularVelocity: 0,
      density:      1, friction: 0, restitution: 0,
      categoryBits: 0, maskBits: 0,
    });

    entries.forEach(({ dynId, isSpring, springCompliance }, idx) => {
      const simDynBody = simBodies.find(b => b.id === dynId);
      if (simDynBody) simDynBody.type = 2;

      const hingeId  = idx === 0 ? motorConstraintId + '_hinge'       : motorConstraintId + '_hinge_' + idx;
      const motorId  = idx === 0 ? motorConstraintId                   : motorConstraintId + '_extra_' + idx;

      if (isSpring) {
        
        
        
        
        
        
        
        
        
        
        
        
        
        const rotorId = nextExtraId();
        const diskX = simDynBody?.x ?? pivotX;
        const diskY = simDynBody?.y ?? pivotY;
        const fullDist = Math.hypot(diskX - pivotX, diskY - pivotY);

        
        simBodies.push({
          id:           rotorId,
          name:         `Rotor ${motorConstraintId}_${idx}`,
          shape:        'Circle',
          type:         2,
          isStatic:     false,
          x:            pivotX, y: pivotY,
          radius:       2,
          rotation:     0, vx: 0, vy: 0, angularVelocity: 0,
          density:      0.0001, friction: 0, restitution: 0,
          categoryBits: 0, maskBits: 0,
        });

        
        simConstraints.push({
          id:         hingeId,
          visualType: 'hidden_hinge',
          type:       'Hinge',
          bodyA:      rotorId,
          bodyB:      worldPinId,
          ax1:        pivotX, ay1: pivotY,
          ax2:        pivotX, ay2: pivotY,
          compliance: 0.0,
        });

        
        
        
        simConstraints.push({
          id:          motorId,
          visualType:  'motor',
          type:        'Motor',
          bodyA:       rotorId,
          bodyB:       worldPinId,
          ax1:         pivotX, ay1: pivotY,
          ax2:         pivotX, ay2: pivotY,
          targetOmega: targetOmega,
          maxTorque:   maxTorque,
        });

        
        
        
        
        
        const springId = motorConstraintId + '_armspring_' + idx;
        simConstraints.push({
          id:         springId,
          visualType: 'hidden_hinge',
          type:       'Distance',
          bodyA:      rotorId,
          bodyB:      dynId,
          ax1:        diskX, ay1: diskY,
          ax2:        diskX, ay2: diskY,
          distance:   0,
          compliance: springCompliance ?? 0.002,
        });

        
        
        
        const visSpringId = motorConstraintId + '_visspring_' + idx;
        simConstraints.push({
          id:          visSpringId,
          visualType:  'spring',
          type:        'Distance',
          bodyA:       worldPinId,
          bodyB:       dynId,
          ax1:         pivotX, ay1: pivotY,
          ax2:         diskX,  ay2: diskY,
          _visualOnly: true,
        });

        ignorePairs.push([rotorId, worldPinId]);
        ignorePairs.push([rotorId, dynId]);
      } else {
        
        
        simConstraints.push({
          id:         hingeId,
          visualType: 'hidden_hinge',
          type:       'Hinge',
          bodyA:      dynId,
          bodyB:      worldPinId,
          ax1:        pivotX, ay1: pivotY,
          ax2:        pivotX, ay2: pivotY,
          compliance: 0.0,
        });

        simConstraints.push({
          id:          motorId,
          visualType:  'motor',
          type:        'Motor',
          bodyA:       dynId,
          bodyB:       worldPinId,
          ax1:         pivotX, ay1: pivotY,
          ax2:         pivotX, ay2: pivotY,
          targetOmega: targetOmega,
          maxTorque:   maxTorque,
        });

        ignorePairs.push([dynId, worldPinId]);
      }
    });
  }

  return { bodies: simBodies, constraints: simConstraints, ignorePairs, errors };
}
