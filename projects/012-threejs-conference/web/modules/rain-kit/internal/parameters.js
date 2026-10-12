export const RAIN_LAYER = 2;
export function clampFinite(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError('参数必须是有限数值');
  return Math.max(min, Math.min(max, number));
}
export function positive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} 必须是正数`);
  return value;
}
