/**
 * Material presets. Every function is memoised on its arguments, so calling
 * `M.paint(0x8f7d56)` twice returns the SAME material instance — this lets the
 * baker merge all parts that share a material into one draw call.
 *
 * Realistic value ranges used here:
 *  - Paint on steel: dielectric (metalness 0), roughness 0.55–0.75, worn edges show dark steel.
 *  - Blued / parkerised gun steel: metalness 0.75–0.9, roughness 0.3–0.5, near-black blue-grey.
 *  - Wool: roughness ~0.95 with sheen; cotton drill ~0.9; canvas ~0.9 with a plain weave.
 *  - Leather: roughness 0.45–0.65 depending on polish.
 *  - Wood (oiled stock): roughness 0.4–0.55, subtle clearcoat.
 *  - Glass: low roughness, low opacity, reflective via the environment.
 */
import * as THREE from 'three';
import { surface, type SurfaceParams } from './surface';

const memo = new Map<string, THREE.Material>();
function cached<T extends THREE.Material>(key: string, make: () => T): T {
  let m = memo.get(key) as T | undefined;
  if (!m) {
    m = make();
    memo.set(key, m);
  }
  return m;
}
const k = (name: string, args: unknown) => name + ':' + JSON.stringify(args);

type Opt = Partial<SurfaceParams>;

