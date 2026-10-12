# Brief: Field gear (rigid items) — one author per country

You build the **rigid carried items** for your country's infantry as reusable `GearPiece` modules
(see `src/assets/shared/contracts.ts`) AND a few of them as standalone **Equipment** catalog entries.
The infantry author for your country will attach your pieces to soldiers after you finish, using the
human-base fitting API, and will draw belts/straps along the body themselves.

## Conventions for gear pieces
- Gear-local frame: +Z points AWAY from the body, +Y up when worn, the face that touches the
  body/belt lies on z = 0, origin at the attachment point (belt-loop centre for belt items).
- Head items (helmets): origin at the centre of the head opening at the rim/liner-band plane,
  +Z = forward (brow side), +Y up. Standard head to fit: width ~0.155 m, length ~0.195 m,
  crown ~0.12 m above the brow line. The helmet shell must have real thickness, rolled/flared edge
  as appropriate, liner band and chinstrap (chinstrap hangs or is shown as a separate piece the
  infantry author can position; provide `chinstrap: 'open' | 'none'` builder param).
- Every piece: modelled structure (flaps, straps, buckles, stitching grooves, rivets, loops),
  correct materials (leather vs canvas vs painted steel vs felt vs aluminium), real dimensions.
- Export builder functions, e.g. `export function buildM40Helmet(opts): GearPiece`, from
  `src/assets/<faction>/gear/*.ts`, plus an `index.ts` listing all pieces with short docs.

## Standalone Equipment catalog entries
Each as `src/assets/<faction>/<name>.asset.ts`, category 'Equipment', countAs 'looseEquipment',
presented on the shared `itemPlinth()` (from `src/assets/shared/display.ts`) or resting naturally
on the ground if it has a stable base — never half-buried. Summary + verified facts + provenance.

## Germany (Heer, 1943-44) — items
- M40 (or M42 — pick one, research differences, name it correctly) steel helmet: field-grey paint,
  vent grommets (M40), leather liner & chinstrap.  → also a catalog entry.
- M24 stick grenade (Stielhandgranate 24): wooden handle, steel head, cap at the handle end. → catalog.
- M31 canteen with cup and felt cover, leather strap (Feldflasche 31 + Trinkbecher). → catalog.
- Entrenching tool (straight-handle small shovel, 1938-pattern folding or the older straight one —
  pick one and name it correctly) in its leather/pressed-cardboard carrier, with the S84/98 bayonet
  scabbard + frog mounted on the carrier. → catalog ("Entrenching Tool with Bayonet").
- K98 cartridge pouches (triple leather pouches, M1911/M1933 pattern) — worn in pairs.
- MP 40 magazine pouches (canvas triple pouches with leather straps) — worn in pairs.
- M31 bread bag (Brotbeutel) — canvas with flap and leather tabs/straps.
- M38 gas mask canister (fluted steel canister) with strap.
- Assault pack frame (Gefechtsgepaeck A-frame webbing) with M31 mess tin (Kochgeschirr) and a
  rolled Zeltbahn — as one back piece.
- Belt buckle (Koppelschloss): plain embossed roundel, do NOT depict a swastika.
- P38 holster (for the MG gunner) and a small tool pouch.

## Soviet Union (Red Army, 1943-44) — items
- SSh-40 steel helmet: green paint, six-rivet liner, chinstrap. → catalog.
- F-1 hand grenade: segmented cast-iron body with UZRG fuze. → catalog.
- MPL-50 small infantry shovel in canvas cover. → catalog.
- Canteen (aluminium or glass) in a cloth cover with strap. → catalog.
- M1937 leather rifle cartridge pouches (two-compartment), worn in pairs.
- PPSh-41 drum magazine pouch (canvas), and a box-magazine pouch variant.
- Grenade pouch (canvas).
- Veshmeshok (duffel-bag backpack with drawstring neck and shoulder strap loop).
- Skatka (rolled greatcoat worn over the left shoulder, ends tied together): provide a
  parametric rolled-coat builder (roll diameter ~0.10-0.12 m, ring size) the infantry author can
  fit around the torso; it must look like rolled wool, with the tie strap.
- Belt buckle: plain open-frame buckle for enlisted men (not the officers' star buckle).

## Review
Snap each piece (via a hidden `_test` asset showing all pieces laid out on the plinth, e.g.
`src/assets/_test/<faction>-gear.asset.ts`, hidden: true) and each catalog entry, including close-ups
at 0.3-0.6 m. Verify real dimensions with references (WebSearch). Iterate until each item reads as
a well-made scale model with distinct materials.
