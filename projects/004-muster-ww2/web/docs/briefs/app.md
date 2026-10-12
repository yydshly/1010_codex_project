# Brief: Application (UI, placement, groups, camera, demo display)

You own: `index.html`, `src/main.ts` (currently a placeholder), `src/app/**`, `src/styles/**`,
`public/**`, and four "unavailable" catalog entries (listed below). Read `docs/SPEC.md` closely:
sections 4-9 are yours. Core files (`src/core/**`) are shared — use them (Studio, registry, types,
PLINTH); if you truly need a core change, keep it minimal and backwards compatible.

Assets are being modelled in parallel by other authors and appear over time as
`src/assets/<faction>/*.asset.ts`. Your app must work with whatever is present and pick up new
ones automatically (registry `loadAllAssets()`). For development before real assets exist, hidden
test assets exist (`test-calibration`, `test-helpers`); support a URL flag `?showHidden=1` that
lists hidden assets in the library so you can exercise the UI.

## Stack
Vanilla TypeScript + three.js (no UI framework needed; keep the code well structured: state store,
scene controller, placement/interaction, panels). Font: `@fontsource-variable/inter` (installed).
Render on demand (Studio already does); OrbitControls with damping — the loop must go idle when
nothing changes (**no input → no frames, scene still**).

## Layout & visual design (SPEC section 8)
Top bar (project name "Muster", subtitle "WWII Model Archive"; `Country / Faction` selector with
All / Axis / Allies / Germany / Soviet Union; view controls: `Focus Selection`, `Reset View`,
`Hide UI`, `Clear Ground`, `Demo Display`). Left panel: categories
(`Infantry` `Weapons` `Equipment` `Vehicles` `Armor` `Artillery` `Aircraft`, with counts), `Search Models`,
model cards. Centre: the 3D scene, as unobstructed as possible (panels are side columns, not
overlays covering the middle). Right: inspector. Bottom: `Army Overview`.
Palette: deep graphite / soft charcoal panels, warm off-white text, fine 1px dividers,
one low-saturation accent (e.g. muted brass or desaturated sage). Generous spacing, clear type
hierarchy, small caps labels are fine. No camouflage, no neon, no stencil fonts, no badges.
Desktop first (min width ~1280); panels collapsible is a plus.

## Library (SPEC 4)
- Filters change the library only — **never touch the scene**; a subtle note may say so.
- Card: preview thumbnail **rendered at runtime from the actual placeable model** with a
  consistent studio background, angle and light (use a dedicated `new Studio({ ground: 'studio',
  preserveDrawingBuffer: true, ... })`, def.view yaw/pitch or a default 35/18; frame the model),
  English name, country, category, 1-2 line summary, `Add to Ground`. Clicking a card expands
  details: facts (only those in the def), full summary, provenance (method, license, references).
- Thumbnails are generated progressively in idle time without freezing the UI for long; show a
  quiet placeholder until ready. You may cache in IndexedDB keyed by id + config + a build id
  (disable caching in dev).
- Unavailable entries: clearly marked "Not available" with `unavailableReason`, no preview model,
  Add disabled. Never a placeholder model.
- Author these unavailable entries (verified real vehicles, short accurate summaries, `build`
  throws, status 'unavailable', unavailableReason "Model in production - not yet at display quality."):
  `germany/tiger-i.asset.ts` (Tiger I Ausf. E, Armor), `germany/opel-blitz.asset.ts`
  (Opel Blitz 3.6-36S, Vehicles), `soviet/is-2.asset.ts` (IS-2, Armor),
  `soviet/zis-5.asset.ts` (ZiS-5 truck, Vehicles). Verify names with a quick web search.

## Placement, groups, formations (SPEC 6)
- `Add to Ground` → placement mode: a clear translucent preview of the real model plus a
  footprint outline follows the cursor on the soil; click to place; Esc / right-click cancels;
  Q/E or R rotates the preview. Placement is clamped to the plinth (`PLINTH`, ground.clamp).
- A placed entry is a **group**: `{ id, assetId, config, quantity, formation: 'single'|'line'|'grid',
  spacing, columns, heading, anchor{x,z}, instances[{ slot, offset{dx,dz}, headingOffset }] }`.
  All instances share model & config. Quantity 1 → 8 creates 8 real instances; decreasing removes
  the last ones. New instances take the next formation slots; **existing manual adjustments are
  kept** (offsets are relative to slots and survive spacing/formation changes; `Reset Layout` clears them).
