import client from './client';
import { useEditorStore } from '../store/editorStore';
import { useBuilderStore } from '../builder/builderStore';
import { simFormatToBuilderFormat } from '../utils/sceneConversion';
import { serializeToSimulator } from '../builder/serializationSystem';

function captureThumbnail() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  const tmp = document.createElement('canvas');
  tmp.width = 480;
  tmp.height = 270;
  tmp.getContext('2d').drawImage(canvas, 0, 0, 480, 270);
  return tmp.toDataURL('image/jpeg', 0.8);
}

function buildPayload({ name, description, isPublic, thumbnail }) {
  const state = useEditorStore.getState();
  return {
    name,
    description,
    isPublic,
    thumbnail: thumbnail ?? captureThumbnail(),
    machineData: JSON.stringify({
      version: 1,
      machineTitle: state.machineTitle,
      bodies: state.bodies,
      constraints: state.constraints,
    }),
  };
}

export function loadMachineIntoStore(machine) {
  const parsed = JSON.parse(machine.machineData);
  useEditorStore.getState().loadScene({
    bodies:       parsed.bodies      ?? [],
    constraints:  parsed.constraints ?? [],
    machineTitle: parsed.machineTitle ?? machine.name,
  });
}

export function loadMachineIntoBuilderStore(machine) {
  const parsed = JSON.parse(machine.machineData);
  const isSimFormat = Array.isArray(parsed.bodies) && parsed.bodies.length > 0
    && typeof parsed.bodies[0].shape === 'string';
  const data = isSimFormat ? simFormatToBuilderFormat(parsed) : parsed;
  const store = useBuilderStore.getState();
  store.restoreScene({ ...data, machineTitle: machine.name });
  if (data.bodies && data.bodies.length > 0) {
    const xs = data.bodies.map(b => b.x ?? 0);
    const ys = data.bodies.map(b => b.y ?? 0);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    store.setZoom(1);
    store.setPan(
      Math.round((Math.max(400, window.innerWidth - 240 - 280)) / 2 - cx),
      Math.round((Math.max(300, window.innerHeight - 52)) / 2 - cy)
    );
  }
}

export async function saveFromBuilder({ name, description, isPublic }) {
  const { bodies, constraints } = useBuilderStore.getState();
  if (!bodies.length) throw new Error('Add at least one body before saving.');
  const serialized = serializeToSimulator({ bodies, constraints });
  return client.post('/machines', {
    name,
    description: description ?? '',
    isPublic: !!isPublic,
    thumbnail: captureThumbnail(),
    machineData: JSON.stringify({
      version: 1,
      machineTitle: name,
      bodies: serialized.bodies,
      constraints: serialized.constraints,
      ignorePairs: serialized.ignorePairs ?? [],
    }),
  }).then(r => r.data);
}

export const machineApi = {
  save:        (meta)                 => client.post('/machines', buildPayload(meta)).then(r => r.data),
  update:      (id, meta)             => client.put(`/machines/${id}`, buildPayload(meta)).then(r => r.data),
  updateMeta:  (id, machine, patches) => client.put(`/machines/${id}`, {
    name: machine.name, description: machine.description,
    machineData: machine.machineData, thumbnail: machine.thumbnail,
    isPublic: machine.isPublic, ...patches,
  }).then(r => r.data),
  get:        (id)       => client.get(`/machines/${id}`).then(r => r.data),
  delete:     (id)       => client.delete(`/machines/${id}`).then(r => r.data),
  listMy:     ()         => client.get('/machines/my').then(r => r.data),
  listPublic: ()         => client.get('/machines/public').then(r => r.data),
  listByUser: (username) => client.get(`/machines/user/${username}`).then(r => r.data),
  search:     (q)        => client.get('/machines/search', { params: { q } }).then(r => r.data),
  fork:       (id)       => client.post(`/machines/${id}/fork`).then(r => r.data),
};
