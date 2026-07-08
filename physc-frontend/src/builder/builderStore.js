import { create } from 'zustand';
import { getBodyDef, CONSTRAINT_COMPONENTS } from './componentRegistry';

let _idCounter = 2000;
export const nextId = () => ++_idCounter;

export function getAllAnchors(body) {
  const def = getBodyDef(body.type);
  if (!def) return [];
  const rot = body.rotation ?? 0;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  return def.getAnchors(body.props).map(a => ({
    bodyId:    body.id,
    anchorKey: a.key,
    label:     a.label,
    isCenter:  a.key === 'center' || a.key === 'self',
    world: {
      x: body.x + a.local.x * cos - a.local.y * sin,
      y: body.y + a.local.x * sin + a.local.y * cos,
    },
  }));
}

export function getAnchorWorldPos(body, anchorKey) {
  const anchors = getAllAnchors(body);
  return anchors.find(a => a.anchorKey === anchorKey)?.world ?? { x: body.x, y: body.y };
}

export const useBuilderStore = create((set, get) => ({

  
  machineTitle: '',
  setMachineTitle: (t) => set({ machineTitle: t }),

  
  bodies: [],

  addBody: (type, x, y) => {
    const def = getBodyDef(type);
    if (!def) return null;
    const id   = nextId();
    const body = {
      id,
      type,
      name:     `${def.label} ${id}`,
      x, y,
      rotation: 0,
      props:    { ...def.defaultProps },
    };
    set(s => ({ bodies: [...s.bodies, body] }));
    return id;
  },

  updateBody: (id, updates) => set(s => ({
    bodies: s.bodies.map(b => b.id === id ? { ...b, ...updates } : b),
  })),

  updateBodyProps: (id, propUpdates) => set(s => ({
    bodies: s.bodies.map(b => b.id === id
      ? { ...b, props: { ...b.props, ...propUpdates } }
      : b),
  })),

  removeBody: (id) => set(s => ({
    bodies:      s.bodies.filter(b => b.id !== id),
    constraints: s.constraints.filter(c =>
      !getConstraintBodyIds(c).includes(id)),
    selectedId:  s.selectedId === id ? null : s.selectedId,
  })),

  
  constraints: [],

  addConstraint: (constraint) => set(s => ({
    constraints: [...s.constraints, { id: nextId(), ...constraint }],
  })),

  updateConstraint: (id, updates) => set(s => ({
    constraints: s.constraints.map(c => c.id === id ? { ...c, ...updates } : c),
  })),

  updateConstraintProps: (id, propUpdates) => set(s => ({
    constraints: s.constraints.map(c => c.id === id
      ? { ...c, props: { ...c.props, ...propUpdates } }
      : c),
  })),

  removeConstraint: (id) => set(s => ({
    constraints: s.constraints.filter(c => c.id !== id),
    selectedId:  s.selectedId === id ? null : s.selectedId,
  })),

  
  selectedId:   null,
  selectedType: null,
  hoveredId:    null,
  hoveredType:  null,

  setSelected:  (id, type) => set({ selectedId: id, selectedType: type }),
  clearSelected:() => set({ selectedId: null, selectedType: null }),
  setHovered:   (id, type) => set({ hoveredId: id, hoveredType: type }),
  clearHovered: () => set({ hoveredId: null, hoveredType: null }),

  
  activeTool: 'select',
  setActiveTool: (tool) => {
    
    
    const s = get();
    if (s.pendingConstraintType && s.pendingConstraintSteps.length > 0) {
      const cDef = CONSTRAINT_COMPONENTS[s.pendingConstraintType];
      
      const minSteps = cDef?.minSteps !== undefined ? cDef.minSteps : (cDef?.steps?.length ?? 2);
      if (s.pendingConstraintSteps.length >= minSteps) {
        
        set(state => ({
          constraints: [...state.constraints, {
            id: nextId(),
            type: s.pendingConstraintType,
            steps: s.pendingConstraintSteps,
            props: { ...(cDef.defaultProps ?? {}) },
          }],
        }));
      }
      
    }
    set({
      activeTool:             tool,
      pendingConstraintType:  null,
      pendingConstraintSteps: [],
      pendingConstraintError: null,
    });
  },

  
  pendingConstraintType:  null,   
  pendingConstraintSteps: [],     
  pendingConstraintError: null,   

  startConstraintWiring: (type) => set({
    pendingConstraintType:  type,
    pendingConstraintSteps: [],
    pendingConstraintError: null,
  }),

  pushConstraintStep: (step) => set(s => ({
    pendingConstraintSteps: [...s.pendingConstraintSteps, step],
    pendingConstraintError: null,
  })),

  setConstraintError: (msg) => set({ pendingConstraintError: msg }),

  clearPendingConstraint: () => set({
    pendingConstraintType:  null,
    pendingConstraintSteps: [],
    pendingConstraintError: null,
  }),

  
  panX: 0,
  panY: 0,
  zoom: 1,
  setPan:  (x, y) => set({ panX: x, panY: y }),
  setZoom: (z)    => set({ zoom: Math.max(0.1, Math.min(5, z)) }),
  resetView: ()   => set({ panX: 0, panY: 0, zoom: 1 }),

  
  clearScene: () => set({
    bodies:                [],
    constraints:           [],
    selectedId:            null,
    selectedType:          null,
    hoveredId:             null,
    hoveredType:           null,
    pendingConstraintType: null,
    pendingConstraintSteps:[],
    pendingConstraintError:null,
  }),

  
  restoreScene: ({ machineTitle, bodies, constraints }) => {
    const allIds = [
      ...(bodies      ?? []).map(b => b.id),
      ...(constraints ?? []).map(c => c.id),
    ].filter(id => typeof id === 'number');
    if (allIds.length) _idCounter = Math.max(_idCounter, ...allIds) + 1;
    set({
      machineTitle:          machineTitle ?? '',
      bodies:                bodies        ?? [],
      constraints:           constraints   ?? [],
      selectedId:            null,
      selectedType:          null,
      hoveredId:             null,
      hoveredType:           null,
      pendingConstraintType: null,
      pendingConstraintSteps:[],
      pendingConstraintError:null,
    });
  },
}));

function getConstraintBodyIds(c) {
  const ids = [];
  if (c.steps) {
    
    c.steps.forEach(s => s.bodyId && ids.push(s.bodyId));
  }
  if (c.bodyAId) ids.push(c.bodyAId);
  if (c.bodyBId) ids.push(c.bodyBId);
  if (c.bodyIds) ids.push(...c.bodyIds);
  return ids;
}
