/**
 * Display ground.
 *  - 'plinth': the main display - a low diorama base with a dark satin-lacquered frame (crisp
 *              45 deg chamfer, recessed foot) holding a layer of grey-brown compacted earth with
 *              fine sand, sparse grit/gravel and very restrained short grass. The soil top is
 *              y = 0 everywhere inside PLINTH (flat, so every model sits exactly on it); all
 *              soil variation is albedo / normal detail only. Around it a calm, seamless
 *              dark-warm studio void (the floor fades into the background colour, no horizon).
 *  - 'studio': neutral seamless backdrop with a shadow-catching floor (thumbnails / harness).
 *  - 'none'  : background only.
 */
import * as THREE from 'three';
import { surface } from '../materials/surface';
import { rng } from '../materials/noise';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type GroundMode = 'plinth' | 'studio' | 'none';

/** Usable display area (metres). Models may be placed anywhere inside. */
export const PLINTH = { w: 72, l: 48, height: 0.9, margin: 0.6 };

/** Width of the lacquered frame band around the soil (outside PLINTH.w x PLINTH.l). */
const FRAME_W = 0.55;
/** Studio void colour: the background and the far studio floor match it exactly. */
const VOID = '#2a2724';

export interface GroundHandle {
  object: THREE.Object3D;
  background: THREE.Texture;
  /** Objects that placement raycasts should hit (the soil top). */
  pickable: THREE.Object3D[];
  /** Clamp a point to the placeable area (xz). */
  clamp(p: THREE.Vector3, pad?: number): THREE.Vector3;
}

function gradientTexture(top: string, bottom: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildGround(mode: GroundMode): GroundHandle {
  const root = new THREE.Group();
  root.name = 'ground';
  const pickable: THREE.Object3D[] = [];

  if (mode === 'studio' || mode === 'none') {
    const bg = gradientTexture('#6f6b64', '#3f3c38');
    if (mode === 'studio') {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
        new THREE.ShadowMaterial({ color: 0x1a1612, opacity: 0.42 }),
      );
      floor.receiveShadow = true;
      floor.name = 'shadow-floor';
      root.add(floor);
      pickable.push(floor);
    }
    return {
      object: root,
      background: bg,
      pickable,
      clamp: (p) => p,
    };
  }

  // --- plinth ---
  const { w, l, height } = PLINTH;

  // Soil: a single flat plane at y = 0 (exactly PLINTH.w x PLINTH.l; the frame's inner wall
  // meets its edge). Broad patches come from the surface shader's colour variation; fine sand,
  // grit and ~0.4 m damp/dry mottling are added below, band-limited so they never shimmer.
  const soil = soilMaterial();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2), soil);
  top.receiveShadow = true;
  top.name = 'soil';
  root.add(top);
  pickable.push(top);

  // Frame: dark satin lacquer, crisp outer chamfer, fine inner chamfer against the soil,
  // recessed foot that lifts the base off the studio floor with a clean shadow line.
  const frame = new THREE.Mesh(
    frameGeometry(w + 2 * FRAME_W, l + 2 * FRAME_W, [
      [FRAME_W, -0.08],
      [FRAME_W, -0.01],
      [FRAME_W - 0.01, 0],
      [0.12, 0],
      [0, -0.12],
      [0, -height + 0.1],
      [0.015, -height + 0.085],
      [0.1, -height + 0.085],
      [0.1, -height],
      [0.5, -height],
    ]),
    surface({
      name: 'plinth-frame',
      color: 0x211d1a,
      roughness: 0.38,
      colorVar: 0.025,
      varScale: 1.5,
      roughVar: 0.06,
      clearcoat: 0.35,
      clearcoatRoughness: 0.32,
      detail: 'fine',
      detailSize: 0.4,
      detailStrength: 0.12,
      cavity: 0,
    }),
  );
  frame.name = 'plinth-frame';
  frame.castShadow = true;
  frame.receiveShadow = true;
  root.add(frame);

  // Studio floor around the base: lit near the plinth, fading into the void colour.
  const floor = voidFloor();
  floor.position.y = -height - 0.002;
  root.add(floor);

  // Sparse grit & pebbles and very restrained grass - merged per material.
  root.add(scatterPebbles(w, l));
  root.add(scatterGrass(w, l));

  const bg = gradientTexture(VOID, VOID);
  const hw = w / 2 - PLINTH.margin, hl = l / 2 - PLINTH.margin;
  return {
    object: root,
    background: bg,
    pickable,
    clamp: (p, pad = 0) => {
      p.x = THREE.MathUtils.clamp(p.x, -hw + pad, hw - pad);
      p.z = THREE.MathUtils.clamp(p.z, -hl + pad, hl - pad);
      return p;
    },
  };
}

