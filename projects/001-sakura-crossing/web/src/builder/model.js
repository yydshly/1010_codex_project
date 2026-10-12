// A small, versioned local project format. No rendering or browser dependency.
export const FORMAT = 'sakura-town';
export const STORAGE_KEY = 'sakura-town-builder:save:v1';
export const TOWN_SIZE = 40;
export const MAX_OBJECTS = 60;
export const TYPES = {
  house: { name: '房屋', width: 5.4, depth: 4.6, height: 5.8 },
  tree: { name: '树木', width: 4.8, depth: 4.8, height: 5.8 },
  road: { name: '道路', width: 4, depth: 8, height: .12 },
};
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function bounds(item) {
  const type = TYPES[item.type];
  return { x: (item.rotation % 2 ? type.depth : type.width) / 2, z: (item.rotation % 2 ? type.width : type.depth) / 2 };
}
export function clampPosition(item, x, z) {
  const half = bounds(item);
  const limitX = Math.floor(TOWN_SIZE / 2 - half.x), limitZ = Math.floor(TOWN_SIZE / 2 - half.z);
  return { x: Math.max(-limitX, Math.min(limitX, Math.round(x))), z: Math.max(-limitZ, Math.min(limitZ, Math.round(z))) };
}
export function validateProject(input) {
  const fail = (message) => { throw new Error(message); };
  if (!input || input.format !== FORMAT || input.version !== 1) fail('文件不是小镇搭建器 v1 配置。');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 40) fail('小镇名称需为 1–40 个字符。');
  if (!['spring', 'forest'].includes(input.theme)) fail('未知小镇主题。');
  if (typeof input.style?.ink !== 'boolean' || typeof input.style?.grade !== 'boolean') fail('画面设置无效。');
  if (!Number.isSafeInteger(input.nextId) || input.nextId < 1 || input.nextId > 1e9) fail('对象编号无效。');
  if (!Array.isArray(input.objects) || input.objects.length > MAX_OBJECTS) fail(`最多保留 ${MAX_OBJECTS} 个对象。`);
  const ids = new Set();
  const objects = input.objects.map((item) => {
    if (!item || !Object.hasOwn(TYPES, item.type)) fail('未知对象类型。');
    const id = /^item-([1-9]\d*)$/.exec(item.id);
    if (!id || Number(id[1]) >= input.nextId || ids.has(item.id)) fail('对象编号重复或无效。');
    ids.add(item.id);
    if (!Number.isInteger(item.rotation) || item.rotation < 0 || item.rotation > 3) fail('对象朝向无效。');
    if (!Number.isInteger(item.seed) || item.seed < 0 || item.seed > 999999) fail('对象种子无效。');
    if (!Number.isInteger(item.x) || !Number.isInteger(item.z)) fail('位置必须是整数网格坐标。');
    const position = clampPosition(item, item.x, item.z);
    if (position.x !== item.x || position.z !== item.z) fail('对象超出了小镇边界。');
    return { id: item.id, type: item.type, x: item.x, z: item.z, rotation: item.rotation, seed: item.seed };
  });
  return { format: FORMAT, version: 1, name: input.name.trim(), theme: input.theme, style: { ink: input.style.ink, grade: input.style.grade }, nextId: input.nextId, objects };
}
export function createDefaultProject() {
  const project = { format: FORMAT, version: 1, name: '我的樱花小镇', theme: 'spring', style: { ink: true, grade: true }, nextId: 1, objects: [] };
  const add = (type, x, z, rotation = 0) => { const n = project.nextId++; project.objects.push({ id: 'item-' + n, type, x, z, rotation, seed: n * 73 }); };
  [-8, 0, 8].forEach((x) => add('road', x, 0, 1));
  for (const x of [-7, 7]) { add('house', x, -6); add('house', x, 6, 2); }
  for (const x of [-14, 0, 14]) for (const z of [-9, 9]) add('tree', x, z);
  return validateProject(project);
}
export function addObject(project, type) {
  if (!Object.hasOwn(TYPES, type)) throw new Error('未知组件。');
  if (project.objects.length >= MAX_OBJECTS) throw new Error(`已达到 ${MAX_OBJECTS} 个对象的实验上限。`);
  if (project.nextId >= 1e9) throw new Error('对象编号已达到上限，请新建小镇。');
  const n = project.nextId, item = { id: 'item-' + n, type, x: 0, z: 0, rotation: 0, seed: n * 73 % 1000000 };
  const candidateHalf = bounds(item);
  // Find a free footprint first; roads are allowed to join/overlap other roads.
  const positions = [];
  for (let x = -16; x <= 16; x += 4) for (let z = -16; z <= 16; z += 4) positions.push({ x, z });
  positions.sort((a, b) => a.x * a.x + a.z * a.z - b.x * b.x - b.z * b.z);
  const position = positions.find((p) => {
    if (clampPosition(item, p.x, p.z).x !== p.x || clampPosition(item, p.x, p.z).z !== p.z) return false;
    return project.objects.every((other) => {
      if (type === 'road' && other.type === 'road') return true;
      const half = bounds(other);
      return Math.abs(p.x - other.x) >= candidateHalf.x + half.x + .4 || Math.abs(p.z - other.z) >= candidateHalf.z + half.z + .4;
    });
  }) || { x: 0, z: 0 };
  project.objects.push({ ...item, ...position }); project.nextId++;
  return item.id;
}
export function moveObject(project, id, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error('请输入有效坐标。');
  const item = project.objects.find((object) => object.id === id);
  if (!item) return false;
  Object.assign(item, clampPosition(item, x, z)); return true;
}
export function rotateObject(project, id) {
  const item = project.objects.find((object) => object.id === id);
  if (!item) return false;
  item.rotation = (item.rotation + 1) % 4;
  Object.assign(item, clampPosition(item, item.x, item.z)); return true;
}
export function removeObject(project, id) {
  project.objects = project.objects.filter((item) => item.id !== id);
}
export class History {
  constructor() { this.past = []; this.future = []; }
  record(before, after) {
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    this.past.push(clone(before)); if (this.past.length > 50) this.past.shift(); this.future = []; return true;
  }
  undo(current) { if (!this.past.length) return null; this.future.push(clone(current)); return this.past.pop(); }
  redo(current) { if (!this.future.length) return null; this.past.push(clone(current)); return this.future.pop(); }
}
export function readSave(storage) {
  const text = storage.getItem(STORAGE_KEY);
  if (!text) return null;
  const value = JSON.parse(text);
  if (typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))) throw new Error('存档日期无效。');
  return { savedAt: value.savedAt, project: validateProject(value.project) };
}
export function writeSave(storage, project) {
  const value = { savedAt: new Date().toISOString(), project: validateProject(project) };
  storage.setItem(STORAGE_KEY, JSON.stringify(value)); return value;
}
