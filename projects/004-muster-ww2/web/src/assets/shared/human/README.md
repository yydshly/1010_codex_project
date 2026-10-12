# Human base system (`src/assets/shared/human/`)

Shared anatomy, poses, hands, head, garment toolkit, fitting API and soldier assembly for all
infantry assets. Everything is procedural TypeScript (signed distance fields meshed with a Surface
Nets mesher, then decimated); no external meshes or textures.

Review asset: `src/assets/_test/human-base.asset.ts` (hidden). Examples:

```bash
node scripts/snap.mjs _test/human-base --config '{"pose":"port-arms"}' --ref
node scripts/snap.mjs _test/human-base --config '{"pose":"low-ready","uniform":"detailed","gear":"test"}'
node scripts/snap.mjs _test/human-base --config '{"pose":"order-arms","weapon":"kar98k"}'
node scripts/snap.mjs _test/human-base --config '{"layer":"head"}' --yaw 35 --pitch 3 --dist 0.55 --target 0,1.62,0
```

Options: `pose` (stand, port-arms, order-arms, low-ready, shoulder-carry), `weapon` (auto = test
weapon for the pose, none, test-rifle, test-smg, test-lmg, kar98k, mp40, mg42, mosin, ppsh, dp27),
`uniform` (plain, detailed), `gear` (none, test = belt + pouches + canteen + straps + helmet placed
with the fitting API), `layer` (clothed, body = bare garment base, head).

---------------------------------------------------------------------------------------------------

## 1. Quick start

```ts
import { buildSoldier } from '../../shared/human/soldier';
import type { UniformSpec } from '../../shared/human/uniform';
import { buildKar98k } from '../weapons/kar98k.model';

const uniform: UniformSpec = { id: 'de-m40', tunic: { ... }, trousers: { ... }, footwear: { ... } };

build(cfg) {
  const weapon = buildKar98k();
  const sol = buildSoldier({ uniform, pose: 'port-arms', weapon });
  // add gear / straps: see sections 6 and 7 (or pass `gear` / `straps` to buildSoldier)
  return sol.object;          // THREE.Group in asset space; the framework bakes it
}
```

`buildSoldier` returns `{ object, pose, body, uniform, fit, weaponMatrix, stats, bodyGeometry() }`.
Heavy meshes (uniform, hands) are cached by (pose, uniform.id, stature, weapon grip signature,
lod, pose overrides, belt); the head mesh is built once per session. A second soldier with the same
key costs ~2 ms (meshes are shared, gear and straps are re-fitted).

**`UniformSpec.id` must change whenever the spec changes** (it is part of the cache key).

## 2. Coordinate conventions

- Asset space: metres, **+Y up, +Z forward (the soldier faces +Z), +X = the soldier's LEFT**.
  Origin on the ground between the feet; boot soles touch **y = 0** (heels/soles are exact).
- Sides: `'r'` = right = -X, `'l'` = left = +X. `sgn(side)` is -1 / +1.
- Stature 1.76 m barefoot by default (`stature` option scales everything linearly); footwear
  lifts the skeleton by the heel height (`footwearLift`, default 26 mm).
- **Heights in specs and in the fitting API are metres above the ground for the 1.76 m reference
  figure standing barefoot** (belt 1.03, hem 0.80, chest pocket centre 1.29...). They are
  converted to the REST TRUNK space, so they follow the pose (pelvis tilt, spine bend) and scale
  with stature. Hip joints are at 0.903 (rest).
- **Angles around the trunk** (fitting API): 0 = centre front, +90 = left side (+X),
  -90 = right side, 180 = centre back, measured in the trunk's own horizontal plane.
- Frames (`Frame` in sdfx.ts) are `{ o, x, y, z }` (origin + unit axes, world directions).
- Skeleton frames (`sol.pose.sk`): `pelvis`, `lumbar`, `chest`, `neck` (x = left, y = up, z = forward
  of each segment), `head` (origin between the ear canals, Frankfurt plane = local XZ),
  `leg[side] { hip, knee, ankle, foot }` (foot frame on the ground below the ankle, +Z to the toe),
  `arm[side] { clavicle, shoulder, elbow, wrist, hand }`.

