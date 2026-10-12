# Brief: Infantry (soldier catalog entries) — one author per country

You start after three things exist: the human base system (`src/assets/shared/human/`, read its
README first), your country's weapons (`src/assets/<faction>/weapons/*.model.ts`, WeaponModel
builders with grips) and your country's gear pieces (`src/assets/<faction>/gear/`). You build the
**uniform**, fit **gear and straps**, and publish the **Infantry catalog entries**.

## Requirements (from the client brief — non-negotiable)
- Configuration is reflected ON THE MODEL: the chosen weapon is in the hands (or slung), the pack
  is on the back, pouches/canteen/shovel/grenades attach at the right places. Toggle an option and
  the 3D model changes accordingly.
- Compatible choices only: each soldier type offers only weapons it would carry; ammunition pouches
  follow the weapon automatically (rifle pouches for a rifle, magazine pouches for an SMG, etc.).
  Use `constrain()` to normalise configs and report disabled options/choices with a short reason.
- Poses are a few fixed static poses matched to the weapon (see human base: port-arms, order-arms,
  low-ready, ...). Offer a `pose` option only with poses valid for the current weapon.
- **No hands through gun bodies, no floating slings, no packs embedded in the body**, no gaps
  between gear and body. Webbing/straps follow the body surface (use the fitting API + `G.strap`).
- Uniform: plausible thickness at hems/cuffs/collar, soft folds, wool/cotton texture, correct
  colours for the period. Boots meet the ground (minY 0).
- Soldiers in a group are identical per config (that is expected).
- Performance: ≤ 180k triangles per soldier, build ≤ 2.5 s per new variant.
- One catalog entry per soldier type. Category 'Infantry', countAs 'personnel'. Summaries are short,
  neutral and accurate; facts only verified (e.g. "Depicted: 1943-44", "Primary weapon: ...").
  Carried weapons are personal equipment (never counted as separate units — the framework handles
  counting; you just don't add weapons as separate groups).

## Germany (Heer, 1943-44) — `src/assets/germany/`
Uniform module `src/assets/germany/infantry/` (uniform spec, gear layout, shared builder).
- Field-grey wool M40 (or M43 — choose, research, name correctly) field tunic: four pleated/flap
  pockets, five front buttons, collar with collar patches (Litzen), shoulder straps; wool trousers;
  marching boots (Marschstiefel) or ankle boots with canvas gaiters (choose per period, justify).
- Headgear option: steel helmet (from gear) / M43 field cap (you model the cap).
- Belt with buckle, Y-straps (Koppeltraggestell) over the shoulders to the belt, bread bag at the
  right rear hip with canteen, gas mask canister on its strap, entrenching tool + bayonet at the
  left hip, optional assault pack frame with mess tin on the back, optional stick grenade tucked
  in the belt.
Catalog entries:
- `germany/rifleman.asset.ts` — "Rifleman (1943-44)": Kar98k; poses port-arms / order-arms; K98 pouches.
- `germany/squad-leader.asset.ts` — "Squad Leader (1943-44)": MP 40 (low-ready); MP 40 pouches.
- `germany/machine-gunner.asset.ts` — "MG 42 Gunner (1943-44)": MG 42 (low-ready or shoulder-carry);
  pistol holster + tool pouch instead of rifle pouches.
Options (as applicable): Weapon, Pose, Headgear, Assault pack, Gas mask canister, Bread bag & canteen,
Entrenching tool, Stick grenade.

## Soviet Union (Red Army, 1943-44) — `src/assets/soviet/`
Uniform module `src/assets/soviet/infantry/`.
- M43 gymnastyorka (pullover tunic, standing collar, shoulder boards (pogony), two chest pockets on
  the M43 or none — research), sharovary breeches, and either kirza tall boots or ankle boots with
  obmotki puttees (a choice option is welcome), khaki colour.
- Headgear option: SSh-40 helmet (from gear) / pilotka side cap (you model the cap, star badge).
- Belt with frame buckle, cartridge pouches, canteen in cover, MPL-50 shovel at the hip, grenade
  pouch, optional veshmeshok on the back, optional skatka (rolled greatcoat over the left shoulder).
Catalog entries:
- `soviet/rifleman.asset.ts` — "Rifleman (1943-44)": Mosin-Nagant M1891/30 (bayonet fixed option if
  the weapon model supports it); poses port-arms / order-arms.
- `soviet/submachine-gunner.asset.ts` — "Submachine Gunner (1943-44)": PPSh-41 (low-ready); drum pouch.
- `soviet/machine-gunner.asset.ts` — "DP-27 Gunner (1943-44)": DP-27 (low-ready or shoulder-carry).

## Review
Snap every catalog entry with default config and with each option toggled, from all sides and
close-ups (hands on the weapon, belt area, back with pack, face under helmet brim, boots on ground).
Iterate until every configuration looks right. Include a final contact sheet per entry.
