# Asset Authoring Guide

Read `docs/SPEC.md` first (the client brief). This guide explains how to build a catalog model that
meets it. Models are **procedurally modelled in TypeScript** with three.js — self-made, no downloaded
meshes or textures — so provenance is clean. Quality bar: **collector-grade scale model / product
photography**. Look at your work from every side, up close, before calling it done.

## 1. Files & ownership

- One catalog entry = `src/assets/<faction>/<name>.asset.ts` with a **default export `AssetDef`**
  (see `src/core/types.ts`). Discovery is automatic — never edit a shared index.
- Helper modules for your asset live next to it, e.g. `src/assets/germany/panzer-iv-h/*.ts`, or
  `src/assets/germany/weapons/kar98k.model.ts`. Only edit files you own (listed in your task).
  If you need a change in a shared/core file, keep it minimal, backwards compatible, and say so in
  your final report. Never break other assets.
- Faction folders and asset id prefixes (the `faction` field of the AssetDef is the folder name;
  the list of countries is `FACTIONS` in `src/core/types.ts`, the app derives everything from it):

  | Country | Folder / `faction` | Id prefix |
  |---|---|---|
  | Germany | `src/assets/germany/` - `'germany'` | `de-` |
  | Soviet Union | `src/assets/soviet/` - `'soviet'` | `su-` |
  | United States | `src/assets/usa/` - `'usa'` | `us-` |
  | United Kingdom | `src/assets/uk/` - `'uk'` | `uk-` |
  | Japan | `src/assets/japan/` - `'japan'` | `jp-` |
  | Italy | `src/assets/italy/` - `'italy'` | `it-` |

  Shared: `src/assets/shared/` (contracts, display stands, human base system).
- **Source files are ASCII only.** Edit files with the Edit/Write tools (never PowerShell
  `Set-Content`/`Out-File`, which corrupts encoding on this machine).

## 2. Conventions (mandatory)

- **Metres, real 1:1 scale.** A soldier is ~1.75 m, a Panzer IV hull ~5.9 m, a Bf 109 G wingspan ~9.9 m.
- **+Y up, +Z forward** (muzzle, vehicle front, aircraft nose, soldier facing). **+X is the asset's
  left**, -X its right.
- **Origin on the ground (y = 0) at the footprint centre.** Lowest contact points (boot soles, track
  run, tyre contact patches, trail spades, stand base, tail wheel) touch **y = 0 exactly**; nothing
  floats, nothing sinks. Tyres may flatten 1-3 cm at the contact patch; tracks lie flat on y = 0.
- Aircraft: parked, gear down, propeller still. Tail-draggers sit tail-down on their tail wheel.
- The asset must be static — no animation, no timers.
- `footprint` = real plan size (w along X, l along Z) at heading 0; `spacing.default` should leave
  comfortable viewing room (e.g. soldiers ~1.1 m, tanks ~ length + 3 m, aircraft ~ span + 4 m).

## 3. The kit (`src/core/kit.ts`)

```ts
import { THREE, M, G, S, sdfMesh, part, group, mirrorX, decal, groundIt, rng } from '../../core/kit';
```
- `part(geometry, material, { p:[x,y,z], r:[degX,degY,degZ], s })` — a positioned mesh.
- `group(children, placement)` — a positioned group. Build hierarchies freely; the framework
  **bakes** everything (merges per material, one draw call each), so use as many parts as you need.
- `mirrorX(obj)` — returns obj + its X-mirrored copy (left/right symmetry). Winding is fixed at bake.
- `decal(key, w, h, draw2d, placement)` — painted markings as a small canvas-textured quad. Place
  2-3 mm off the surface. Use only historically appropriate markings; do NOT depict swastikas.
- `groundIt(obj)` — translate so the lowest point is at y = 0 (use after building, then verify).

Geometry (`G.*`, `src/core/geo/shapes.ts`): `rbox` (rounded box — prefer it over sharp boxes; real
objects have softened edges), `cyl`, `lathe(profile)`, `extrude(shape, depth, bevel)`,
`plate(outline2D, thickness, 'zy'|'xy'|'xz', bevel)` (armour plates / shields from side-view
outlines), `rod(a,b,r)`, `tube(points,r)`, `strap(points,width,thickness,normals)` (belts, slings),
`loftZ(sections)` + `superRing()` (fuselages, stocks, fenders), `torus`, `boltHead`, `rivetHead`,
`scatter(geo, placements)` (bolts/rivets), `along(a,b,n)`, `weld(points)`, `crease(geo, deg)`.
Three's own geometries (Sphere, Capsule, Torus, Lathe, Extrude, Tube, Shape) are fine too.

SDF (`S.*`, `sdfMesh`, `src/core/geo/sdf.ts`) for organic forms: sphere, ellipsoid, capsule,
roundCone, box, cylinder, torus, smin/sminAll (smooth union), ssub, sintersect, offset, shell,
displace, transform, mirrorX, bounded. `sdfMesh(f, {min,max}, cellSize)` → mesh with gradient
normals. Use ~2.5-4 mm cells for faces/hands, 5-10 mm for bodies/cloth; split big objects into parts.