Anthropometry (1.76 m): head 0.235 (vertex-chin), shoulder joints 1.405 at +-0.175 (acromion
~1.445), elbow ~1.09, wrist ~0.85, hip joints 0.903 at +-0.088, knee 0.49, ankle 0.078;
upper arm 0.32 (joint centres; acromion-radiale ~0.33), forearm 0.255, hand 0.19, thigh 0.41,
shank 0.415, foot 0.265. See `REF` in skeleton.ts.

## 3. Poses and grips (`poses.ts`, `hands.ts`)

`solvePose(id, weapon, params?, overrides?) -> { id, sk, weaponMatrix, hands }` (buildSoldier calls
it for you). `weaponMatrix` maps WEAPON-LOCAL space (contracts.ts: bore +Z, top +Y, left +X,
origin = trigger grip centre) to asset space. `hands[side]` is `{ kind: 'relaxed' }` or
`{ kind: 'grip', grip, opts }` (grip in weapon-local space).

| PoseId | weapon | what it looks like |
|---|---|---|
| `stand` | none | natural standing, weight on the right leg, relaxed hands |
| `port-arms` | rifle | right hand on the wrist of the stock just in front of the right hip (forearm about horizontal), rifle diagonal across the chest, barrel crossing the point of the left shoulder, left hand under the fore-end; sling/underside to the front |
| `order-arms` | rifle | rifle upright at the right side, butt on the ground (y = 0) beside the right boot toe, right hand around the fore-end with the arm hanging, left arm hanging |
| `low-ready` | SMG / LMG | right hand on the pistol grip at the right hip, weapon pointing forward-down; the muzzle turns in (up to 35 deg to the left) as far as needed for the left hand to reach the support grip with a bent elbow |
| `shoulder-carry` | LMG | gun over the right shoulder, muzzle to the rear and up; receiver/jacket resting on the shoulder, butt forward-down, right hand on the pistol grip in front of the chest, left arm hanging |

`POSES` lists `{ id, label, weapon: 'none'|'rifle'|'smg-lmg'|'lmg' }` for building option lists.
Offer only poses that suit the weapon (constrain()).

How grips drive the hands:
- The weapon's `Grip` (`position`, `axis` towards the thumb/index side, `palm` from the grip centre
  to the palm, `radius`) places a canonical fist. Arms are solved with analytic two-bone IK
  (`solveArm`); the hand may **roll around the grip axis** (up to +-30..60 deg) to find the most
  natural wrist, so the palm direction in your Grip is a preference, not a constraint.
- The rolled grip and the grip angle are returned in `hands[side]`; build hand meshes from exactly
  that (`gripHand(hands.r.grip, 'r', mat, { ...hands.r.opts, forearm })`), which buildSoldier does.
- `GripHandOptions`: `curl` (0..1, default 1; support hands cradling a fore-end ~0.85),
  `thumbCurl`, `index: 'wrap' | 'extended'` (trigger finger laid along the guard), `beta` = grip
  angle across the palm in degrees from the knuckle line (22 = transverse, pistol grips and stock
  wrists; 40 = oblique, fore-ends; order-arms searches -10..22 automatically).
- Fingers wrap to the tightest curl that does not penetrate the cylinder (flesh compresses
  <= 1.2 mm); the grip cylinder is carved out of the hand, so no finger enters the weapon.
- `overrides` (`PoseOverrides`): `stance` (use `stanceOf(id)` and tweak feet/pelvis/spine/head),
  `grips` (replace a grip, weapon-local), `handOpts`, `weaponOffset` (asset-space matrix,
  pre-multiplied), `clearance` (set by buildSoldier: the clothed torso keeps the weapon clear).
  In buildSoldier use `poseOverrides` and `clearance` (extra volumes, e.g. belt pouches in front of
  a low-ready SMG: pass an SDF, asset space, negative inside).
- Sling: `weapon.sling.build(gravityLocal, slack)` is called with world-down expressed in weapon
  space; buildSoldier picks the largest slack (<= 0.12 m or `sling.slack`) that does not enter the
  clothed body. `sling: false` omits it.

## 4. Writing a `UniformSpec` (`uniform.ts`)

