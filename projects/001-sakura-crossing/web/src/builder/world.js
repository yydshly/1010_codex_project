import * as THREE from 'three';
import { buildComponents } from '../lab/components.js';
import { SCENES } from '../lab/configs.js';
import { bounds, TYPES, TOWN_SIZE } from './model.js';

const style = { bands: 3, shadowTint: '#6c5f8c', ink: true, inkWidth: 1.2 };
export function createWorld(scene) {
  const base = buildComponents({ id: 'builder-ground', width: TOWN_SIZE, depth: TOWN_SIZE, theme: SCENES.street, buildings: [], trees: [], paths: [], benches: [], lamps: [], seed: 0 }, style, { foliage: false });
  scene.add(base.root);
  const grid = new THREE.GridHelper(TOWN_SIZE, TOWN_SIZE, '#9fae93', '#b1c0a0'); grid.position.y = .055; grid.material.transparent = true; grid.material.opacity = .3; scene.add(grid);
  const roots = new Map(), components = new Map(), hits = [];
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#d09a61', transparent: true, opacity: .8, depthWrite: false });
  const markerGeometry = new THREE.BoxGeometry(1, .018, 1);
  const marker = new THREE.Group();
  for (let i = 0; i < 4; i++) marker.add(new THREE.Mesh(markerGeometry, markerMaterial));
  scene.add(marker); marker.visible = false;
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const hitGeometry = new THREE.BoxGeometry(1, 1, 1);
  let themeName = null;
  function make(item, theme) {
    const c = { id: item.id, width: TOWN_SIZE, depth: TOWN_SIZE, theme, buildings: [], trees: [], paths: [], benches: [], lamps: [], seed: item.seed };
    if (item.type === 'house') c.buildings.push({ x: 0, z: 0, rotation: 0, width: 4.8, height: 3.65, depth: 4, wall: theme.wall[item.seed % theme.wall.length], roof: theme.roof[item.seed % theme.roof.length], shop: false });
    if (item.type === 'tree') c.trees.push({ x: 0, z: 0, scale: .93, seed: item.seed, color: theme.foliage[item.seed % theme.foliage.length] });
    if (item.type === 'road') c.paths.push({ x: 0, z: 0, width: 4, depth: 8, kind: 'road' });
    const component = buildComponents(c, style, { ground: false, foliage: false });
    const hit = new THREE.Mesh(hitGeometry, hitMaterial), type = TYPES[item.type];
    hit.scale.set(type.width, type.height, type.depth); hit.position.y = type.height / 2 + .1; hit.userData.objectId = item.id;
    component.root.add(hit); scene.add(component.root);
    // The pick box is shared by the editor, so remove it before disposing the kit.
    components.set(item.id, { component, hit }); roots.set(item.id, component.root); hits.push(hit);
  }
  function drop(id) {
    const entry = components.get(id); if (!entry) return;
    hits.splice(hits.indexOf(entry.hit), 1); entry.hit.removeFromParent(); entry.component.dispose(); components.delete(id); roots.delete(id);
  }
  return {
    hits, grid,
    sync(project) {
      const theme = project.theme === 'forest' ? SCENES.forest : SCENES.street;
      if (themeName !== project.theme) { [...components.keys()].forEach(drop); themeName = project.theme; }
      const ids = new Set(project.objects.map((item) => item.id));
      [...components.keys()].filter((id) => !ids.has(id)).forEach(drop);
      for (const item of project.objects) {
        const old = components.get(item.id);
        if (old && (old.seed !== item.seed || old.type !== item.type)) drop(item.id);
        if (!components.has(item.id)) { make(item, theme); Object.assign(components.get(item.id), { seed: item.seed, type: item.type }); }
        const root = roots.get(item.id); root.position.set(item.x, 0, item.z); root.rotation.y = item.rotation * Math.PI / 2;
      }
    },
    select(item) {
      marker.visible = !!item;
      if (!item) return;
      const size = bounds(item), x = size.x * 2 + .5, z = size.z * 2 + .5;
      marker.position.set(item.x, .1, item.z);
      marker.children.forEach((mesh, i) => { mesh.scale.set(i < 2 ? x : .09, 1, i < 2 ? .09 : z); mesh.position.set(i < 2 ? 0 : (i === 2 ? -x / 2 : x / 2), 0, i < 2 ? (i === 0 ? -z / 2 : z / 2) : 0); });
    },
    projectAnchor(item) { return new THREE.Vector3(item.x, TYPES[item.type].height + .8, item.z); },
    dispose() {
      [...components.keys()].forEach(drop); base.dispose(); grid.geometry.dispose(); grid.material.dispose(); grid.removeFromParent(); marker.removeFromParent(); markerGeometry.dispose(); markerMaterial.dispose(); hitGeometry.dispose(); hitMaterial.dispose();
    },
  };
}
