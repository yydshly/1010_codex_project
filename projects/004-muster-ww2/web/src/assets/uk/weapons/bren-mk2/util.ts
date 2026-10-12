/**
 * Small geometry utility for the Bren parts.
 *
 * The bake computes edge wear / cavity per vertex. A large flat face whose only vertices lie on its
 * (bevelled) border inherits the border's wear across the whole face, which reads as grey clouds on
 * the black steel. tessellate() adds interior vertices to the LARGE faces only: every triangle of the
 * plate faces (normal along `capAxis`, e.g. the thickness axis of a plateZY slab) and every other
 * triangle that is not a thin bevel strip (shortest altitude above `minH`). Thin strips along the edges
 * are left as they are, so the triangle count stays modest.
 */
import * as THREE from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function tessellate(g: THREE.BufferGeometry, maxEdge = 0.008, capAxis: [number, number, number] | null = [1, 0, 0], minH = 0.0025): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  const names = Object.keys(src.attributes);
  const pos = src.attributes.position;
  const nTri = pos.count / 3;
  const big: number[] = [], small: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  const ax = capAxis ? new THREE.Vector3(...capAxis).normalize() : null;
  for (let t = 0; t < nTri; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac);
    const area2 = n.length();
    const lmax = Math.max(ab.length(), ac.length(), b.distanceTo(c));
    const h = lmax > 0 ? area2 / lmax : 0;
    const isCap = ax !== null && area2 > 0 && Math.abs(n.dot(ax)) / area2 > 0.995;
    (lmax > maxEdge && (isCap || h > minH) ? big : small).push(t);
  }
  if (!big.length) return src;
  const pick = (tris: number[]) => {
    const out = new THREE.BufferGeometry();
    for (const name of names) {
      const at = src.attributes[name] as THREE.BufferAttribute;
      const k = at.itemSize;
      const arr = new Float32Array(tris.length * 3 * k);
      tris.forEach((t, i) => {
        for (let v = 0; v < 3; v++) for (let j = 0; j < k; j++) arr[(i * 3 + v) * k + j] = at.array[(t * 3 + v) * k + j];
      });
      out.setAttribute(name, new THREE.BufferAttribute(arr, k));
    }
    return out;
  };
  const fine = new TessellateModifier(maxEdge, 10).modify(pick(big));
  for (const name of Object.keys(fine.attributes)) if (!names.includes(name)) fine.deleteAttribute(name);
  const parts = small.length ? [pick(small), fine] : [fine];
  const merged = mergeGeometries(parts, false) ?? src;
  merged.computeBoundingBox();
  return merged;
}

/**
 * Axis-aligned box between two corners with its faces split into a grid of about `cell` metres (cheap
 * interior vertices, so the baked edge wear stays on the edges of large flat faces).
 */
export function gridBox(min: [number, number, number], max: [number, number, number], cell = 0.009): THREE.BufferGeometry {
  const w = max[0] - min[0], h = max[1] - min[1], d = max[2] - min[2];
  const s = (l: number) => Math.max(1, Math.round(l / cell));
  const g = new THREE.BoxGeometry(w, h, d, s(w), s(h), s(d));
  g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  return g;
}
