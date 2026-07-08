import { useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { computeLocalAnchors } from '../../utils/localAnchors';

export function useSetupScene({ api, ready, sceneVersion, setSceneSetupDone }) {
  useEffect(() => {
    if (!ready) return;
    let active = true;

    const setupScene = async () => {
      const state = useEditorStore.getState();
      const bodiesSnapshot      = state.bodies;
      const constraintsSnapshot = state.constraints;
      const ignorePairsSnapshot = state.ignorePairs;

      await api.clearScene();
      if (!active) return;

      const idMap = {};
      for (const b of bodiesSnapshot) {
        const bMapped = { ...b };
        if (bMapped.type === undefined) bMapped.type = bMapped.isStatic ? 0 : 2;
        if (bMapped.isHiddenPin) bMapped.type = 0;

        const mapLayer = (layerStr) => {
          if (layerStr === 'A') return 1;
          if (layerStr === 'B') return 2;
          if (layerStr === 'C') return 4;
          if (layerStr === 'None') return 0;
          return layerStr;
        };
        if (bMapped.collisionCategory) bMapped.categoryBits = mapLayer(bMapped.collisionCategory);
        if (bMapped.collisionMask)     bMapped.maskBits     = mapLayer(bMapped.collisionMask);

        let wasmId;
        if      (bMapped.shape === 'Box')    wasmId = await api.addBox(bMapped);
        else if (bMapped.shape === 'Circle') wasmId = await api.addCircle(bMapped);

        if (wasmId !== undefined) idMap[b.id] = wasmId;
        else console.warn(`[setupScene] Body "${b.name}" (id ${b.id}) failed — shape: ${b.shape}`);
      }
      useEditorStore.getState().setIdMap(idMap);

      console.log(`[setupScene] ${Object.keys(idMap).length}/${bodiesSnapshot.length} bodies, ${constraintsSnapshot.length} constraints`);

      for (const c of constraintsSnapshot) {
        if (c._visualOnly) continue;
        const resolvedPulley = c.pulleyBody !== undefined ? idMap[c.pulleyBody] : undefined;
        
        
        
        
        
        
        const origBodyB = bodiesSnapshot.find(b => b.id === c.bodyB);
        const mc = {
          ...c,
          bodyA: idMap[c.bodyA],
          bodyB: idMap[c.bodyB],
          ...(resolvedPulley !== undefined ? { pulleyBody: resolvedPulley } : {}),
          ...(origBodyB ? { bB_x: origBodyB.x, bB_y: origBodyB.y } : {}),
        };
        if      (c.type === 'Hinge')    api.addHingeConstraint(mc);
        else if (c.type === 'Distance') api.addDistanceConstraint(mc);
        else if (c.type === 'Motor')    api.addMotorConstraint(mc);
        else if (c.type === 'Slider')   api.addSliderConstraint(mc);
        else if (c.type === 'Weld')     api.addWeldConstraint(mc);
        else if (c.type === 'Pulley')   api.addPulleyConstraint(mc);
        else console.warn(`[setupScene] Unknown constraint type "${c.type}" — skipped`);
      }

      for (const pair of (ignorePairsSnapshot || [])) {
        const resolvedA = idMap[pair[0]], resolvedB = idMap[pair[1]];
        if (resolvedA !== undefined && resolvedB !== undefined && api.addIgnorePair)
          api.addIgnorePair({ bodyA: resolvedA, bodyB: resolvedB });
      }

      useEditorStore.getState().setLocalAnchors(
        computeLocalAnchors(bodiesSnapshot, constraintsSnapshot)
      );
      setSceneSetupDone(true);
      api.requestRenderData();
    };

    setupScene();
    return () => { active = false; };
  }, [ready, sceneVersion]);
}
