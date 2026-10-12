import * as THREE from 'three/webgpu';

function seededRandom(seed = 1299) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

// 原创程序化纹理，替换上游 public/ 的摄影素材。
export function createWetTextures() {
  const random = seededRandom();
  const canvases = Array.from({ length: 3 }, () => Object.assign(document.createElement('canvas'), { width: 256, height: 256 }));
  const contexts = canvases.map(c => c.getContext('2d'));
  const images = contexts.map(c => c.createImageData(256, 256));
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const noise = random();
      const grain = 14 + noise * 9;
      const puddle = (Math.sin(x * 0.032 + Math.sin(y * .029) * 2) + Math.cos(y * .048)) * .22 + .48;
      const seam = x % 64 < 2 || y % 64 < 2;
      images[0].data.set([grain * (seam ? .5 : 1), grain * 1.1, grain * 1.2, 255], i);
      const roughness = Math.max(30, Math.min(220, puddle * 180 + noise * 20));
      images[1].data.set([roughness, roughness, roughness, 255], i);
      images[2].data.set([128 + (noise - .5) * 5, 128 + (random() - .5) * 5, 255, 255], i);
    }
  }
  contexts.forEach((c, i) => c.putImageData(images[i], 0, 0));
  const maps = canvases.map(c => new THREE.CanvasTexture(c));
  maps[0].colorSpace = THREE.SRGBColorSpace;
  return { albedoMap: maps[0], roughnessMap: maps[1], normalMapTex: maps[2] };
}

// 五帧原创水花图集，亮度作为掩码，接口兼容上游雨滴绘制。
export function createSplashTexture() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 64;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 320, 64);
  for (let frame = 0; frame < 5; frame++) {
    const x = frame * 64 + 32; const radius = 7 + frame * 4;
    ctx.strokeStyle = `rgba(255,255,255,${1 - frame * .14})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, 47 - frame * 2, radius, radius * .28, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI * (i / 6);
      ctx.fillStyle = `rgba(255,255,255,${.85 - frame * .12})`;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(angle) * radius, 43 - Math.sin(angle) * (10 + frame * 3), 1, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