export const M = {
  /** Any fully custom surface (memoised by params). */
  surface(params: SurfaceParams): THREE.MeshStandardMaterial {
    return cached(k('surface', params), () => surface(params));
  },

  /** Painted steel (vehicles, guns, helmets). */
  paint(color: THREE.ColorRepresentation, o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('paint', [color, o]), () =>
      surface({
        color,
        roughness: 0.62,
        metalness: 0,
        colorVar: 0.07,
        varScale: 2.2,
        roughVar: 0.15,
        detail: 'fine',
        detailSize: 0.05,
        detailStrength: 0.35,
        wear: 0.35,
        wearColor: 0x3d3a36,
        wearMetalness: 0.7,
        wearRoughness: 0.42,
        dust: 0.25,
        dustHeight: 0.9,
        cavity: 0.4,
        ...o,
        name: o.name ?? `paint-${String(color)}`,
      }),
    );
  },

  /** Blued / parkerised gun steel. */
  gunSteel(o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('gunSteel', o), () =>
      surface({
        color: 0x2b2d30,
        roughness: 0.38,
        metalness: 0.85,
        colorVar: 0.05,
        varScale: 12,
        roughVar: 0.18,
        wear: 0.5,
        wearColor: 0x8a8c8e,
        wearMetalness: 1,
        wearRoughness: 0.28,
        cavity: 0.3,
        ...o,
        name: o.name ?? 'gunSteel',
      }),
    );
  },

  /** Bare / weathered steel (track links, tools, springs). */
  steel(o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('steel', o), () =>
      surface({
        color: 0x4a4744,
        roughness: 0.6,
        metalness: 0.75,
        colorVar: 0.12,
        varScale: 6,
        roughVar: 0.2,
        bump: 0.06,
        bumpScale: 150,
        wear: 0.6,
        wearColor: 0x8d8a86,
        wearMetalness: 1,
        wearRoughness: 0.32,
        dust: 0.3,
        dustHeight: 0.5,
        cavity: 0.4,
        ...o,
        name: o.name ?? 'steel',
      }),
    );
  },

  /** Cast steel / cast armour texture (mantlets, cast turrets, cast wheels). */
  castPaint(color: THREE.ColorRepresentation, o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('castPaint', [color, o]), () =>
      M.paint(color, { detail: 'cast', detailSize: 0.35, detailStrength: 0.8, ...o, name: o.name ?? `castPaint-${String(color)}` }),
    );
  },

  /** Oiled wood (rifle stocks, tool handles). axis = grain direction in object space. */
  wood(
    color: THREE.ColorRepresentation = 0x7a4a26,
    dark: THREE.ColorRepresentation = 0x3b2211,
    axis: [number, number, number] = [0, 0, 1],
    o: Opt = {},
  ): THREE.MeshStandardMaterial {
    return cached(k('wood', [color, dark, axis, o]), () =>
      surface({
        color,
        roughness: 0.48,
        metalness: 0,
        colorVar: 0.08,
        varScale: 9,
        roughVar: 0.12,
        wood: { axis, dark, ringFreq: 170, figure: 0.7 },
        detail: 'wood',
        detailSize: 0.08,
        detailStrength: 0.25,
        wear: 0.25,
        wearColor: 0xa77a4f,
        wearMetalness: 0,
        wearRoughness: 0.35,
        clearcoat: 0.25,
        clearcoatRoughness: 0.35,
        cavity: 0.3,
        ...o,
        name: o.name ?? 'wood',
      }),
    );
  },

  /** Raw / painted wood for crates, wheels, stands (no clearcoat). */
  plainWood(color: THREE.ColorRepresentation, axis: [number, number, number] = [0, 0, 1], o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('plainWood', [color, axis, o]), () =>
      surface({
        color,
        roughness: 0.78,
        colorVar: 0.1,
        varScale: 5,
        wood: { axis, dark: new THREE.Color(color).multiplyScalar(0.62).getHex(), ringFreq: 60, figure: 0.9 },
        detail: 'wood',
        detailSize: 0.12,
        detailStrength: 0.5,
        wear: 0.2,
        cavity: 0.35,
        ...o,
        name: o.name ?? `plainWood-${String(color)}`,
      }),
    );
  },

  /** Leather (belts, boots, pouches, straps). */
  leather(color: THREE.ColorRepresentation = 0x2c2119, o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('leather', [color, o]), () =>
      surface({
        color,
        roughness: 0.55,
        metalness: 0,
        colorVar: 0.1,
        varScale: 14,
        roughVar: 0.2,
        detail: 'leather',
        detailSize: 0.035,
        detailStrength: 0.6,
        wear: 0.35,
        wearColor: new THREE.Color(color).multiplyScalar(1.6).getHex(),
        wearMetalness: 0,
        wearRoughness: 0.4,
        cavity: 0.35,
        ...o,
        name: o.name ?? `leather-${String(color)}`,
      }),
    );
  },

  /** Wool uniform cloth (tunics, trousers, greatcoats). */
  wool(color: THREE.ColorRepresentation, o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('wool', [color, o]), () =>
      surface({
        color,
        roughness: 0.93,
        metalness: 0,
        colorVar: 0.06,
        varScale: 4,
        roughVar: 0.05,
        detail: 'twill',
        detailSize: 0.012,
        detailStrength: 0.9,
        sheen: 0.55,
        sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35).getHex(),
        sheenRoughness: 0.75,
        cavity: 0.45,
        dust: 0.12,
        dustHeight: 0.6,
        ...o,
        name: o.name ?? `wool-${String(color)}`,
      }),
    );
  },

  /** Cotton drill / twill (summer tunics, caps, bread bags). */
  cotton(color: THREE.ColorRepresentation, o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('cotton', [color, o]), () =>
      surface({
        color,
        roughness: 0.88,
        metalness: 0,
        colorVar: 0.07,
        varScale: 5,
        roughVar: 0.06,
        detail: 'plain',
        detailSize: 0.01,
        detailStrength: 0.8,
        sheen: 0.3,
        sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3).getHex(),
        sheenRoughness: 0.85,
        cavity: 0.45,
        dust: 0.12,
        dustHeight: 0.6,
        ...o,
        name: o.name ?? `cotton-${String(color)}`,
      }),
    );
  },

  /** Heavy canvas / webbing straps. */
  canvas(color: THREE.ColorRepresentation, o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('canvas', [color, o]), () =>
      surface({
        color,
        roughness: 0.92,
        metalness: 0,
        colorVar: 0.09,
        varScale: 8,
        detail: 'webbing',
        detailSize: 0.02,
        detailStrength: 1.0,
        cavity: 0.4,
        wear: 0.15,
        wearColor: new THREE.Color(color).multiplyScalar(1.25).getHex(),
        wearMetalness: 0,
        wearRoughness: 0.95,
        dust: 0.18,
        dustHeight: 0.6,
        ...o,
        name: o.name ?? `canvas-${String(color)}`,
      }),
    );
  },

  /** Tyre / seal rubber. */
  rubber(o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('rubber', o), () =>
      surface({
        color: 0x1d1d1d,
        roughness: 0.9,
        metalness: 0,
        colorVar: 0.05,
        varScale: 10,
        bump: 0.05,
        bumpScale: 250,
        dust: 0.45,
        dustHeight: 0.6,
        dustColor: 0x8a7d69,
        cavity: 0.3,
        ...o,
        name: o.name ?? 'rubber',
      }),
    );
  },

  /** Brass / copper (cartridges, fittings). */
  brass(o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('brass', o), () =>
      surface({ color: 0xb08d4f, roughness: 0.35, metalness: 1, colorVar: 0.08, varScale: 20, roughVar: 0.2, cavity: 0.4, ...o, name: o.name ?? 'brass' }),
    );
  },

  /** Unpainted aluminium / duralumin. */
  aluminium(o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('aluminium', o), () =>
      surface({ color: 0xa9abad, roughness: 0.42, metalness: 0.95, colorVar: 0.05, varScale: 3, roughVar: 0.2, cavity: 0.3, ...o, name: o.name ?? 'aluminium' }),
    );
  },

  /** Human skin — kept soft and matte. */
  skin(color: THREE.ColorRepresentation = 0xc9967a, o: Opt = {}): THREE.MeshStandardMaterial {
    return cached(k('skin', [color, o]), () =>
      surface({
        color,
        roughness: 0.58,
        metalness: 0,
        colorVar: 0.08,
        varScale: 22,
        roughVar: 0.12,
        bump: 0.025,
        bumpScale: 500,
        sheen: 0.25,
        sheenColor: 0xffd8c8,
        sheenRoughness: 0.6,
        cavity: 0.4,
        ...o,
        name: o.name ?? `skin-${String(color)}`,
      }),
    );
  },

  /** Clear glass (canopies, vision blocks, headlamps). Does not cast shadows (see bake). */
  glass(o: { tint?: THREE.ColorRepresentation; opacity?: number; roughness?: number } = {}): THREE.MeshPhysicalMaterial {
    return cached(k('glass', o), () => {
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(o.tint ?? 0xdfe8ea),
        metalness: 0,
        roughness: o.roughness ?? 0.04,
        transparent: true,
        opacity: o.opacity ?? 0.18,
        ior: 1.5,
        specularIntensity: 1,
        envMapIntensity: 1.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      m.name = 'glass';
      m.userData.noShadow = true;
      return m;
    });
  },

  /** Decal material for painted markings (insignia, numbers). Uses polygonOffset to sit on a surface. */
  decal(map: THREE.Texture, o: { roughness?: number; key: string }): THREE.MeshStandardMaterial {
    return cached(k('decal', o.key), () => {
      const m = new THREE.MeshStandardMaterial({
        map,
        transparent: false,
        alphaTest: 0.5,
        alphaToCoverage: true,
        roughness: o.roughness ?? 0.6,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      m.name = 'decal-' + o.key;
      m.userData.noShadow = true;
      return m;
    });
  },
};

export type MaterialLibrary = typeof M;
