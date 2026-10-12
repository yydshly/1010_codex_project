import * as THREE from 'three/webgpu';
export { createWetTextures, createSplashTexture } from '../../modules/rain-kit/internal/textures.js';

export function makeSignTexture(text, subtitle, color, vertical = false) {
  const c = document.createElement('canvas');
  c.width = vertical ? 192 : 768; c.height = vertical ? 640 : 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a1519'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowBlur = 12; ctx.shadowColor = color;
  if (vertical) {
    ctx.font = 'bold 112px "Microsoft YaHei", sans-serif';
    [...text].forEach((char, i) => ctx.fillText(char, 96, 100 + i * 135));
    ctx.font = '22px Consolas, monospace'; ctx.fillText(subtitle, 96, 600);
  } else {
    ctx.font = 'bold 96px "Microsoft YaHei", sans-serif'; ctx.fillText(text, 384, 116);
    ctx.shadowBlur = 0; ctx.font = '24px Consolas, monospace'; ctx.fillText(subtitle, 384, 202);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
