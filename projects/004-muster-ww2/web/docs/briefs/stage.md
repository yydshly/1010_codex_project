# Brief: Stage — display ground, plinth, lighting, background

You own `src/core/stage/ground.ts` and `src/core/stage/lighting.ts` (you may also tune the
post-processing parameters in `src/core/studio.ts#setupPost/adaptToDistance`, carefully).
Every other author renders through this stage right now, so **never leave these files broken**:
make small verified steps (edit → `npx tsc --noEmit` → snap) and keep the public API
(`buildGround`, `PLINTH`, `GroundHandle`, `createLighting`, `LIGHT_DIR`) stable.

## Goals (SPEC section 3)
- The plinth reads as a **physical diorama display base**: low, clean-edged, refined (e.g. dark
  satin lacquer or oiled hardwood sides with a crisp chamfer), topped with a soil layer. The soil top
  stays exactly flat at y = 0 inside `PLINTH` (models are placed there and must not float/sink);
  gentle undulation only in normal detail / albedo, or strictly outside the placeable area.
- Soil: **grey-brown compacted earth, fine sand, a little gravel, very restrained short grass**.
  Convincing at 0.5 m (close-up behind a boot or track) and at 60 m (whole display) — no visible
  tiling, no noise shimmer, no moire. Macro variation should be gentle so models stay the focus.
  Pebbles/grit and grass must be subtle, sparse, and not clutter; no buildings, trees, ruins.
- Studio around the plinth: calm seamless dark-warm backdrop; the plinth casts a soft shadow on it.
- Lighting: soft studio key with natural contact shadows (tyres/tracks/boots clearly grounded),
  enough fill that dark sides show detail, gentle rim for silhouette; no crushed blacks, no fog,
  no bloom, no heavy grading. Colours of paint and cloth must stay truthful (NeutralToneMapping).
- `'studio'` mode (thumbnails and review sheets): neutral, consistent background with a shadow
  catcher floor — no horizon artefacts, soft contact shadow + AO.
- Performance: the ground must stay cheap (a few draw calls; instanced/merged scatter; no heavy
  per-pixel loops). Measure with the app snapshot.

## Review
- `node scripts/snap.mjs --app --w 1600 --h 1000` (the app currently shows the empty plinth; other
  authors will add a UI over time) and harness renders with `--ground plinth` of existing assets,
  e.g. `node scripts/snap.mjs _test/calibration --ground plinth --out .snaps/stage-cal.png`.
- Close-ups: `--yaw 30 --pitch 12 --dist 0.8 --target 0,0,0 --ground plinth` and wide views.
- Check at several distances and angles, including low grazing angles and top-down.
- When other assets appear (e.g. `germany/panzer-iv-h`, `soviet/t-34-85`, soldiers), check them on
  the plinth too: contact shadows, AO, overall mood.
