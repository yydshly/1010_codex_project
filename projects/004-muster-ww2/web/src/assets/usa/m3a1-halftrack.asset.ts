/**
 * M3A1 half-track personnel carrier (White / Autocar / Diamond T), with the front unditching roller
 * and the M49 ring mount "pulpit" for the .50 cal M2 HB. Olive Drab. Model built in
 * src/assets/usa/m3a1-halftrack/:
 *   dims.ts (TM 9-710 data), palette.ts,
 *   hull.ts (armoured body, cab doors and visors, windscreen armour cover, hood, radiator shutter
 *            armour, fenders, headlamps with brush guards, mine racks, stowage racks, rear door, stars),
 *   interior.ts (front seats, steering, instruments, levers, fuel tanks, side benches),
 *   mount.ts (M49 ring pulpit + M2 HB), running.ts (frame, front axle and wheels, track units).
 */
import type { AssetDef } from '../../core/types';
import { THREE, group } from '../../core/kit';
import { pal } from './m3a1-halftrack/palette';
import { hull } from './m3a1-halftrack/hull';
import { interior } from './m3a1-halftrack/interior';
import { ringMount } from './m3a1-halftrack/mount';
import { runningGear } from './m3a1-halftrack/running';

function buildM3A1(): THREE.Object3D {
  const P = pal();
  return group([hull(P), interior(P), ringMount(P), runningGear(P)], { name: 'm3a1-halftrack' });
}

const def: AssetDef = {
  id: 'us-m3a1-halftrack',
  name: 'M3A1 Half-track',
  subtitle: 'Half-track personnel carrier',
  faction: 'usa',
  category: 'Vehicles',
  countAs: 'vehicles',
  summary:
    'The standard US armoured personnel carrier of the Second World War, carrying a driver and twelve men in an open-topped, ' +
    'bolted armoured body on a truck-type front axle and rubber band tracks at the rear. The M3A1 added the raised M49 ring mount ' +
    'over the right front seat for a .50 cal machine gun. Shown in Olive Drab with the front unditching roller, mine racks and side stowage.',
  facts: [
    { label: 'Produced', value: '1941-1945 (M3 series)' },
    { label: 'Crew', value: '13 (driver and 12 passengers)' },
    { label: 'Engine', value: 'White 160AX, 6.3 L six-cylinder petrol, 148 hp' },
    { label: 'Armament', value: '.50 cal Browning M2 HB on the M49 ring mount' },
    { label: 'Armour', value: '6-12 mm (1/4 in plates, 1/2 in windscreen cover)' },
    { label: 'Length', value: '6.16 m with roller (242 5/8 in)' },
    { label: 'Width', value: '2.22 m over the mine racks (87 1/2 in)' },
    { label: 'Height', value: '2.43 m to the ring mount (95 5/8 in)' },
    { label: 'Wheelbase', value: '3.44 m (135 1/2 in)' },
    { label: 'Weight', value: '9.3 t gross (20,500 lb)' },
    { label: 'Track', value: '12 in rubber band track, 4 in pitch, 58 pitches' },
    { label: 'Top speed', value: '72 km/h (45 mph) on road' },
  ],
  status: 'available',
  footprint: { w: 2.22, l: 6.16 },
  spacing: { default: 8, min: 6.5, max: 18 },
  maxQuantity: 10,
  build() {
    return buildM3A1();
  },
  view: { yaw: 35, pitch: 18 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://archive.org/details/TechnicalManualTm9-710BasicHalf-trackVehicleswhiteAutocarAnd (TM 9-710, Basic Half-Track Vehicles, War Department 1944)',
      'https://en.wikipedia.org/wiki/M3_half-track',
      'https://afvdatabase.com/usa/halftrackm3.html',
      'https://military-history.fandom.com/wiki/M3_Half-track',
    ],
    notes:
      'Wheelbase, length with roller, width over the mine racks, height to the ring mount, tread, tyre size and ground clearance follow ' +
      'TM 9-710 (1944); the track data (12 in centre-guide band, 4 in pitch, 58 pitches, one bogie with four dual wheels, one dual support ' +
      'roller, 18-tooth sprocket) follow afvdatabase.com. Plate heights, overhangs, the cab and hood shapes and the positions of fittings are ' +
      'estimated from photographs of preserved vehicles and scaled to these figures. The windscreen armour cover is shown lowered with its ' +
      'vision slits; the canvas top, bows and side curtains are not fitted. The engine compartment is closed; the underside shows a simplified ' +
      'frame, front axle, springs, transfer case and shafts. The band track is a simplified moulded band with bar tread and steel centre guides; ' +
      'the bogie volute spring, idler tension gear and brake parts are simplified. Mine racks hold simplified M1A1 anti-tank mines; the .30 cal ' +
      'side guns, rifles, radios and personal kit are not modelled. The only markings are restrained white stars on the hood and body sides; ' +
      'registration numbers and unit markings are omitted.',
  },
  order: 20,
};

export default def;
