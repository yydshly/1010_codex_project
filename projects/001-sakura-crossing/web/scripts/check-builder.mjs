import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/builder/world.js';
import { STORAGE_KEY, MAX_OBJECTS, clone, createDefaultProject, validateProject, addObject, moveObject, rotateObject, removeObject, History, readSave, writeSave } from '../src/builder/model.js';

const initial = createDefaultProject(), project = clone(initial), history = new History();
assert.equal(project.objects.length, 13);
const id = addObject(project, 'house'); history.record(initial, project);
moveObject(project, id, 3.4, -2.7); assert.deepEqual(project.objects.find((item) => item.id === id), { id, type: 'house', rotation: 0, seed: 1022, x: 3, z: -3 });
moveObject(project, id, 999, -999); assert.deepEqual([project.objects.at(-1).x, project.objects.at(-1).z], [17, -17]);
rotateObject(project, id); assert.equal(project.objects.at(-1).rotation, 1);
const moved = clone(project); removeObject(project, id); history.record(moved, project);
assert.deepEqual(history.undo(project), moved); assert.deepEqual(history.redo(moved), project);
const empty = clone(initial); empty.objects = []; assert.equal(validateProject(empty).objects.length, 0);
const storage = new Map(), memory = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
assert.equal(readSave(memory), null);
const save = writeSave(memory, project); assert.deepEqual(readSave(memory), save);
assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))), project);
const other = clone(project); other.name = '修改后'; other.style.ink = false; other.theme = 'forest';
assert.deepEqual(readSave(memory).project, project, '未保存编辑不能影响存档');
assert.deepEqual(validateProject(JSON.parse(JSON.stringify(other))), other, '主题、风格与名称必须一起保存');
for (const change of [
  (p) => { p.version = 2; }, (p) => { p.objects.push(clone(p.objects[0])); },
  (p) => { p.objects[0].x = Infinity; }, (p) => { p.objects[0].x = 100; },
  (p) => { p.objects[0].type = '__proto__'; }, (p) => { p.objects[0].rotation = 5; },
  (p) => { p.nextId = 1; }, (p) => { p.name = ''; }, (p) => { p.style.grade = 'yes'; },
]) { const invalid = clone(project); change(invalid); assert.throws(() => validateProject(invalid)); }
const full = clone(empty); for (let i = 0; i < MAX_OBJECTS; i++) addObject(full, i % 2 ? 'tree' : 'house');
assert.throws(() => addObject(full, 'road')); assert.equal(validateProject(full).objects.length, MAX_OBJECTS);
const unavailable = { getItem() { throw new Error('unavailable'); }, setItem() { throw new Error('quota'); } };
assert.throws(() => readSave(unavailable)); assert.throws(() => writeSave(unavailable, project));
storage.set(STORAGE_KEY, '{broken'); assert.throws(() => readSave(memory));

const scene = new THREE.Scene(), world = createWorld(scene); world.sync(initial);
assert.equal(world.hits.length, initial.objects.length);
const selected = initial.objects.find((item) => item.type === 'house');
const hit = world.hits.find((mesh) => mesh.userData.objectId === selected.id), root = hit.parent;
const one = clone(initial); moveObject(one, selected.id, 4, 3); world.sync(one);
assert.equal(hit.parent, root, '移动复用对象几何体，不能重建'); assert.equal(root.position.x, 4); assert.equal(root.position.z, 3);
const altered = clone(one); altered.objects.find((item) => item.id === selected.id).type = 'tree'; world.sync(altered);
assert.notEqual(world.hits.find((mesh) => mesh.userData.objectId === selected.id), hit, '同 ID 导入不同类型需要更新外观');
world.sync(empty); assert.equal(world.hits.length, 0); world.dispose(); assert.equal(scene.children.length, 0);
console.log('搭建器检查通过：编辑、边界、空镇、存档与风格往返、撤销重做、无效配置/存储失败、对象复用与资源释放。');