- `Single` means one model; raising quantity from Single switches to `Line` with a short note.
  `Grid` has a `Columns` control (auto = ceil(sqrt(n))).
- Interactions: click selects the group (ground markers under each instance); click the same group
  again (or Alt+click) selects just that instance ("Model 3 of 8") for individual move/rotate/reset/
  remove. Drag moves the current selection (group or instance) on the ground, never below/above it.
  Keyboard: Delete remove, Ctrl+D duplicate, F focus, H hide UI, Q/E rotate 15 degrees, Esc deselect.
  Undo/redo (Ctrl+Z / Ctrl+Shift+Z) for layout operations is a strong plus.
- Inspector (right): name, country · category, `Equipment` (options from `def.options`, using
  `def.constrain()` for compatibility: disabled options/choices shown with the reason),
  `Quantity` (stepper + number, cap = def.maxQuantity with a clear message), `Formation`
  (Single/Line/Grid), `Spacing` (def.spacing range, metres), `Columns`, `Rotate` (heading slider
  + -15/+15), `Duplicate`, `Remove`, `Focus Selection`, `Reset Layout`. Changing an option rebuilds
  the group's model (registry caches per config; show a subtle "Preparing model..." state).
  Empty state when nothing is selected: short helpful copy.
- Duplicate places a copy offset to the side (not overlapping).

## Army Overview (bottom)
`Personnel` · `Vehicles` · `Artillery` · `Aircraft` · `Loose Equipment` counted from the actual
instances in the scene by `def.countAs` (Armor counts as Vehicles; weapons carried by soldiers are
never counted). Optionally a per-country split on hover. If you impose performance limits
(per-group `maxQuantity`, a total instance cap), state them clearly in the UI — the scene must
always render every instance the counts claim.

## Camera (SPEC 7)
Orbit / zoom / pan; zoom range from ~0.35 m (inspect a face or a rifle bolt) to ~160 m (whole
display); never below the ground; target clamped to the display area. `Focus Selection` smoothly
frames the selection (a short tween on user action is fine). Keep the shadow frustum and AO
adapted to the view (`studio.fitShadows(target, r)`, `studio.adaptToDistance(d)`) after camera changes.
Optional: render at a higher pixel ratio once the camera has been idle ~250 ms (crisper stills).
Selection feedback: thin, low-opacity warm ground outline under each selected instance (and a
fainter one on hover). Never tint the model. `Hide UI` leaves only the clean scene plus a tiny
"Show UI" affordance.

## Demo display (SPEC 9)
On first load show a small, refined pre-arranged display (not an empty ground): a few soldiers,
one vehicle, one artillery piece, one aircraft, with space so scale and materials read at a glance
and a pleasing default camera. Build it from whatever real assets are available (skip missing
ones gracefully); it will be finalised later when all assets are done. `Demo Display` restores it;
`Clear Ground` (with an in-app confirm) empties the scene. Autosave the layout to localStorage
(try/catch) and restore it on reload.

## QA hooks (required — automated tests depend on them)
Set `window.__appReady = true` once the demo display has been placed and rendered.
Expose `window.__app` with at least: `listAssets()`, `addGroup(assetId, config?, pos?, quantity?)`
→ groupId, `setQuantity(id, n)`, `setFormation(id, f)`, `setSpacing(id, m)`, `setConfig(id, patch)`,
`setHeading(id, deg)`, `select(id, instance?)`, `duplicate(id)`, `removeGroup(id)`, `clear()`,
`loadDemo()`, `getCounts()`, `getGroups()`, `getRenderedInstanceCount()` (instances actually in
the scene graph), `focus(id?)`, `setCamera({ target:[x,y,z], distance, yaw, pitch })`, `hideUI(b)`,
`setFilter(faction)`, `whenIdle()` (resolves when all pending model builds are done).
Screenshot the app with `node scripts/snap.mjs --app --w 1600 --h 1000 --eval "await window.__app.whenIdle()"`.

## Done when
All SPEC 4-9 behaviours work, verified by screenshots and by `__app` scripted checks (quantity
1→8→3 renders exactly that many; filters don't clear the scene; counts match; hide UI works;
unavailable entries can't be placed), `npx tsc --noEmit` is clean for your files, and the UI
looks like a refined reference tool.
