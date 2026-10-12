/**
 * Battledress trouser pockets (the shared UniformSpec only knows tunic pockets): the large map
 * pocket on the front of the left thigh and the small field-dressing pocket at the right front
 * hip, both patch pockets with a straight flap, built as conforming patches on the posed trouser
 * surface (garment toolkit: surfaceFrame + surfaceChart + patchLayer), meshed at the detail cell.
 * Meshes are cached per soldier heavy build (keyed by the trouser field).
 */
import * as THREE from 'three';
import type { SoldierBuild } from '../../shared/human/soldier';
import { surfaceChart, surfaceFrame, patchLayer, rect2, chartBounds } from '../../shared/human/garment';
import { clothMaterial } from '../../shared/human/uniform';
import { meshSDF } from '../../shared/human/mesh';
import { simplify } from '../../shared/human/simplify';
import type { Frame, SDF } from '../../shared/human/sdfx';
import { BD_TROUSER_CLOTH } from './uniform';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

interface PocketDef {
  w: number;
  h: number;
  flapH: number;
  budget: number;
}

function pocketGeometry(field: SDF, fr: Frame, p: PocketDef, s: number): THREE.BufferGeometry {
  const w = p.w * s, h = p.h * s;
  const chart = surfaceChart(field, fr, w / 2 + 0.012 * s, h / 2 + 0.012 * s, 0.0035 * s, 0.07 * s);
  const tP = 0.0025 * s;
  const body = patchLayer(chart, (u, v) => rect2(u, v, 0, 0, w / 2, h / 2, 0.006 * s), tP, 0.003 * s, 0.0009 * s);
  const fh = p.flapH * s, fw = w / 2 + 0.004 * s, top = h / 2 + 0.006 * s;
  const flap = patchLayer(chart, (u, v) => Math.max(Math.abs(u) - fw, v - top, top - fh + 0.002 * s * (u / fw) ** 2 - v), tP * 2.15, 0.0015 * s, 0.001 * s);
  const f: SDF = (x, y, z) => Math.min(body(x, y, z), flap(x, y, z));
  const b = chartBounds(fr, -w / 2 - 0.01 * s, w / 2 + 0.01 * s, -h / 2 - 0.01 * s, h / 2 + 0.012 * s, -0.028 * s, 0.012 * s);
  const g = meshSDF(f, b, 0.0028 * s, { project: 1, keep: (x, y, z) => chart.sdf(x, y, z) > -0.0015 * s });
  return simplify(g, p.budget, { maxError: 0.0009 });
}

const cache = new WeakMap<SDF, THREE.BufferGeometry[]>();

/** Map pocket (left thigh) + field-dressing pocket (right front hip), asset space. */
export function trouserPockets(sol: SoldierBuild): THREE.Mesh[] {
  const F = sol.uniform.fields;
  let geos = cache.get(F.trousers);
  if (!geos) {
    const sk = sol.pose.sk, s = sk.s, fit = sol.fit;
    geos = [];
    // map pocket: front of the left thigh, turned a little to the outside; centre 0.2 m below the hip
    {
      const L = sk.leg.l;
      const down = L.knee.clone().sub(L.hip).normalize();
      const up = down.clone().negate();
      const fwd = sk.pelvis.z.clone().addScaledVector(up, -sk.pelvis.z.dot(up)).normalize();
      const out = new THREE.Vector3().crossVectors(up, fwd).normalize(); // +X side = the left
      const dir = fwd.clone().multiplyScalar(Math.cos(24 * D2R)).addScaledVector(out, Math.sin(24 * D2R)).normalize();
      const c = L.hip.clone().addScaledVector(down, 0.215 * s);
      const fr = surfaceFrame(F.trousers, c.clone().addScaledVector(dir, 0.14 * s), up, dir);
      geos.push(pocketGeometry(F.trousers, fr, { w: 0.165, h: 0.19, flapH: 0.058, budget: 1500 }, s));
    }
    // field-dressing pocket: right front hip just below the blouse
    {
      const hgt = 0.9;
      const dir = fit.trunkDir(-40, hgt);
      const up = fit.trunkUp(hgt);
      const o = fit.axisPoint(hgt);
      const fr = surfaceFrame(F.trousers, o.clone().addScaledVector(dir, 0.3 * s), up, dir);
      geos.push(pocketGeometry(F.trousers, fr, { w: 0.1, h: 0.11, flapH: 0.042, budget: 900 }, s));
    }
    cache.set(F.trousers, geos);
  }
  const mat = clothMaterial(BD_TROUSER_CLOTH);
  return geos.map((g, i) => {
    const m = new THREE.Mesh(g, mat);
    m.name = i === 0 ? 'pocket-map-l' : 'pocket-dressing-r';
    return m;
  });
}

void V;
