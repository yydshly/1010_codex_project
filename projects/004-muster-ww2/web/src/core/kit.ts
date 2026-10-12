/**
 * Modelling kit: one import for asset authors.
 *
 *   import { THREE, M, G, S, sdfMesh, part, group, mirrorX } from '../../core/kit';
 */
import * as THREE from 'three';
import { M } from './materials/library';
import * as G from './geo/shapes';
import { S, sdfMesh, smin } from './geo/sdf';
import { canvasTexture } from './materials/textures';
import { rng, fbm3, valueNoise3 } from './materials/noise';

export { THREE, M, G, S, sdfMesh, smin, canvasTexture, rng, fbm3, valueNoise3 };

export interface Placement {
  /** position */
  p?: G.V3 | THREE.Vector3;
  /** rotation, Euler XYZ in DEGREES */
  r?: G.V3;
  /** uniform or per-axis scale */
  s?: number | G.V3;
  name?: string;
}

function place(o: THREE.Object3D, pl: Placement = {}) {
  if (pl.p) Array.isArray(pl.p) ? o.position.set(...pl.p) : o.position.copy(pl.p);
  if (pl.r) o.rotation.set(G.deg(pl.r[0]), G.deg(pl.r[1]), G.deg(pl.r[2]));
  if (pl.s !== undefined) typeof pl.s === 'number' ? o.scale.setScalar(pl.s) : o.scale.set(...pl.s);
  if (pl.name) o.name = pl.name;
  return o;
}

/** Positioned mesh from a geometry + material. */
export function part(geometry: THREE.BufferGeometry, material: THREE.Material, pl: Placement = {}): THREE.Mesh {
  return place(new THREE.Mesh(geometry, material), pl) as THREE.Mesh;
}

/** Positioned group of children. */
export function group(children: THREE.Object3D[] = [], pl: Placement = {}): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return place(g, pl) as THREE.Group;
}

/**
 * Mirror an object across the asset's YZ plane (X -> -X) and return a group holding
 * the original AND its mirror. The baker fixes the winding of mirrored parts.
 */
export function mirrorX(obj: THREE.Object3D, keepOriginal = true): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Group();
  m.scale.x = -1;
  m.add(obj.clone(true));
  if (keepOriginal) g.add(obj);
  g.add(m);
  return g;
}

/** A flat decal quad (markings). Faces +Z in its local frame; place it just off a surface. */
export function decal(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  pl: Placement = {},
  px = 512,
): THREE.Mesh {
  const tex = canvasTexture(px, height / width, draw);
  const mat = M.decal(tex, { key });
  const geo = new THREE.PlaneGeometry(width, height);
  const mesh = part(geo, mat, pl);
  mesh.userData.noEdge = true;
  return mesh;
}

/** Bounding box of an object in its parent's frame. */
export function boundsOf(o: THREE.Object3D): THREE.Box3 {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o, true);
}

/** Translate an object so its lowest point sits exactly on y = 0. */
export function groundIt<T extends THREE.Object3D>(o: T): T {
  const b = boundsOf(o);
  o.position.y -= b.min.y;
  return o;
}
