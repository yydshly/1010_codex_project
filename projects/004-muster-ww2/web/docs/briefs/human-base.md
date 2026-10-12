# Brief: Human base system (shared by all soldier assets)

You own `src/assets/shared/human/` and the hidden test asset `src/assets/_test/human-base.asset.ts`.
Two infantry authors (Germany, Soviet Union) will build uniforms, gear fitting and catalog entries
ON TOP of your system as soon as you finish — your API and its documentation are their foundation.
This is the hardest and most important modelling task in the project: soldiers must look like
**collector-grade figures with natural human proportions**, not mannequins, dolls or toys.

## What to build

1. **Anatomy & skeleton** (`skeleton.ts`): adult male, stature ~1.76 m (param), realistic
   proportions (head ~1/7.5 of stature; shoulder breadth ~0.40-0.46 m over clothing; hip, limb
   lengths, hand size ~0.19 m long). Joint hierarchy with positions & orientations. A neutral
   natural stance: slight weight shift, feet ~0.2-0.3 m apart, toes out ~8-12 degrees, relaxed
   shoulders, arms slightly bent. Nothing stiff or symmetric like a T-pose statue.

2. **Poses** (static, a small fixed set), each fully defined including where the weapon sits
   relative to the body (weapon-local frame per `src/assets/shared/contracts.ts`):
   - `stand` — natural standing, hands relaxed (for completeness/tests).
   - `port-arms` — rifle held diagonally across the chest: right hand on the wrist of the stock at
     the right hip, left hand under the fore-end at the left shoulder height, muzzle up-left.
   - `order-arms` — rifle upright at the right side, butt on the ground beside the right boot toe,
     right hand gripping near the upper band / fore-end, left arm hanging naturally.
   - `low-ready` — SMG/LMG held at waist level pointing forward and slightly down: right hand on
     the trigger grip, left hand on the support grip; elbows natural.
   - `shoulder-carry` (optional, if it looks right) — LMG carried over the right shoulder.
   Arms reach the weapon grips with analytic two-bone IK; elbows point naturally (down/out);
   wrists rotate so palms meet `Grip.palm`. The weapon's **Grip metadata** (position, axis, palm,
   radius) drives hand placement. Order-arms must place the butt exactly on y = 0.

3. **Body & skin** (`body.ts`): SDF anatomy for the posed body (smooth unions of round cones /
   ellipsoids; realistic masses: chest, shoulders/deltoids, back, hips, thighs, calves). The body is
   mostly hidden by clothing — it is the base surface garments are offset from. Visible skin:
   - **Head & neck**: restrained, believable adult male face at 2.5-3.5 mm cells — cranium, brow
     ridge, eye sockets with subtle closed/neutral eyes (no cartoon eyeballs), nose, cheekbones,
     mouth, jaw, chin, ears. Short military haircut can be a slight darker cap region via a hair
     material part. Must hold up at 0.5 m camera distance. Not creepy, not a doll.
   - **Hands**: each finger a chain of 3 segments with knuckles, thumb opposition, palm pad.
     Two hand builders: `gripHand(grip, side)` that wraps fingers around a cylinder of
     `grip.radius` (fingertips outside the surface — no penetration, no gap > 3 mm) and
     `relaxedHand(side)`. ~2-3 mm cells.
   Skin material: `M.skin(...)`, restrained.

4. **Garment toolkit** (`garment.ts`): helpers so country authors can express uniforms compactly:
   - offset shells from the body SDF with thickness (wool ~6-12 mm off the body), cut by planes
     (hems, cuffs, collar openings) so edges show **real thickness**;
   - fold/drape displacement: compression folds at elbows, back of knees, waist gathering under a
     belt, gravity drape on sleeves and trouser legs — amplitude restrained (3-8 mm), coherent,
     not noise;
   - trouser legs tucked into boots / bloused over boot tops; boots (tall jackboots and short ankle
     boots with separate soles and heels, laces optional);
   - surface-conforming details: pocket + pleat + flap patches (thin shells following the surface),
     button (lathe) placement on the surface with the correct normal, collar, shoulder straps,
     seams as subtle grooves.
   Provide a documented `UniformSpec` type (colours/materials, tunic length, collar style,
   pocket list, trousers style, boot style, headgear none) that `buildSoldier` consumes.

5. **Fitting API** (`fit.ts`) for gear: the clothed-body SDF and helpers:
   `surfacePoint(dirFromTorsoCentre or seed point)` → {position, normal};
   `beltPath(height, outwardOffset)` → closed curve hugging the tunic at the waist;
   `strapPath(controlPoints, offset)` → points projected onto the clothed surface (for Y-straps,
   slings, shoulder straps) to feed `G.strap`;
   `mountFrame(mount: GearMount)` → Matrix4 for rigid gear items on the belt/back/hip/chest so the
   item's back face sits ON the surface (no gap, no intersection);
   `headFrame()` → where helmets/caps sit (brow line, crown), plus head dimensions.

6. **Assembly** (`soldier.ts`): `buildSoldier({ uniform, pose, weapon?, gear[], straps[] ... })`
   returning a THREE.Group in asset space (origin between the feet on y = 0, facing +Z), weapon in
   the hands (weapon object transformed into pose), and all parts. Cache heavy SDF meshes by
   (pose, uniform) key. Budget: ≤ 150k triangles, build ≤ 2.5 s per new variant (measure with the
   harness), cached variants instant.

7. **Documentation**: `src/assets/shared/human/README.md` — the API, the coordinate conventions,
   how to write a UniformSpec, how to add gear and straps, how grips/poses work, and known limits.
   The country authors will rely on it, so be precise.

8. **Test asset** `src/assets/_test/human-base.asset.ts` (hidden: true): options `pose` (all poses)
   and a simple test uniform (plain olive wool tunic & trousers, boots, no gear) with a test weapon:
   create a simple test rifle and test SMG in `src/assets/_test/` implementing `WeaponModel` with
   correct grips (real weapons are being built in parallel by others; when these exist you may
   also try them: `src/assets/germany/weapons/kar98k.model.ts` exports a WeaponModel builder).

## Quality bar & review

Snap every pose from front, side, back, 3/4, and close-ups of face and both hands:
`node scripts/snap.mjs _test/human-base --config '{"pose":"port-arms"}' --out .snaps/human-port.png`
`node scripts/snap.mjs _test/human-base --config '{"pose":"port-arms"}' --yaw 20 --pitch 5 --dist 0.9 --target 0,1.25,0.1 --out .snaps/human-hands.png`
Use `--ref` to compare with the 1.80 m scale figure. Check: proportions, posture reads as a real
person, cloth thickness at hems, folds believable, hands wrap the grips without clipping, feet flat
on the ground (minY 0), face acceptable at close range. Iterate many rounds (10+). Compare against
reference photos of WWII infantry figures / anatomy references you find online.
