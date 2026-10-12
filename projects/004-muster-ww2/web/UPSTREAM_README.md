# Muster - WWII Model Archive

A hands-on 3D archive of WWII military models for the desktop web. Pick a country, browse
soldiers, weapons, equipment, vehicles, armour, artillery and aircraft, place them on a display
plinth, set quantities and formations, and inspect them up close. It is a model reference tool,
not a game: no combat, no resources, no animation.

All models are procedurally modelled in TypeScript for this project (three.js); no external
meshes or texture images are used. See `docs/PROVENANCE.md` for the per-asset provenance record.

## Run

Requirements: Node 20+ (tested with Node 24) and a WebGL2-capable browser.

```bash
npm install
npm run dev        # http://localhost:5199
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on http://localhost:5198
```

## Using the app

- **Library (left):** filter by country or category, search, expand a card for facts and
  provenance, then **Add to Ground** and click on the plinth to place (Q/E rotates the preview,
  Esc cancels). Entries without a finished model are marked unavailable and cannot be placed.
- **Scene:** click a group to select it, click again to select a single model; drag to move.
  Orbit with the left mouse button, pan with the right, zoom with the wheel.
- **Inspector (right):** Equipment options (the model updates to match), Quantity, Formation
  (Single / Line / Grid), Spacing, Columns, Rotate, Duplicate, Remove, Focus Selection,
  Reset Layout.
- **Army Overview (bottom):** Personnel, Vehicles (armour included), Artillery, Aircraft and Loose
  Equipment, counted from what is actually on the ground. Carried weapons are not counted.
- **Top bar:** Focus Selection, Reset View, Hide UI (H), Demo Display, Clear Ground.
- Keys: Delete remove, Ctrl+D duplicate, F focus, H hide UI, Q/E rotate 15 degrees,
  Ctrl+Z / Ctrl+Shift+Z undo / redo. The layout is saved in the browser and restored on reload.
- Limits: each entry has a per-group maximum and a display holds up to 200 models; both are shown
  in the UI when reached.

## Project layout

```
src/core/        renderer (studio), bake, registry, materials, geometry + SDF kit, stage (plinth, light)
src/app/         application: store, scene, placement, camera, library, inspector, overview, demo
src/assets/      catalog entries: <faction>/<name>.asset.ts (auto-discovered) + helper folders
  shared/        weapon/gear contracts, display stands, human base (skeleton, poses, uniforms, fitting)
src/harness/     review harness (harness.html) used by scripts/snap.mjs
docs/            SPEC.md (client brief), ASSET_GUIDE.md (modelling rules), PROVENANCE.md, briefs/
scripts/         snap.mjs (headless review renders), provenance.mjs (regenerates docs/PROVENANCE.md)
```

## Adding or reviewing a model

Read `docs/SPEC.md` and `docs/ASSET_GUIDE.md`. A catalog entry is a default-exported `AssetDef` in
`src/assets/<faction>/<name>.asset.ts`; it is picked up automatically. Review it with the dev server
running:

```bash
node scripts/snap.mjs germany/panzer-iv-h --ref          # 6-view contact sheet + 1.80 m scale figure
node scripts/snap.mjs germany/rifleman --config '{"headgear":"cap"}'
node scripts/snap.mjs --app --w 1600 --h 1000            # the whole app
node scripts/provenance.mjs                              # regenerate docs/PROVENANCE.md
```

Only models that reach display quality may be marked `status: 'available'`.

## License

MIT - see [LICENSE](LICENSE). All models and textures are procedurally generated in code for this project (see docs/PROVENANCE.md).
