import * as THREE from 'three/webgpu';
import { createCollisionHeight } from './upstream/createCollisionHeight.js';
import { createCollisionRain } from './effects/rain.js';

document.querySelector('#run').addEventListener('click', async () => {
  const output = document.querySelector('#result');
  const button = document.querySelector('#run'); button.disabled = true;
  const report = { backend: null, cases: [], passed: false };
  let renderer; let rain; let height;
  try {
    output.textContent = '初始化计算着色器…';
    renderer = new THREE.WebGPURenderer({ canvas: document.querySelector('#verify-canvas') });
    renderer.setSize(240, 200, false); await renderer.init();
    report.backend = renderer.backend.isWebGLBackend ? 'WebGL2' : 'WebGPU';
    if (report.backend !== 'WebGPU') throw new Error('此检查要求 WebGPU；当前兼容后端不作为验证结果。');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1.2, .1, 40); camera.position.set(0, 8, 0); camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight('#ffffff', '#556677', 2));
    const ground = new THREE.Mesh(new THREE.BoxGeometry(12, .1, 12), new THREE.MeshStandardNodeMaterial({ color: '#304455' })); ground.position.y = -.05; scene.add(ground);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4, .2, 4), new THREE.MeshStandardNodeMaterial({ color: '#d2ec8f' })); roof.position.y = 3; scene.add(roof);
    height = createCollisionHeight({ scene, renderer, width: 12, height: 12, cameraHeight: 12, depth: 20, resolution: 64 });
    height.update({ camera }); height.update({ camera });
    rain = await createCollisionRain({ scene, renderer, collisionHeight: height, camera, count: 1000, rainArea: { width: 8, height: 8 } });
    for (const mode of [true, false, true]) {
      roof.visible = mode;
      height.update({ camera, hideObjects: [rain.group] }); height.update({ camera, hideObjects: [rain.group] });
      for (let frame = 0; frame < 240; frame++) rain.update(1 / 60, camera);
      const { data, stride, count } = await rain.readPositions();
      const pixel = await renderer.readRenderTargetPixelsAsync(height.renderTarget, 32, 32, 1, 1);
      const floorY = THREE.DataUtils.fromHalfFloat(pixel[1]);
      let inside = 0; let belowRoof = 0;
      for (let i = 0; i < count; i++) {
        const x = data[i * stride]; const y = data[i * stride + 1]; const z = data[i * stride + 2];
        if (Math.abs(x) < 1.6 && Math.abs(z) < 1.6) { inside++; if (y < 3.0) belowRoof++; }
      }
      const passed = inside > 10 && (mode ? Math.abs(floorY - 3.1) < .03 && belowRoof === 0 : Math.abs(floorY) < .03 && belowRoof > 0);
      report.cases.push({ roofEnabled: mode, heightAtCenter: Number(floorY.toFixed(3)), particlesInsideRoofFootprint: inside, particlesBelowRoof: belowRoof, passed });
      output.textContent = JSON.stringify(report, null, 2);
    }
    report.passed = report.cases.every(c => c.passed);
    output.textContent = `${report.passed ? '检查通过' : '检查未通过'}\n${JSON.stringify(report, null, 2)}`;
    document.body.dataset.result = report.passed ? 'passed' : 'failed';
  } catch (error) {
    output.textContent = `检查失败：${error.message}\n${JSON.stringify(report, null, 2)}`;
    document.body.dataset.result = 'failed'; console.error(error);
  } finally { rain?.dispose(); height?.dispose(); renderer?.dispose(); button.disabled = false; }
});
