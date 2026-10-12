// 本机 WebGPU 兼容适配，接口对应固定上游 createVideoTexture.js。
// 视频内容仍来自被忽略的 vendor/；此文件不包含上游视频素材。
import * as THREE from 'three/webgpu';
export function createVideoTexture(src, { autoplay = true } = {}) {
  const video = document.createElement('video'); video.src = src; video.muted = true; video.loop = true; video.playsInline = true; video.crossOrigin = 'anonymous';
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = false; texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter;
  let disposed = false; let frameId; let timer; let last = -1;
  function draw() {
    if (disposed || video.readyState < 2 || performance.now() - last < 1000 / 12) return;
    last = performance.now(); const scale = Math.min(1, 512 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale)); const height = Math.max(1, Math.round(video.videoHeight * scale));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.drawImage(video, 0, 0, width, height); texture.needsUpdate = true;
  }
  function tick() { if (disposed) return; draw(); frameId = video.requestVideoFrameCallback(tick); }
  video.addEventListener('loadeddata', draw);
  if (video.requestVideoFrameCallback) frameId = video.requestVideoFrameCallback(tick); else timer = setInterval(draw, 1000 / 12);
  function play() { video.play().catch(() => {}); }
  function pause() { video.pause(); }
  function dispose() { disposed = true; pause(); if (frameId !== undefined) video.cancelVideoFrameCallback?.(frameId); clearInterval(timer); video.removeAttribute('src'); video.load(); texture.dispose(); }
  if (autoplay) play(); return { texture, video, play, pause, dispose };
}