/** Grey-brown compacted earth. */
function soilMaterial(): THREE.MeshStandardMaterial {
  const mat = surface({
    name: 'soil',
    color: 0x5b5349,
    roughness: 0.95,
    colorVar: 0.09,
    varScale: 0.085,
    roughVar: 0.04,
    detail: 'soil',
    detailSize: 0.42,
    detailStrength: 0.75,
    bump: 0.22,
    bumpScale: 38,
    cavity: 0,
  });
  // Fine sand speckle, sparse light/dark grit and gentle 0.4 m mottling. Each band fades out
  // (to its mean) before a pixel covers it, so distant soil stays calm - no moire/shimmer.
  const GRAIN = /* glsl */ `
  {
    vec2 sp = vSrfPos.xz;
    float px = max(length(fwidth(sp)), 1e-6);
    float a1 = 1.0 - smoothstep(0.0012, 0.0035, px);
    float a2 = 1.0 - smoothstep(0.0005, 0.0014, px);
    float a3 = 1.0 - smoothstep(0.0025, 0.008, px);
    float s1 = srfNoise(vec3(sp * 310.0, 1.7)) - 0.5;
    float s2 = srfNoise(vec3(sp.yx * 790.0, 4.1)) - 0.5;
    float gN = srfNoise(vec3(sp * 140.0, 7.3));
    float gH = srfNoise(vec3(sp * 23.0, 2.9));
    float lightGrit = smoothstep(0.84, 0.9, gN) * smoothstep(0.35, 0.7, gH);
    float darkGrit = (1.0 - smoothstep(0.1, 0.16, gN)) * smoothstep(0.3, 0.65, 1.0 - gH);
    diffuseColor.rgb *= 1.0 + s1 * 0.24 * a1 + s2 * 0.2 * a2;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.42, 1.4, 1.36), lightGrit * a3);
    diffuseColor.rgb *= 1.0 - darkGrit * a3 * 0.32;
    float m = srfNoise(vec3(sp * 2.4, 3.3)) * 0.6 + srfNoise(vec3(sp * 6.1, 8.8)) * 0.4;
    diffuseColor.rgb *= mix(0.94, 1.05, m);
  }
  `;
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    base.call(mat, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', GRAIN + '\n#include <roughnessmap_fragment>');
  };
  mat.customProgramCacheKey = () => 'srf-soil-v2';
  return mat;
}

/**
 * Sweep a moulding profile around a W x L rectangle with mitred corners. Profile points are
 * (inset from the outer edge, y), traversed from the inner edge over the top to the underside.
 * Facets are flat-shaded so chamfers read crisp.
 */
function frameGeometry(W: number, L: number, prof: [number, number][]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const corner = (k: number, d: number, y: number) => {
    const hx = W / 2 - d, hz = L / 2 - d;
    const c = [
      [-hx, hz],
      [hx, hz],
      [hx, -hz],
      [-hx, -hz],
    ][k % 4];
    return new THREE.Vector3(c[0], y, c[1]);
  };
  const outward = [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0)];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < prof.length - 1; i++) {
    const [da, ya] = prof[i], [db, yb] = prof[i + 1];
    // profile tangent in (outward, up) space; outward normal of a clockwise traversal
    const te = -(db - da), ty = yb - ya;
    const len = Math.hypot(te, ty) || 1;
    for (let k = 0; k < 4; k++) {
      const n = outward[k].clone().multiplyScalar(-ty / len).add(new THREE.Vector3(0, te / len, 0)).normalize();
      const A0 = corner(k, da, ya), A1 = corner(k + 1, da, ya), B1 = corner(k + 1, db, yb), B0 = corner(k, db, yb);
      e1.subVectors(A1, A0);
      e2.subVectors(B0, A0);
      c.crossVectors(e1, e2);
      const tris = c.dot(n) >= 0 ? [A0, A1, B0, A1, B1, B0] : [A0, B0, A1, A1, B0, B1];
      for (const v of tris) {
        pos.push(v.x, v.y, v.z);
        nor.push(n.x, n.y, n.z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/** Studio floor: dark warm, lit near the base, fading seamlessly into the void colour. */
function voidFloor(): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({ color: 0x312d29, roughness: 0.9, metalness: 0 });
  const voidColor = new THREE.Color(VOID);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uVoid = { value: voidColor };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFloorW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFloorW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFloorW;\nuniform vec3 uVoid;')
      .replace(
        '#include <opaque_fragment>',
        '#include <opaque_fragment>\n{ float f = smoothstep(44.0, 170.0, length(vFloorW.xz * vec2(0.8, 1.0))); gl_FragColor.rgb = mix(gl_FragColor.rgb, uVoid, f); }',
      );
  };
  mat.customProgramCacheKey = () => 'void-floor-v1';
  const floor = new THREE.Mesh(new THREE.CircleGeometry(700, 96).rotateX(-Math.PI / 2), mat);
  floor.receiveShadow = true;
  floor.name = 'studio-floor';
  return floor;
}

function rockGeometry(seed: number, detail: number): THREE.BufferGeometry {
  const r = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(0.75 + r() * 0.4);
    p.setXYZ(i, v.x, v.y * 0.55, v.z);
  }
  g.computeVertexNormals();
  g.deleteAttribute('uv');
  return g;
}

function scatterPebbles(w: number, l: number): THREE.Object3D {
  const r = rng(7);
  const small = [rockGeometry(1, 0), rockGeometry(2, 0), rockGeometry(3, 0)];
  const large = [rockGeometry(4, 1), rockGeometry(5, 1)];
  // stone colours close to the soil's value so distant gravel never reads as white specks
  const mats = [
    surface({ name: 'pebble-grey', color: 0x6d6862, roughness: 0.82, colorVar: 0.18, varScale: 40, cavity: 0 }),
    surface({ name: 'pebble-brown', color: 0x66584a, roughness: 0.86, colorVar: 0.2, varScale: 40, cavity: 0 }),
    surface({ name: 'pebble-dark', color: 0x4a4540, roughness: 0.8, colorVar: 0.15, varScale: 40, cavity: 0 }),
  ];
  const buckets: THREE.BufferGeometry[][] = [[], [], []];
  const count = 7000;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3();
  const e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const size = 0.004 + Math.pow(r(), 3.2) * 0.03;
    // partly embedded in the soil
    t.set((r() - 0.5) * (w - 0.2), size * 0.06, (r() - 0.5) * (l - 0.2));
    q.setFromEuler(e.set(r() * 0.4, r() * Math.PI * 2, r() * 0.4));
    s.set(size, size, size * (0.7 + r() * 0.6));
    m.compose(t, q, s);
    const src = size > 0.013 ? large[i % 2] : small[i % 3];
    buckets[i % 3].push(src.clone().applyMatrix4(m));
  }
  const grp = new THREE.Group();
  grp.name = 'pebbles';
  buckets.forEach((b, i) => {
    const mesh = new THREE.Mesh(mergeGeometries(b)!, mats[i]);
    mesh.receiveShadow = true;
    grp.add(mesh);
  });
  return grp;
}

