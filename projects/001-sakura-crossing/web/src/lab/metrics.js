export function summarize(intervals, cpu = []) {
  if (!intervals.length) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return {
    frames: intervals.length, fps: 1000 / mean,
    medianMs: sorted[Math.ceil(sorted.length * .5) - 1],
    p95Ms: sorted[Math.ceil(sorted.length * .95) - 1],
    cpuSubmitMs: cpu.length ? cpu.reduce((a, b) => a + b, 0) / cpu.length : null,
  };
}

export class FrameMetrics {
  constructor() { this.reset(); }
  reset() { this.previous = null; this.intervals = []; this.cpu = []; }
  frame(now, cpu) {
    const interval = this.previous == null ? null : now - this.previous;
    this.previous = now;
    if (interval > 0) {
      this.intervals.push(interval); this.cpu.push(cpu);
      if (this.intervals.length > 240) { this.intervals.shift(); this.cpu.shift(); }
    }
    return interval;
  }
  get summary() { return summarize(this.intervals, this.cpu); }
}