```ts
const DE_M40: UniformSpec = {
  id: 'de-m40-v1',                                   // bump when anything changes
  tunic: {
    cloth: { kind: 'wool', color: 0x5b5d4c, mat: { dust: 0.15 } },
    thickness: 0.0035,                               // cloth (m)
    ease: 0,                                         // extra looseness (m)
    hem: 0.80,                                       // hem height (reference figure, m)
    flare: 0.08,                                     // skirt flare per metre below the hips
    belt: { height: 1.03, gather: 1 },               // tunic pulled in + gathered here (null: no belt)
    collar: { style: 'turndown', height: 0.032, fall: 0.045, cloth: { color: 0x3f4236 } },
    front: { style: 'full', buttons: 5 },            // or { style: 'placket', buttons: 2, length: 0.2 }
    pockets: [
      { at: 'chest', side: 'both', w: 0.115, h: 0.135, pleat: true, flap: { h: 0.052, shape: 'scalloped', button: true } },
      { at: 'skirt', side: 'both', w: 0.16, h: 0.18, flap: { h: 0.065, shape: 'straight', button: true } },
    ],
    shoulderStraps: { style: 'strap', piping: 0xdcdcc8, button: true }, // 'board' = Soviet pogon
    cuff: { back: 0.012, buttons: 0 },
    buttons: { color: 0x55574a, metal: true, diameter: 0.019, small: 0.016 },
    seams: true,
  },
  trousers: { cloth: { color: 0x565743 }, cut: 'straight' /* | 'breeches' | 'tapered' */, bottoms: 'tucked' /* | 'bloused' | 'loose' */, fullness: 0 },
  footwear: { style: 'jackboot' /* | 'ankle' */, leather: 0x221a14, sole: 0x19140f, shaft: 0.34, creases: true, laces: true, heel: 0.026 },
  legwear: null,                                     // { style: 'gaiters' | 'puttees', color, top, strap, kind }
  skin: { tone: 0xc9967a, hair: 0x3a2c22 },
};
```

Field reference (defaults in brackets): collar `turndown` (fold-over; stand + fall with points) or
`stand` (closed standing collar with `buttons` 0-2) or `none`; front `full` (buttoned to the hem),
`placket` (pullover opening of `length` below the collar, e.g. gymnastyorka) or `none`, `fly: true`
hides the buttons; pocket `x`/`y` override the centre (chest 0.095 / 1.29, skirt 0.115 / 0.92),
flap `shape` straight / pointed / scalloped; `shoulderStraps` width/length/cloth/piping (null =
none); trousers `breeches` add thigh fullness, `bottoms` tucked (into boots or puttees), bloused
(over gaiters / boot tops) or loose; footwear `jackboot` (tall shaft, concertina creases) or `ankle`
(laced; combine with `legwear` gaiters or puttees). Materials come from `M.wool/cotton/canvas`
(memoised: identical colours share a draw call).

`buildUniform(spec, bodyModel(sk), lod?)` returns `{ parts, fields, anchors }` (buildSoldier does
this). `anchors` are frames on the cloth for insignia/tabs: `collar-l`, `collar-r`,
`pocket-chest-l`, `pocket-skirt-r`, `shoulder-strap-l`... (x across, y up, z = outward normal).
Place decals / collar tabs 0.5-1 mm along +z.

### Custom garment parts (toolkit, `garment.ts`)
When the spec is not enough (Litzen, a greatcoat roll, a field cap), build your own SDF parts
against `sol.uniform.fields` and mesh them with `meshSDF` + `simplify`:
- `garmentBody(inner, t, edges, cuts)` - solid cloth `inner - t`, cut sharply just inside each
  edge band; `edgeBand(edge)` - the hem/cuff band (hollow, real thickness, raised 0.9 mm like a
  turned-up hem) that you mesh at ~2.6 mm. **Never hollow a shell thinner than ~1.5 mesh cells**
  (that is what makes ragged hems); edges are limited to their part with `EdgeSpec.region`.
- `surfaceChart(field, frame, hu, hv)` + `patchLayer(chart, outline2D, top, below)` - conforming
  patches (pockets, flaps, tabs, plackets) with crisp edges; `rect2`, `poly2` outlines;
  `surfaceFrame(field, seed, up, towards)` places a frame on the cloth.
- Folds: `ridges(u, count, sharp, seed)` and `bump()` for coherent, restrained displacement of the
  INNER surface (so thickness is preserved); keep the fold wavelength >= ~4 mesh cells.
- `buttonGeometry(d, h)`, `alignY(p, n)` (button on the surface normal), `cord(points, r)`.
- Mesh cells: cloth bodies 7-7.5 mm, trousers 7 mm, patches / collars / edges 2.4-2.8 mm, boots
  6.8 mm + 2.8 mm rim. Always decimate (`simplify(geo, budget, { maxError: cell * 0.35 })`).

