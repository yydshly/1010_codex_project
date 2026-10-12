# Muster — WWII Model Archive: Product Specification

This is the authoritative brief (translated faithfully from the client's original request).
Every contributor must read it. When in doubt, the client's words below win.

## 0. What this is

A **hands-on 3D military model archive** for WWII: the user picks a country or faction, browses
soldiers, weapons, equipment, vehicles, artillery and aircraft, places them on a 3D display ground,
adjusts quantities and arrangement, and composes their own **army display**.

**It is NOT a strategy game.** Core experience: pick models, configure equipment, set quantities,
place, rotate the view, and admire up close.

- Desktop web first.
- **All text in the project is English**: UI, buttons, categories, equipment descriptions, hints,
  empty states. English is only the language — the project is **not US-centric**.

## 1. Core aesthetic: fine military models, not game pieces

The look is a blend of **collector-grade military scale models, professional product photography,
and a miniature diorama display**. The user should feel they are arranging a set of well-made models
with believable materials that can be admired from any angle — never cheap low-poly game units.

- Soldiers, vehicles and aircraft keep **real proportions and material language**. Even on a
  diorama-style ground they must NOT look like wooden chess pieces, uniform metal statues,
  plastic toys or cartoon models.
- Visual priorities: **clear silhouettes, correct proportions, rich but restrained detail,
  real material differences, pleasant light, tidy display composition.**
- **No exaggerated faction colours** painted over equipment. Uniforms and vehicle paint follow the
  historical model and period depicted; nationality is communicated mainly by UI labels.

## 2. 3D models — the most important part of the project

Models must be **true 3D assets you can walk around** — not photo cards, front-only art, or fake 3D
that only works from one angle. Front, side, back and top views must all hold up, with enough
detail for close inspection.

**Soldiers:** natural human proportions; uniforms with plausible thickness and folds. Helmet, belt,
ammunition pouches, pack, canteen, boots and webbing have clear **modelled structure** (not blurry
textures painted onto the body). Hands hold weapons plausibly — **no clipping, no floating**. Faces
can be restrained (no need for extreme realism) but must not be so crude they break overall quality.

**Small arms & equipment:** clearly recognisable shapes. Stock, barrel, receiver, sights and sling
have sensible structure; **wood, metal, canvas and leather read as different surfaces**. Do not
make every weapon a similar black stick.

**Vehicles & armour:** believable hull silhouette, wheels or tracks, hatches, tools, grilles and
external fittings with structural layering — **not a few boxes plus a barrel**. Tracks and wheels
touch the ground; external fittings are properly attached.

**Artillery:** barrel, shield, carriage, wheels and supports are clear; the deployed or display
state is visually plausible; no floating or interpenetrating parts.

**Aircraft:** wings, tail, cockpit, engine area, landing gear and fuselage in accurate proportion.
Canopy glass is clearly different from painted metal. **Default is parked, gear down, on the
ground** — aircraft never hover without reason.

**Weathering is moderate:** a little edge wear, dust and use marks for realism — not rusty wrecks.

**Few masterpieces over many rough assets.** The first version may cover only a few countries and
representative equipment, but must offer **at least two countries with real usable content**,
covering the main model categories. **Only assets that reach display quality may be marked
available.**

## 3. Ground, light and materials

The ground is a simple, tactile display surface: **grey-brown compacted soil, fine sand, a little
gravel and very restrained short grass.** A low, clean-edged **display plinth** reinforces the feel
of a physical diorama base.

No buildings, ruins, trees or battlefield clutter. The ground is a backdrop for the models and must
not steal attention. Terrain is flat or very gently undulating, easy to place on and view.

Lighting: **soft studio-style key light, some fill, natural contact shadows.** Shadows explain how
tyres, tracks and boot soles meet the ground. **Dark areas must still show model detail** — never
hide modelling quality with overly dark "cinematic" lighting.

Materials must be clearly different:
- Painted steel: restrained roughness and slight wear, **not chrome**.
- Cloth: soft folds and fine texture, **not rubber**.
- Leather and wood keep their own surface character.
- Glass: controlled reflection and transparency, **not black solid plastic**.

All models must be clear from the default view and hold up in close inspection. **Do not rely on
strong depth of field, dense fog, heavy filters or bloom** to fake refinement.

## 4. Library & country selection

Countries/factions are **browsing and composition categories, not sides in a battle.**
Filter by country or faction, then browse by category:
`Infantry` · `Weapons` · `Equipment` · `Vehicles` · `Armor` · `Artillery` · `Aircraft`

Each entry: clear model preview, English name, country, category, short introduction.
**Historical info such as service period is only filled in when verified.**

Card previews **come from the actual placeable model**, with consistent background, angle and light.
Never lure users with high-quality historical photos that turn into a different, crude model once placed.

Switching library filters must **never silently clear** the arranged scene. Entries without a usable
model are **clearly shown as unavailable** — never a placeholder pretending to be finished.

Use self-made, licensed or permitted models and textures, and **keep an asset provenance record**.
**Never invent historical models, national attributions or equipment descriptions.**

## 5. Soldier & equipment configuration

Users pick a soldier type, then configure **compatible** weapons and carried equipment.
The configuration is **reflected directly on the 3D model**: the chosen weapon appears in the hands
or a sensible carry position, the pack appears on the back, other gear attaches in the right place.
Never just change text on the right while the model stays the same.

Keep it simple: a few well-made fixed poses and gear combinations — no complex body editor, arbitrary
dressing system or animation system. Soldiers are static: e.g. natural standing, standing holding a
weapon, or a static pose matching the equipment. **No palms through gun bodies, floating slings or
packs embedded in bodies.**

Weapons have two clearly different states: **equipped on a soldier**, or **displayed as a standalone
object**; the latter can use a simple small display stand so it is never half-buried in the ground.

## 6. Free placement & quantity

After choosing an entry the user can place it on the ground and **move, rotate, duplicate and
delete** it. The placement preview is clear; placed models never float or sink.

Models in one group share the same model and configuration; the user can **set the group's quantity
directly** — change 1 to 8 and 8 models actually appear; reduce it and the corresponding instances
are removed.

Simple arrangements are enough: `Single` · `Line` · `Grid`.
Users can adjust spacing, move the whole group, and fine-tune individual models. **When quantity
increases, new models fill new formation slots first — never scramble a layout the user adjusted.**

**Soldiers, vehicles, artillery and aircraft share one consistent real scale.** Never shrink an
aircraft to soldier height to make things look similar. Large equipment needs larger spacing and
viewing room.

Counts must match the scene. **A weapon carried by a soldier is personal equipment and must not be
counted again as a separate unit.** Count separately:
`Personnel` · `Vehicles` · `Artillery` · `Aircraft` · `Loose Equipment`

No budget, resources, population caps or combat power. Counts only describe the display. If there
are performance limits, **say so clearly** — never show dozens of units in the UI while rendering
only a few.

## 7. Viewing & camera

Free orbit, zoom and pan; quickly focus a selected object. The overall view suits admiring the
arrangement; close-ups suit inspecting a single model's uniform, mechanics, paint and materials —
the zoom range covers both.

Selection feedback is a **subtle outline or a low-key ground marker** — never tint models with a glow.
Provide `Hide UI` to view only the clean 3D display.

**No automatic show animations.** Soldiers don't walk, turrets don't patrol, propellers don't spin,
nothing fires, no battle effects. Dragging models and moving the camera are necessary interactions,
but **with no input, the scene stays still.**

## 8. Interface: the 3D scene is the star

The UI feels like a refined model reference tool, not a military game HUD.
Dark graphite or soft charcoal panels, warm light text, fine dividers, low-saturation accent colour.
Clear typography, generous spacing. **No camouflage backgrounds, neon green, exaggerated stencil
military fonts or piles of decorative badges.**

Layout:
- **Top:** project name, country/faction selector, a few view controls.
- **Left:** categories, search, model cards.
- **Centre:** the 3D scene taking most of the area, as unobstructed as possible.
- **Right:** the selected model or group: name, quantity, equipment, formation, rotation.
- **Bottom:** a concise army composition summary, not a dense dashboard.

UI copy may use: `Country / Faction`, `Search Models`, `Add to Ground`, `Quantity`, `Equipment`,
`Formation`, `Spacing`, `Rotate`, `Duplicate`, `Remove`, `Focus Selection`, `Army Overview`, `Hide UI`.

**No attack, defence, XP, skill trees, win rates or upgrade buttons.**

## 9. First screen & definition of done

On open, the user first sees a **small, refined, pre-arranged demo display** — not an empty ground:
e.g. a few soldiers, one vehicle, one artillery piece and one aircraft, with enough space that scale,
materials and composition read at a glance.

Provide a way to clear the scene and start over. No forced tutorial or sign-up.

Done is **not** "all buttons clickable". All of these must hold at once:
- models still look refined up close;
- changing quantity really updates the scene;
- soldier equipment matches the chosen configuration;
- every object shares a consistent, correct scale and sits on the ground;
- the UI does not compete with the scene;
- the project has no unnecessary game systems.

The result should feel like a premium 3D military model archive you can freely arrange and admire.
Spend the main effort on **modelling, materials, lighting, display composition and the viewing
experience** — not on animation, combat mechanics or complex features.
