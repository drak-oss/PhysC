import { useEditorStore } from '../store/editorStore';

class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this.listeners = new Set();
    }

    executeCommand(command) {
        command.execute();
        this.undoStack.push(command);
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
        this.redoStack = [];
        this.notifyListeners();
    }

    undo() {
        if (!this.canUndo()) return;
        const cmd = this.undoStack.pop();
        cmd.undo();
        this.redoStack.push(cmd);
        this.notifyListeners();
    }

    redo() {
        if (!this.canRedo()) return;
        const cmd = this.redoStack.pop();
        cmd.execute();
        this.undoStack.push(cmd);
        this.notifyListeners();
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyListeners();
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notifyListeners() { this.listeners.forEach(l => l()); }
}

export const commandManager = new CommandManager();

export class TranslateGroupCommand {
    
    constructor(startBodyId, dx, dy, physicsApi) {
        this.startBodyId  = startBodyId;
        this.dx           = dx;
        this.dy           = dy;
        this.physicsApi   = physicsApi;
        this.preSnapshot  = null;
        this.postSnapshot = null;
    }

    execute() {
        if (!this.preSnapshot) {
            
            
            
            
            useEditorStore.getState().syncLiveToDefinitions();

            const before = useEditorStore.getState();
            this.preSnapshot = {
                bodies:      JSON.parse(JSON.stringify(before.bodies)),
                constraints: JSON.parse(JSON.stringify(before.constraints)),
            };
            
            useEditorStore.getState().translateGroup(this.startBodyId, this.dx, this.dy);
            
            const after = useEditorStore.getState();
            this.postSnapshot = {
                bodies:      JSON.parse(JSON.stringify(after.bodies)),
                constraints: JSON.parse(JSON.stringify(after.constraints)),
            };
        } else {
            
            useEditorStore.getState().restoreSnapshot(this.postSnapshot);
        }
        if (this.physicsApi?.rebuildScene) this.physicsApi.rebuildScene();
    }

    undo() {
        if (!this.preSnapshot) return;
        
        
        useEditorStore.getState().restoreSnapshot(this.preSnapshot);
        if (this.physicsApi?.rebuildScene) this.physicsApi.rebuildScene();
    }
}

const REBUILD_PROPS       = new Set(['rotation', 'type']);
const VELOCITY_PROPS      = new Set(['vx', 'vy', 'angularVelocity']);
const MATERIAL_PROPS      = new Set(['density', 'friction', 'restitution']);
const MOTOR_PARAMS        = new Set(['targetOmega', 'maxTorque']);

export class ModifyPropertyCommand {
    
    constructor(nodeId, nodeType, propertyName, oldValue, newValue, physicsApi, wasmId) {
        this.nodeId       = nodeId;
        this.nodeType     = nodeType;
        this.propertyName = propertyName;
        this.oldValue     = oldValue;
        this.newValue     = newValue;
        this.physicsApi   = physicsApi;
        this.wasmId       = wasmId;
    }

    execute() { this._apply(this.newValue); }
    undo()    { this._apply(this.oldValue); }

    _apply(value) {
        if (this.nodeType === 'body') {
            
            useEditorStore.getState().updateBody(this.nodeId, { [this.propertyName]: value });

            if (this.physicsApi) {
                if (VELOCITY_PROPS.has(this.propertyName)) {
                    
                    const state   = useEditorStore.getState();
                    const live    = state.liveBodyData[this.nodeId] ?? {};
                    const bodyDef = state.bodies.find(b => b.id === this.nodeId) ?? {};
                    if (this.propertyName === 'angularVelocity') {
                        
                        
                        
                        
                        useEditorStore.getState().syncLiveToDefinitions();
                        useEditorStore.getState().updateBody(this.nodeId, { angularVelocity: value });
                        if (this.physicsApi?.rebuildScene) this.physicsApi.rebuildScene();
                    } else if (this.wasmId !== undefined) {
                        const vx = this.propertyName === 'vx' ? value : (live.vx ?? bodyDef.vx ?? 0);
                        const vy = this.propertyName === 'vy' ? value : (live.vy ?? bodyDef.vy ?? 0);
                        this.physicsApi.setLinearVelocity({ bodyId: this.wasmId, vx, vy });
                    }
                } else if (MATERIAL_PROPS.has(this.propertyName)) {
                    
                    
                    const bodyDef = useEditorStore.getState().bodies.find(b => b.id === this.nodeId);
                    if (this.wasmId !== undefined && bodyDef) {
                        this.physicsApi.setBodyMaterial({
                            bodyId:      this.wasmId,
                            density:     bodyDef.density     ?? 0.005,
                            friction:    bodyDef.friction    ?? 0.5,
                            restitution: bodyDef.restitution ?? 0,
                        });
                    }
                } else if (REBUILD_PROPS.has(this.propertyName)) {
                    
                    
                    
                    
                    useEditorStore.getState().syncLiveToDefinitions();
                    if (this.physicsApi.rebuildScene) this.physicsApi.rebuildScene();
                }
            }
        } else if (this.nodeType === 'constraint') {
            useEditorStore.getState().updateConstraint(this.nodeId, { [this.propertyName]: value });

            
            
            if (MOTOR_PARAMS.has(this.propertyName) && this.physicsApi?.setMotorParams) {
                const state = useEditorStore.getState();
                const c = state.constraints.find(con => con.id === this.nodeId);
                if (c) {
                    const wasmBodyA = state.idMap[c.bodyA];
                    if (wasmBodyA !== undefined) {
                        this.physicsApi.setMotorParams({
                            bodyA:       wasmBodyA,
                            targetOmega: c.targetOmega ?? -2.0,
                            maxTorque:   c.maxTorque   ?? -1.0,
                        });
                    }
                }
                return; 
            }

            useEditorStore.getState().syncLiveToDefinitions();

            
            
            
            if (this.propertyName === 'distance') {
                const state = useEditorStore.getState();
                const c = state.constraints.find(con => con.id === this.nodeId);
                if (c?._visualOnly && c.visualType === 'spring') {
                    const bodyA = state.bodies.find(b => b.id === c.bodyA);
                    const bodyB = state.bodies.find(b => b.id === c.bodyB);
                    if (bodyA && bodyB) {
                        const staticBody  = bodyA.isStatic ? bodyA : bodyB;
                        const dynamicBody = bodyA.isStatic ? bodyB : bodyA;
                        const pivotX = staticBody.x, pivotY = staticBody.y;
                        const dx = dynamicBody.x - pivotX, dy = dynamicBody.y - pivotY;
                        const d  = Math.hypot(dx, dy);
                        if (d > 1e-6) {
                            useEditorStore.getState().updateBody(dynamicBody.id, {
                                x: pivotX + (dx / d) * value,
                                y: pivotY + (dy / d) * value,
                            });
                        }
                    }
                }
            }

            if (this.physicsApi?.rebuildScene) this.physicsApi.rebuildScene();
        }
    }
}

export class AddBodyCommand {
    constructor(body, physicsApi) {
        this.body      = body;
        this.physicsApi = physicsApi;
    }
    async execute() {
        useEditorStore.getState().addBody(this.body);
        if (this.physicsApi) {
            if      (this.body.shape === 'Box')    await this.physicsApi.addBox(this.body);
            else if (this.body.shape === 'Circle') await this.physicsApi.addCircle(this.body);
        }
    }
    undo() {
        useEditorStore.getState().removeBody(this.body.id);
        if (this.physicsApi?.rebuildScene) this.physicsApi.rebuildScene();
    }
}
