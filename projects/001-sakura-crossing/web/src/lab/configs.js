// Local, deterministic layouts. Every layout uses the same component schema.
export const SCENES = {
  street: { name: '樱花商业街', english: 'SAKURA STREET', number: '01', subtitle: '沿街排布 · 双侧店铺 · 樱花步道', ground: '#b7cdb8', path: '#8d969f', wall: ['#e8d8c0', '#efd7ce', '#d5dfdc', '#e5dccc'], roof: ['#71868f', '#9d7e86', '#77958e'], foliage: ['#efbbce', '#e6a8c4', '#f4c9d3'], shop: '春日杂货', description: '房屋朝向中央道路，樱花与路灯串联步道。' },
  forest: { name: '林间村落', english: 'WOODLAND VILLAGE', number: '02', subtitle: '错落屋舍 · 林间小径 · 绿色树冠', ground: '#a8bea4', path: '#d2c5a8', wall: ['#e3dcc1', '#d6d9bd', '#d9c8b5', '#e6d5bc'], roof: ['#748a79', '#7e8c83', '#8c7e75'], foliage: ['#8eae8d', '#acc69c', '#749e88'], shop: '林间茶屋', description: '同一房屋组件改变位置、朝向和配色，形成林间聚落。' },
  square: { name: '小广场', english: 'NEIGHBORHOOD SQUARE', number: '03', subtitle: '围合建筑 · 中央水景 · 公共座椅', ground: '#b6c7b5', path: '#ddd2bc', wall: ['#edddc6', '#e7d0c3', '#d7dfd5', '#e5dec7'], roof: ['#7d9095', '#ab8487', '#89968a'], foliage: ['#eebdcc', '#bfd0a5', '#e4afc6'], shop: '广场花店', description: '建筑朝向公共空间，中央水景与长椅组织停留点。' },
};

export function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createConfig(id = 'street', count = 10, seed = 2411) {
  if (!SCENES[id] || ![10, 50, 100].includes(count) || !Number.isInteger(seed) || seed < 0 || seed > 999999) throw new Error('无效的场景配置');
  const theme = SCENES[id], random = seededRandom(seed);
  const buildings = [], trees = [], paths = [], benches = [], lamps = [];
  let width, depth;
  function house(x, z, rotation) {
    const i = buildings.length;
    const item = { id: 'house-' + i, x, z, rotation, width: 4.5 + random() * .55, height: 3.25 + random() * .85, depth: 3.7 + random() * .3, wall: theme.wall[i % theme.wall.length], roof: theme.roof[i % theme.roof.length], shop: i === 0 };
    buildings.push(item);
    return item;
  }
  function tree(x, z, scale = 1) { trees.push({ x, z, scale, color: theme.foliage[trees.length % theme.foliage.length], seed: seed + trees.length * 73 }); }

  if (id === 'street') {
    const columns = Math.ceil(Math.sqrt(count * 2)), rows = Math.ceil(count / columns), pairs = Math.ceil(rows / 2);
    width = columns * 7.8 + 7; depth = pairs * 20 + 5;
    for (const side of [-1, 1]) paths.push({ x: side * (width / 2 - 3), z: 0, width: 3, depth: depth - 4, kind: 'road' });
    for (let pair = 0; pair < pairs; pair++) {
      const centerZ = (pair - (pairs - 1) / 2) * 20;
      paths.push({ x: 0, z: centerZ, width: width - 3, depth: 6.2, kind: 'road' });
      for (const sign of [-1, 1]) paths.push({ x: 0, z: centerZ + sign * 4.25, width: width - 3, depth: 2.3, kind: 'walk' });
      for (let stripe = 0; stripe < 8; stripe++) paths.push({ x: -.18 + stripe * .6 - 2, z: centerZ, width: .32, depth: 5.4, kind: 'stripe' });
    }
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / columns), col = i % columns;
      const lane = (Math.floor(row / 2) - (pairs - 1) / 2) * 20;
      const side = row % 2 === 0 ? -1 : 1;
      const x = (col - (columns - 1) / 2) * 7.8;
      house(x, lane + side * 7.25, side === -1 ? 0 : Math.PI);
      tree(x + 3.55, lane + side * 4.8, .69);
      if (col % 2 === 0) lamps.push({ x: x - 3.4, z: lane + side * 4.7 });
      if (col % 3 === 1) benches.push({ x, z: lane + side * 3.9, rotation: side === -1 ? 0 : Math.PI });
    }
  } else if (id === 'forest') {
    const columns = Math.ceil(Math.sqrt(count * 1.3)), rows = Math.ceil(count / columns);
    width = columns * 12 + 8; depth = rows * 12 + 9;
    for (let row = 0; row < rows; row++) paths.push({ x: 0, z: (row - (rows - 1) / 2) * 12 + 4.1, width: width - 5, depth: 2.2, kind: 'walk' });
    paths.push({ x: -width / 2 + 4, z: 2, width: 2.2, depth: depth - 5, kind: 'walk' });
    for (let i = 0; i < count; i++) {
      const x = (i % columns - (columns - 1) / 2) * 12 + (random() - .5) * 1.3;
      const z = (Math.floor(i / columns) - (rows - 1) / 2) * 12 + (random() - .5) * .7;
      house(x, z, (random() - .5) * .3);
      tree(x - 4.1, z - 1.3, .87); tree(x + 3.8, z - 3.6, .75);
      if (i % 3 === 0) { benches.push({ x: x + 3.7, z: z + 3.4, rotation: -.15 }); lamps.push({ x: x - 3.2, z: z + 3.4 }); }
    }
  } else {
    const perSide = Math.ceil(count / 4), radius = Math.max(12, perSide * 3.5 + 3.4);
    width = depth = radius * 2 + 10;
    paths.push({ x: 0, z: 0, width: radius * 2 - 4, depth: radius * 2 - 4, kind: 'plaza' });
    for (let i = 0; i < count; i++) {
      const side = Math.floor(i / perSide), pos = (i % perSide - (perSide - 1) / 2) * 7;
      const positions = [[pos, -radius, 0], [radius, pos, -Math.PI / 2], [-pos, radius, Math.PI], [-radius, -pos, Math.PI / 2]];
      house(...positions[side]);
    }
    const parkRadius = Math.min(radius - 5, 12);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      tree(Math.cos(a) * parkRadius, Math.sin(a) * parkRadius, .8);
      if (i % 2 === 0) { benches.push({ x: Math.cos(a + .25) * (parkRadius - 2), z: Math.sin(a + .25) * (parkRadius - 2), rotation: -a - Math.PI / 2 }); lamps.push({ x: Math.cos(a + .5) * parkRadius, z: Math.sin(a + .5) * parkRadius }); }
    }
  }
  const landmark = buildings.reduce((a, b) => a.x * a.x + a.z * a.z <= b.x * b.x + b.z * b.z ? a : b);
  buildings.forEach((b) => { b.shop = b === landmark; });
  return { id, seed, count, theme, width, depth, buildings, trees, paths, benches, lamps, fountain: id === 'square' };
}
