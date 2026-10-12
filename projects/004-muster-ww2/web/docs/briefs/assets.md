# Briefs: individual catalog models (weapons, vehicles, armour, artillery, aircraft)

Common rules for every author: read `docs/SPEC.md` and `docs/ASSET_GUIDE.md` first; own only the
files listed; ASCII-only source; Edit/Write tools only (never PowerShell Set-Content/Out-File);
never start/stop the dev server (http://localhost:5199), never `npm install`, no git state changes;
review with `node scripts/snap.mjs <faction>/<asset> --out .snaps/<key>-<n>.png` and Read the PNG;
type-check only your folder (`npx tsc --noEmit 2>&1 | grep -F "<your folder>"`).

## Weapons (common)
Deliver TWO files per weapon:
1. `src/assets/<faction>/weapons/<name>.model.ts` exporting `build<Name>(opts?): WeaponModel`
   (contract: `src/assets/shared/contracts.ts`). Weapon-local frame: bore along +Z (muzzle +Z),
   top/sights +Y, weapon's left +X, ORIGIN = trigger-hand grip centre. Accurate `grips.trigger` and
   `grips.support` (position, axis, palm, radius, length), `shoulder`, `muzzle`, `restPoints` on the
   underside, `sling.build(gravityLocal, slack)` if it has a sling (hangs naturally for any gravity
   direction; the weapon object must NOT include the sling). Soldier builders import these modules:
   keep exports stable and documented in a header comment.
2. `src/assets/<faction>/<name>.asset.ts`: catalog entry (category 'Weapons', countAs
   'looseEquipment') on the shared `weaponStand()` (`src/assets/shared/display.ts`), base on y = 0.
Close-ups at 0.3-0.8 m must hold up (machining, sights, bands, screws, stamped seams, perforations
with depth, wood grain along the stock, bakelite vs wood vs blued steel vs sling). <= 60k tris.

- **Kar98k** (`germany/kar98k`, id `de-kar98k`): 7.92x57mm, 5-round, ~1110 mm, barrel ~600 mm. Walnut or
  laminated stock (state which), semi-pistol-grip wrist, upper handguard, two bands, bayonet lug,
  cleaning rod, hooded front sight, tangent rear sight, turned-down bolt with knob, butt sling slot +
  lower-band swivel, steel butt plate, butt disc, floorplate + trigger guard. Trigger grip = wrist;
  support = fore-end near balance point.
- **MP 40** (`germany/mp40`, `de-mp40`): 9x19mm, 32-round, ~833 mm extended / ~630 mm folded. Underfolding
  stock (option), ribbed receiver tube, left bolt handle + safety notch, phenolic grip panels and
  fore-grip housing, resting bar under muzzle, hooded front sight, flip rear sight, sling. Support
  grip = magazine housing.
- **MG 42** (`germany/mg42`, `de-mg42`): 7.92x57mm, ~1220 mm, barrel ~533 mm, ~11.6 kg. Perforated jacket with
  right-side barrel-change opening + latch, muzzle booster + flash cone, folding bipod (option), stamped
  receiver, top feed cover + tangent rear sight, folding AA sight, pistol grip, butt with shoulder rest,
  50-round belt drum with belt stub (option). Asset option Display = On stand | On bipod (feet + butt on y = 0).
- **Mosin-Nagant M1891/30** (`soviet/mosin-9130`, `su-mosin-9130`): 7.62x54mmR, ~1232 mm (1660 with bayonet),
  barrel ~730 mm. Round receiver, straight bolt handle, hooded post front sight, tangent rear sight, two
  spring bands, one-piece stock with straight wrist, handguard, cleaning rod, sling slots + sling, butt
  plate, magazine box + floorplate latch. Spike bayonet fixed/none (option).
- **PPSh-41** (`soviet/ppsh41`, `su-ppsh41`): 7.62x25mm, ~843 mm, barrel ~269 mm. Perforated jacket with
  slanted compensator front, hinged receiver, wooden stock (wrist + forward section), 71-round drum or
  35-round box (option), rear sight (name the variant), hooded front sight, bolt handle + safety, sling.
- **DP-27** (`soviet/dp27`, `su-dp27`): 7.62x54mmR, ~1270 mm, barrel ~605 mm, 47-round flat ribbed pan on
  top, perforated shroud, conical flash hider, folding bipod (option), wooden butt with wrist (no pistol
  grip), receiver rear sight, front sight with ears. Display = On stand | On bipod.

## Vehicles, armour, artillery, aircraft (common)
Deliver `src/assets/<faction>/<name>.asset.ts` (+ helpers in `src/assets/<faction>/<name>/`).
Plan: research dimensions -> part breakdown + palette -> primary masses with correct proportions
(verify bounds with `--ref`) -> structural layering area by area -> ~10 review rounds incl.
`--views q-front,q-rear-l,bottom`, ground-contact view and close-ups at 1-3 m -> summary, verified
facts, provenance. Wheels/tracks/spades on y = 0, never floating/sinking.

- **Volkswagen Type 82 Kübelwagen** (`germany/kubelwagen`, Vehicles, countAs vehicles): 1943-44, Dunkelgelb.
  ~3.74 x 1.60 m, wheelbase ~2.40 m. Pressed panels with stiffening swages, four doors, folding windscreen
  with glass, folded canvas top, spare wheel on the bonnet, headlamps + Notek, rear engine louvres,
  5.25-16 tyres on pressed wheels with hub caps, rear reduction hubs, seats, wheel, dash. Finished interior.
  <= 350k tris, spacing ~6 m. (Partial files exist: body.ts, dims.ts, palette.ts, util.ts.)
- **GAZ-67B** (`soviet/gaz-67b`, Vehicles): 1944-45, 4BO green. ~3.35 x 1.69 m, wheelbase ~1.85 m. Open body,
  tall flat grille with vertical bars, separate headlamps, flat front wings, folding windscreen with glass,
  folded canvas top, spare wheel, seats, wheel, dash, leaf springs + axles, disc wheels. <= 350k, spacing ~6 m.
- **Panzer IV Ausf. H** (`germany/panzer-iv-h`, Armor, countAs vehicles): 1943, no Zimmerit, Dunkelgelb.
  Hull ~5.89 m (7.02 m with gun), 2.88 m wide (3.29 m with skirts), ~2.68 m high. 7.5 cm KwK 40 L/48 +
  double-baffle brake + mantlet; turret side hatches + cupola (glass vision blocks); turret Schuerzen
  with doors; hull Schuerzen on rails (option Fitted | Removed); 8 road wheels/side in 4 leaf-sprung
  bogies, 4 return rollers, front sprocket, rear idler; individual track links (~99/side, 400 mm);
  glacis visor + bow MG; engine deck hatches/grilles; rear muffler; tools, spare links, headlights +
  Notek, tow hooks, antenna base. Crew 5. <= 500k, spacing ~9 m. (Partial: running gear + tracks done.)
- **T-34-85** (`soviet/t-34-85`, Armor): 1944 (Factory 183 pattern), 4BO green. 8.15 m with gun, hull ~6.1 m,
  3.0 m wide, ~2.7 m high. 85 mm ZiS-S-53 + mantlet; cast turret (M.castPaint), cupola, two roof
  ventilators, loader hatch, handrails; driver hatch, bow DT ball mount; 5 Christie road wheels/side,
  rear roller-type sprocket, front idler; 500 mm individual links (alternating horned/flat, ~72/side),
  top run resting on the road wheels (no return rollers); external fuel tanks (verify 1944 layout),
  engine deck louvres, rear plate exhausts, tow hooks, spare links, tool box, cables. Crew 5. <= 500k,
  spacing ~9.5 m. (Partial: dims, palette, running, track, util.)
- **7.5 cm PaK 40** (`germany/pak-40`, Artillery, countAs artillery): Dunkelgelb. Deployed default, option
  Trails = Deployed | Closed. L/46 barrel + double-baffle brake, cradle + recuperator, spaced angled
  two-layer shield with sight aperture, axle + pressed disc wheels, split tubular trails + spades +
  handles, hand wheels, sight, sliding breech. Barrel ~3.45 m, length ~6.2 m, width ~2.0 m, height ~1.2 m.
  <= 350k, spacing ~7.5 m. (Partial: layout, ordnance, palette, util.)
- **ZiS-3** (`soviet/zis-3`, Artillery): 76 mm divisional gun M1942, 4BO green. Deployed default, option
  trails. Barrel with prominent muzzle brake, recoil gear under the barrel, upper carriage, single-plate
  shield, split tubular trails + spades, pneumatic-tyred wheels, hand wheels, sight, vertical sliding
  breech. ~6.1 x 1.6 x 1.4 m. <= 350k, spacing ~7.5 m. (Partial asset exists: trails, wheels, carriage.)
- **Messerschmitt Bf 109 G-6** (`germany/bf-109-g6`, Aircraft, countAs aircraft): parked tail-down, gear
  down, prop static. Span 9.92 m, length ~9.0 m. DB 605 nose with MG 131 bulges, port supercharger
  intake, 3-blade prop + spinner, chin oil cooler, two underwing radiators, slats, narrow outward-
  retracting gear + doors, tail wheel, framed canopy or Erla Haube (name correctly) with real glass,
  head armour glass, antenna mast + wire, nav lights, restrained panel lines. RLM 74/75 upper with
  mottled sides, RLM 76 lower; Balkenkreuz. NO tail swastika (state omission in provenance notes).
  <= 500k, spacing ~14 m. (Partial: frame.ts, geom.ts, paint.ts.)
- **Ilyushin Il-2 (two-seat)** (`soviet/il-2`, Aircraft): 1943-44 with swept outer wings, parked
  tail-down. Span ~14.6 m, length ~11.6 m. Armoured forward fuselage, AM-38F cowling + intakes +
  exhausts, 3-blade prop, main gear retracting rearwards into underwing fairings (legs hang from them),
  tail wheel, pilot canopy + rear gunner position with MG, wing cannons (research common fit), optional
  RS-82 rails. 1943+ scheme (upper green/black, lower light blue), red stars (research outline style).
  <= 500k, spacing ~19 m.
