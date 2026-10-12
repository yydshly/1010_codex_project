import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// 原创扩展街区；保留上游雨夜风格，未复制其城市模型。
export function createDistrict(scene, { box, sign, materials, emissive, lamp, collider }) {
  const lime = emissive('#90ecc5', 2.5, 0);
  const pink = emissive('#e86dad', 2.5, 1);
  const amber = emissive('#eac17a', 2.8, 2);
  const windowLight = emissive('#bbc7d6', .25, 3);
  const produce = new THREE.MeshStandardNodeMaterial({ color: '#859b60', roughness: .7 });
  const crates = new THREE.MeshStandardNodeMaterial({ color: '#a27e54', roughness: .85 });
  const landmarks = {
    street: { name: '霓虹街口', position: [3.2, 1.65, 9], target: [0, 1.8, -22] },
    market: { name: '雨夜市集', position: [22, 1.65, -25], target: [22, 2.5, -31] },
    transit: { name: '夜航站台', position: [-23, 1.65, -25], target: [-27, 2.4, -30] },
    shelter: { name: '避雨亭', position: [-4.5, 1.65, -3.5], target: [0, 1.8, -8] },
  };
  // 横街与两排建筑形成可实际穿行的十字路口。
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = side * (17 + i * 7); const h = 8 + i % 3 * 5;
    for (const z of [-34, -16]) {
      box([6.8, h, 8], [x, h / 2, z], materials.concrete); collider([6.8, h, 8], [x, h / 2, z]);
      box([6.9, .3, 8.1], [x, 4, z], materials.metal);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++)
        box([.7, 1.1, .035], [x - 2 + col * 2, 5.6 + row * 2.3, z + (z === -34 ? 4.02 : -4.02)], (col + row + i) % 3 ? windowLight : materials.black);
    }
  }
  for (const x of [-44, 44]) { box([.4, 7, 18], [x, 3.5, -25], materials.concrete); collider([.4, 7, 18], [x, 3.5, -25]); }
  collider([90, 5, .2], [0, 2.5, 16]); collider([90, 5, .2], [0, 2.5, -60]);
  // 市集：遮雨棚、摊台、灯笼与箱子，留出中间通道。
  sign('夜雨市集', 'RAIN MARKET / 24H', '#f9cf8d', [22, 4.1, -29.7], [7.5, 1.6], 0, false, 2);
  for (const x of [17, 25, 32]) {
    box([5.2, .16, 3], [x, 3.3, -28.8], materials.metal);
    box([5.25, .06, .08], [x, 3.42, -27.2], amber);
    box([4.2, .9, 1.1], [x, .6, -28.5], materials.metal); collider([4.2, 1.2, 1.1], [x, .6, -28.5]);
    for (const dx of [-2.2, 2.2]) { box([.12, 3.3, .12], [x + dx, 1.65, -27.7], materials.metal); collider([.16, 3.3, .16], [x + dx, 1.65, -27.7]); }
    for (let j = 0; j < 4; j++) {
      box([.7, .35, .6], [x - 1.4 + j * .9, 1.3, -28.5], j % 2 ? crates : produce);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), pink); lantern.scale.y = 1.4; lantern.position.set(x - 1.6 + j, 2.8, -27.5); scene.add(lantern);
    }
  }
  lamp([22, 3.4, -26], '#efb773', 24, 16, 2);
  // 公交站、售货机和站牌。
  box([9, .18, 3.5], [-26, 3.5, -28.2], materials.metal);
  for (const x of [-30, -22]) { box([.2, 3.5, .2], [x, 1.75, -28.1], materials.metal); collider([.2, 3.5, .2], [x, 1.75, -28.1]); }
  box([5.5, .18, .8], [-26, .6, -28.6], materials.metal); collider([5.5, .9, .8], [-26, .45, -28.6]);
  sign('夜航站', 'LAST TRAIN / 02:40', '#79ddd8', [-26, 3.9, -28.2], [6, 1.3], 0, false, 0);
  box([1.3, 2.4, .9], [-32, 1.2, -28.4], materials.metal); collider([1.3, 2.4, .9], [-32, 1.2, -28.4]);
  sign('饮料', 'HOT / COLD', '#e58db3', [-32, 1.5, -27.9], [1.1, 1.6], 0, false, 1);
  lamp([-26, 3, -26], '#76d9cc', 23, 15, 0);
  // 架空管道和曲线电缆。
  for (const z of [-11, -40]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-6.5, 8.5, z), new THREE.Vector3(0, 7.3, z), new THREE.Vector3(6.5, 8.5, z)]);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .035, 4, false), materials.black));
    box([13, .15, .2], [0, 11, z], materials.metal);
  }
  // 原创动态招牌：低频纹理更新，无外部视频文件。
  const adCanvas = document.createElement('canvas'); adCanvas.width = 512; adCanvas.height = 256;
  const ctx = adCanvas.getContext('2d'); const adTexture = new THREE.CanvasTexture(adCanvas); adTexture.colorSpace = THREE.SRGBColorSpace;
  const adMat = new THREE.MeshStandardNodeMaterial({ map: adTexture, emissiveMap: adTexture, emissive: '#ffffff', emissiveIntensity: 1.2, roughness: .8 });
  const ad = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3), adMat); ad.position.set(4.8, 7.6, -20); ad.rotation.y = -.28; scene.add(ad);
  // 蒸汽采用 18 个小平面；在高度通道中排除，不成为假屋顶。
  const fx = new THREE.Group(); scene.add(fx);
  const smokeCanvas = document.createElement('canvas'); smokeCanvas.width = smokeCanvas.height = 64;
  const smokeCtx = smokeCanvas.getContext('2d'); const gradient = smokeCtx.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(130,170,175,.25)'); gradient.addColorStop(1, 'rgba(130,170,175,0)'); smokeCtx.fillStyle = gradient; smokeCtx.fillRect(0, 0, 64, 64);
  const smokeTexture = new THREE.CanvasTexture(smokeCanvas);
  const puffs = [];
  for (let i = 0; i < 18; i++) {
    const mat = new THREE.MeshBasicNodeMaterial({ map: smokeTexture, transparent: true, depthWrite: false, opacity: .25 });
    const puff = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); fx.add(puff); puffs.push(puff);
  }
  // 飞行器独立循环，不参与行人碰撞和降雨高度图。
  const aircraft = new THREE.Group(); scene.add(aircraft);
  const hull = new THREE.Mesh(new RoundedBoxGeometry(6, .9, 2.6, 2, .3), materials.metal); aircraft.add(hull);
  box([6.1, .08, .07], [0, 0, 1.3], pink, aircraft); box([6.1, .08, .07], [0, 0, -1.3], lime, aircraft);
  let time = 0; let adFrame = -1;
  return { landmarks, hideFromHeight: [fx, aircraft], update(delta, camera) {
    time += delta;
    const frame = Math.floor(time * 6);
    if (frame !== adFrame) {
      adFrame = frame; ctx.fillStyle = '#061927'; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#50dcc0'; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const x = (i * 95 + time * 24) % 620 - 60; ctx.strokeRect(x, 30 + i % 3 * 20, 120, 140); }
      ctx.fillStyle = '#e9b6d8'; ctx.font = 'bold 56px Microsoft YaHei,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('夜城信号', 256, 125);
      ctx.font = '20px monospace'; ctx.fillStyle = '#8bead1'; ctx.fillText(`NEON / LIVE ${String(frame % 100).padStart(2, '0')}`, 256, 175); adTexture.needsUpdate = true;
    }
    aircraft.position.set(Math.sin(time * .07) * 35, 21 + Math.sin(time * .23), -30); aircraft.rotation.y = Math.sin(time * .07) > 0 ? 0 : Math.PI;
    puffs.forEach((puff, i) => {
      const phase = (time * .13 + i / 9) % 1; const side = i < 9 ? -1 : 1;
      puff.position.set(side * 4.9 + Math.sin(i * 9 + phase * 3) * .4, .3 + phase * 3.3, -12 - (i < 9 ? 0 : 13));
      puff.scale.setScalar(.6 + phase * 1.8); puff.quaternion.copy(camera.quaternion); puff.material.opacity = .55 * Math.sin(phase * Math.PI);
    });
  }, dispose() { adTexture.dispose(); smokeTexture.dispose(); } };
}