`fields`: `tunic` (solid incl. bands), `tunicMain`, `tunicTorso` (torso + skirt, no sleeves),
`trousers`, `trousersMain`, `clothed` (tunic + trousers), `tunicInner`, `edges`, `beltRest`,
`hemRest` (rest trunk heights), `collar { base, axis }`. All SDFs: asset space, metres, negative inside.

## 5. The body (`body.ts`, `skeleton.ts`)
`bodyModel(sk)` -> `{ sk, space, trunkRest, trunk, trunkLoft, neck, arm, leg, full, torso }`.
`space.toRest / toWorld / dirToWorld` map between asset space and rest trunk space (inverse
skinning over pelvis/lumbar/chest). `full` is the bare body (review / garment base), `torso` the
trunk + neck + deltoids. Garments are offsets of these surfaces.

## 6. Fitting API (`fit.ts`, `sol.fit`)

```ts
const fit = sol.fit;                                  // createFit(body, fields, beltSpec) internally
fit.surfacePoint({ angle: 90, height: 1.03 })          // -> { position, normal } on the torso cloth
fit.surfacePoint({ from, dir }, 'clothed')             // ray hit; or pass a Vector3 = nearest point
const belt = fit.beltPath();                           // default: the uniform's belt height
geo = G.strap(belt.points, fit.belt.width, fit.belt.thickness, belt.normals, { closed: true, smooth: false });
belt.frameAt(0)                                        // Matrix4 on the belt's OUTER face (buckle at 0 deg)
fit.strapPath([p0, p1, p2...], offset, { tension })    // -> { points, normals, tangents } for G.strap
fit.mountFrame('belt-front-left', { piece })           // Matrix4 placing a GearPiece
fit.headFrame({ tilt, lift })                          // helmets and caps
```

- Layers: `'torso'` (tunic torso + skirt + trousers, no arms: belts, straps, pouches, packs),
  `'clothed'` (incl. sleeves), `'body'` (bare).
- `beltPath(height?, outwardOffset?, samples = 96)`: closed loop at the belt CENTRE LINE, pushed
  out so the whole belt width clears the cloth (it touches at the most protruding point),
  lightly smoothed (a belt is stiff). `fit.belt` = `{ height, width 0.045, thickness 0.004 }`
  (override with `buildSoldier({ belt: {...} })`). The tunic is compressed/gathered at the spec's
  `tunic.belt.height`: use the same height for the belt.
- `strapPath(control, offset, { samples, layer, tension 0..1, closed })`: control points are
  projected onto the surface at `offset` (strap centre), then relaxed so the strap bridges hollows
  like a taut strap (never inside the cloth). Normals are surface normals orthogonal to the path.
  Build Y-straps / slings / bread-bag straps from 4-7 control points (use `surfacePoint` to find
  them: e.g. over the shoulder `{ angle: 72, height: 1.47, elevation: 55 }`).
- `mountFrame(mount, opts)`: the GearPiece contract (gear-local +Z away from the body, +Y up, back
  face on z = 0, origin = attachment point) is placed so the **back face sits on the surface with no
  gap and no intersection**: belt mounts put the origin on the belt's outer face at the mount angle;
  body mounts on the torso cloth. With `opts.piece` (or `size`) the footprint is sampled: belt and
  hip items **swing out at the bottom** to rest on the body below the belt, then everything is
  pushed out until the whole back face clears (gap 0.5 mm). Options: `angle`, `height`, `roll`,
  `gap`, `swing`, `layer`. Defaults (`MOUNT_DEFAULTS`): belt-front-left/right +-34 deg,
  belt-left/right +-88, belt-rear-left/right +-132, belt-rear 180; back 180 deg at 1.30;
  chest 0 deg at 1.30; shoulder-strap 22 deg at 1.30; hip -118 deg at 0.93.
  Several items on one side: pass explicit `angle`s (e.g. three pouches at 22, 34, 46 deg).
- `headFrame({ tilt, lift })`: `head` (head-local -> asset), `band` (gear-brief helmet frame:
  origin at the centre of the head opening on the liner-band plane, +Z forward, +Y up the head;
  put the helmet object here), `crown`, `brow` (asset points), `dims` (width 0.156, length 0.2
  incl. hair, crown 0.074 above the band, band circumference 0.575). `tilt` (deg, + = brim up at
  the front) and `lift` (m) adjust the fit; a helmet interior should clear an ellipsoid of
  semi-axes ~0.08 x 0.075 x 0.1 (x, y above the band, z) around the band centre.