Materials (`M.*`, `src/core/materials/library.ts`) — **memoised: same args = same material = merged
draw call**, so define your palette once and reuse:
`M.paint(color, opts)`, `M.castPaint`, `M.gunSteel()`, `M.steel()`, `M.wood(color, dark, grainAxis)`,
`M.plainWood`, `M.leather(color)`, `M.wool(color)`, `M.cotton(color)`, `M.canvas(color)`,
`M.rubber()`, `M.brass()`, `M.aluminium()`, `M.skin(color)`, `M.glass()`, `M.surface({...})`.
All accept overrides (`src/core/materials/surface.ts` → `SurfaceParams`): `roughness`, `metalness`,
`colorVar`, `varScale`, `detail` ('twill'|'plain'|'webbing'|'leather'|'cast'|'fine'|'knit'|'wood'|'soil'),
`detailSize`, `detailStrength`, `bump`, `bumpScale`, `wood{axis,dark}`, `camo{colors,scale,coverage,softness}`,
`dust`, `dustHeight`, `dustColor`, `wear`, `wearColor`, `wearMetalness`, `cavity`, `sheen`, `clearcoat`.
The surface shader is UV-free (object-space noise, triplanar detail), so you don't need UVs.
Edge wear and crease darkening come automatically from geometry at bake time (convex edges → wear).
Keep weathering **moderate**: `wear` 0.15-0.45, `dust` 0.1-0.35 typical.

Colours: use historically grounded paint/uniform colours (e.g. German Dunkelgelb RAL 7028 ~#9d8b5e
in-scene, Soviet 4BO green ~#4d5236, Feldgrau wool ~#5b5d4c). Remember tone mapping lightens
slightly; judge in the harness, not by hex.

## 4. Look at it — the review harness

Dev server is always running at http://localhost:5199 (do NOT start another one).

```bash
node scripts/snap.mjs germany/panzer-iv-h                      # 6-view contact sheet
node scripts/snap.mjs germany/panzer-iv-h --ref               # + 1.80 m scale figure
node scripts/snap.mjs germany/panzer-iv-h --views q-front,q-rear-l,bottom --w 1800 --h 700
node scripts/snap.mjs germany/panzer-iv-h --yaw 40 --pitch 12 --dist 1.6 --target 1.2,0.6,2.4   # close-up
node scripts/snap.mjs germany/panzer-iv-h --ground plinth     # on the real display soil
node scripts/snap.mjs germany/rifleman --config '{"weapon":"mp40"}'
```
Views: q-front, q-front-r, front, left, right, rear, q-rear, q-rear-l, top, bottom, ground, high.
It prints the PNG path (open it with the Read tool to look at it) and stats: triangles, draw calls,
bounds size (compare with the real dimensions!), **minY (must be 0.000)**, build time.
PNGs go to `.snaps/` — name yours with `--out .snaps/<asset>-<what>.png` so parallel authors don't collide.

**Iterate visually**: build → snap → look critically at silhouette, proportions, part connections,
contact with the ground, materials, close-up detail → fix → repeat. Do at least 5-8 review rounds
including multiple close-ups of the most detailed areas. Compare against your reference dimensions.

Type-check just your files: `npx tsc --noEmit 2>&1 | grep -F "src/assets/<faction>/<yours>"`
(other authors are working in parallel; ignore their errors, but yours must be clean).

## 5. Quality checklist (the reviewer will check every point)

1. **Silhouette & proportions** match the real subject (verify key dimensions from references:
   length, width, height, wheelbase/track, gun length, wingspan...). Bounds in the harness agree.
2. **Structural layering:** major assemblies are separate, correctly connected parts with thickness
   (plates have thickness, wheels have hubs/rims/tyres, hatches have hinges, grilles have slats,
   tools have brackets). Nothing is just a box where the real thing has shape.
3. **No floating or interpenetrating parts**; fittings are attached; minY = 0; tracks/wheels meet ground.
4. **Materials read correctly:** painted steel vs bare metal vs rubber vs wood vs canvas vs glass vs leather.
5. **Close-up quality:** at 0.5-2 m camera distance the most visible areas still show crafted detail
   (bevels, bolts, weld seams, stitching, panel lines, knurling) — restrained, not noisy.
6. **Every side holds up:** front, back, both sides, top, underside where visible.
7. **Moderate weathering**; historical colours; nationality via restrained markings at most.
8. **Performance:** triangles — weapon ≤ 60k, gear item ≤ 20k, soldier ≤ 180k, vehicle/artillery
   ≤ 350k, tank/aircraft ≤ 500k. Build time ≤ 1.5 s (soldiers ≤ 2.5 s). Draw calls = number of
   distinct materials (keep ≤ 25).
9. **Facts & text:** `summary` 1-3 sentences, English, neutral, accurate. `facts` only verified
   (e.g. Service, Crew, Calibre, Length, Weight, Produced). If unsure, leave it out.
   `provenance.references` lists the public sources you used (URLs).
10. **Convention compliance:** +Z forward, origin at footprint centre, `footprint` accurate.

## 6. Research

Use WebSearch/WebFetch to verify dimensions, component layout and facts for your subject
(manufacturer data, museum pages, reputable references). Record sources in `provenance.references`.
Never invent designations, dates or attributions. Model the specific variant named in your task.

## 7. Provenance block (use exactly this style)

```ts
provenance: {
  method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
  author: 'Muster project',
  license: 'Project-owned; created for this project.',
  textures: 'Procedural, generated in code at runtime.',
  references: ['https://...', 'https://...'],
  notes: 'Simplifications or omissions, stated honestly.',
},
```
