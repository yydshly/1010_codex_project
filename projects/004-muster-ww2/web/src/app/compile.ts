/**
 * Shader programs compiled off the main thread (KHR_parallel_shader_compile via
 * renderer.compileAsync) before a model is first drawn, so adding a model or rendering a
 * library preview never freezes the page on a long compile.
 *
 * The Studio draws through post-processing (N8AO renders the scene into a render target),
 * where three.js uses different program variants than for the canvas (no tone mapping,
 * linear output). A small render target is bound during compile so exactly the variants the
 * real frame needs are prepared - otherwise the real ones would still compile on first draw.
 */
import * as THREE from 'three';
import type { Studio } from '../core/studio';

const targets = new WeakMap<THREE.WebGLRenderer, THREE.WebGLRenderTarget>();

export async function compileOffThread(studio: Studio, object: THREE.Object3D = studio.scene): Promise<void> {
  const r = studio.renderer;
  if (typeof r.compileAsync !== 'function') return;
  let rt = targets.get(r);
  if (!rt) {
    rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    targets.set(r, rt);
  }
  const prev = r.getRenderTarget();
  let pending: Promise<unknown>;
  try {
    r.setRenderTarget(rt);
    pending = r.compileAsync(object, studio.camera, studio.scene);
  } finally {
    r.setRenderTarget(prev);
  }
  // never wait forever (e.g. a lost context): the first draw then compiles what is left
  let timer = 0;
  await Promise.race([pending, new Promise((resolve) => (timer = window.setTimeout(resolve, COMPILE_WAIT_MS)))]);
  clearTimeout(timer);
}

const COMPILE_WAIT_MS = 20000;