- Helpers: `field(layer)`, `restY(h)`, `axisPoint(h)`, `trunkDir(angle, h, elevation)`, `trunkUp(h)`.

## 7. Assembly (`soldier.ts`)

```ts
buildSoldier({
  uniform, pose, weapon,                 // weapon may be null for 'stand'
  stature?: 1.76,
  sling?: false | { slack },
  belt?: { height, width, thickness },
  gear?: [{ piece, mount?, options?, local?, matrix? }],   // mounted with fit.mountFrame
  straps?: [{ points, width, thickness?, material, offset?, closed?, tension?, name? }],
  poseOverrides?, clearance?, lod?, detail?: 'high' | 'low',
  decorate?: (sol) => Object3D[],        // extra parts (asset space) using sol.fit etc.
})
```

**Wood grain on posed weapons / gear.** `SurfaceParams.wood.axis` is expressed in the object space
of the baked root (weapon-local for a standalone weapon) and read by the shader as a uniform, so a
rifle rotated into port arms would show its grain running across the stock. buildSoldier fixes this
for the weapon and every mounted gear piece: `remapWoodGrain(holder, matrix)` swaps each wood
material for the same `M.surface` params with the axis rotated by the placement (memoised, so equal
axes share a draw call). If you place wooden objects yourself (e.g. a stick grenade tucked in the
belt, an entrenching-tool handle), call `remapWoodGrain(obj, placementMatrix)` too.

Child names in `object`: uniform parts (`tunic`, `trousers`, `hem`, `cuff-l`, `boot-r`, `collar`,
`pocket-chest-l`...), `head`, `eye`, `hand-r`, `hand-l`, `weapon` (group incl. `sling`),
`gear:<id>`, `strap:<name>`. Materials: `skinMaterial(tone)` (matte, vertex coloured - use it for
any extra skin), `eyeMaterial()`. Head colours are painted relative to the skin tone passed to
`headGeometry(skin, hair)`, so the skin material must use the same tone with `vertexColors`.
`stats` = `{ ms, cached, triangles, timings }` (timings of the heavy build per stage).
`clearSoldierCache()` drops cached meshes.

## 8. Budgets (measured with the harness, fresh page, this machine)

| config | triangles | draws | build |
|---|---|---|---|
| stand, plain test uniform | 112k | 7 | 1.6 s |
| port-arms / order-arms, test rifle | 115k | 10 | 1.8-1.9 s |
| low-ready, test SMG / shoulder-carry, test LMG | 114k | 10 | 1.8-1.9 s |
| port-arms, detailed uniform + Kar98k + test belt/pouches/canteen/straps/helmet | 176k | 18 | 2.4 s |

Per part: head 18k (+ eyes 2k; ~0.5 s once per session, shared), hands 2 x 7k (~0.27 s per new
grip), tunic body 30k + hem 5k + cuffs 2 x 2.2k, trousers 14k, boots 2 x 7.6k, collar 4.5k,
placket 3k, pockets 1.8k each, shoulder straps 1.5k each. A real weapon adds 40-50k.
Targets: figure <= 150k, soldier incl. weapon and gear <= 180k, <= 2.5 s per new variant (later
variants skip the head and the procedural textures). `lod` / `detail: 'low'` reduce the uniform.

## 9. Known limits

- One adult male body type (stature scaling only). One face (skin tone and hair colour are
  parameters); neutral expression, closed-mouth, short military haircut. Head wear sits on the
  `band` frame; hair is not flattened under a helmet (keep helmet interiors clear of `dims`).
- Static poses only; folds are procedural (restrained, coherent), not simulated.
- Hem / cuff bands are hollow for their 26-28 mm height; above that the garment interior is solid,
  visible only when looking up under a hem.
- The weapon is kept clear of the clothed torso and trousers, not of gear: pass `clearance` for
  pouches in front of a low-ready weapon, or place front pouches with explicit angles.
- `mountFrame` uses the piece's bounding box as the back-face footprint: pieces with a strongly
  curved back should pass `size`/`gap` or add a `local` correction.
- The sling hangs under gravity from the weapon; it does not wrap around the body.
- First build in a fresh page includes the procedural textures and the head (~0.5-0.7 s).