function scatterGrass(w: number, l: number): THREE.Object3D {
  const r = rng(99);
  const blades: THREE.BufferGeometry[] = [];
  // a few natural patches plus isolated tufts - never a carpet
  const centres: [number, number, number][] = [];
  for (let i = 0; i < 46; i++) centres.push([(r() - 0.5) * (w - 2), (r() - 0.5) * (l - 2), 0.4 + r() * 1.6]);
  const palette = [0x857a55, 0x6a6a47, 0x5b5d3d, 0x7a7150].map((h) => new THREE.Color(h));
  const tufts = 520;
  const col = new THREE.Color();
  for (let i = 0; i < tufts; i++) {
    let cx: number, cz: number;
    if (i < 380) {
      const c = centres[i % centres.length];
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * c[2];
      cx = c[0] + Math.cos(a) * d;
      cz = c[1] + Math.sin(a) * d;
    } else {
      cx = (r() - 0.5) * (w - 1);
      cz = (r() - 0.5) * (l - 1);
    }
    cx = THREE.MathUtils.clamp(cx, -w / 2 + 0.1, w / 2 - 0.1);
    cz = THREE.MathUtils.clamp(cz, -l / 2 + 0.1, l / 2 - 0.1);
    const n = 4 + Math.floor(r() * 8);
    const tint = palette[Math.floor(r() * palette.length)];
    for (let b = 0; b < n; b++) {
      const h = 0.02 + r() * 0.05;
      const bw = 0.0022 + r() * 0.0018;
      const g = new THREE.PlaneGeometry(bw, h, 1, 3);
      g.translate(0, h / 2, 0);
      const pos = g.attributes.position;
      const colors: number[] = [];
      const lean = (r() - 0.5) * 0.9;
      const shade = 0.85 + r() * 0.3;
      for (let k = 0; k < pos.count; k++) {
        const y = pos.getY(k);
        const tt = y / h;
        pos.setX(k, pos.getX(k) * (1 - tt * 0.85));
        pos.setZ(k, lean * tt * tt * h);
        col.copy(tint).multiplyScalar(shade * (0.55 + 0.45 * tt));
        colors.push(col.r, col.g, col.b);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      g.computeVertexNormals();
      g.rotateY(r() * Math.PI * 2);
      g.translate(cx + (r() - 0.5) * 0.07, 0, cz + (r() - 0.5) * 0.07);
      g.deleteAttribute('uv');
      blades.push(g);
    }
  }
  const mat = surface({
    name: 'grass',
    color: 0xffffff,
    roughness: 0.85,
    colorVar: 0.12,
    varScale: 1.5,
    side: THREE.DoubleSide,
    vertexColors: true,
    cavity: 0,
  });
  const mesh = new THREE.Mesh(mergeGeometries(blades)!, mat);
  mesh.receiveShadow = true;
  mesh.name = 'grass';
  return mesh;
}
