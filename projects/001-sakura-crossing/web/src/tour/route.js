import narration from './narration.json' with { type: 'json' };
import subtitles from './audio/subtitles.json' with { type: 'json' };
// Authored locally: the idea is a shared story clock, not copied Taohuayuan source.
export const TOUR_DURATION = 60;
export const TOUR_STOPS = [
  { at: 0, name: '街口 · 看效果', place: 'effects' },
  { at: 20, name: '商店 · 找灵感', place: 'shop' },
  { at: 40, name: '阅读亭 · 留下来', place: 'collection' },
];
const captions = subtitles;
const shots = [
  { at: 0, position: [5, 11, 30], target: [-3, 2.2, -.5] },
  { at: 4, position: [-3.8, 7.2, 18.5], target: [-8.6, 2, -.25] },
  { at: 15, position: [-4.7, 6.5, 16], target: [-8.1, 2, -.25] },
  { at: 20, position: [5.5, 7, 17], target: [1.8, 2, -.15] },
  { at: 34, position: [4.8, 6, 14.8], target: [1.8, 1.9, 0] },
  { at: 40, position: [12.5, 6.8, 16.5], target: [8.6, 1.8, -1.2] },
  { at: 55, position: [11.8, 6, 14.5], target: [8.6, 1.8, -1] },
  { at: 60, position: [15, 11, 26], target: [4.5, 2, -.7] },
];
const clampTime = (value) => Math.max(0, Math.min(TOUR_DURATION, Number.isFinite(value) ? value : 0));
const lastAt = (entries, time) => entries.findLastIndex((entry) => entry.at <= time);
export const smooth = (value) => value * value * (3 - 2 * value);

export function sampleTour(value, reducedMotion = false) {
  const time = clampTime(value);
  const stop = lastAt(TOUR_STOPS, time);
  let position, target;
  if (reducedMotion) {
    const shot = shots[stop === 0 ? 1 : stop === 1 ? 3 : 5];
    position = [...shot.position]; target = [...shot.target];
  } else {
    const index = Math.min(lastAt(shots, time), shots.length - 2);
    const a = shots[index], b = shots[index + 1];
    const mix = smooth((time - a.at) / (b.at - a.at));
    const blend = (field) => a[field].map((n, axis) => n + (b[field][axis] - n) * mix);
    position = blend('position'); target = blend('target');
  }
  return { time, stop, position, target, shopOpen: time >= 20, caption: captions[Math.max(0, lastAt(captions, time))]?.text || narration.segments[stop * 2].text };
}

export class TourClock {
  elapsed = 0;
  mode = 'idle';
  get ownsCamera() { return this.mode === 'playing' || this.mode === 'paused'; }
  start() { this.elapsed = 0; this.mode = 'playing'; }
  seek(value) {
    this.elapsed = clampTime(value);
    this.mode = this.elapsed === TOUR_DURATION ? 'complete' : 'paused';
  }
  pause() { if (this.mode === 'playing') this.mode = 'paused'; }
  toggle() { if (this.ownsCamera) this.mode = this.mode === 'playing' ? 'paused' : 'playing'; }
  explore() { this.mode = 'free'; }
  follow(value) {
    if (this.mode !== 'playing') return;
    this.elapsed = clampTime(value);
    if (this.elapsed === TOUR_DURATION) this.mode = 'complete';
  }
  advance(delta, visible = true) {
    if (this.mode !== 'playing' || !visible || !Number.isFinite(delta) || delta <= 0) return;
    this.elapsed = Math.min(TOUR_DURATION, this.elapsed + delta);
    if (this.elapsed === TOUR_DURATION) this.mode = 'complete';
  }
}
