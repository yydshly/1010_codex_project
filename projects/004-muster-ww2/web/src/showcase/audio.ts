/** 本地 Web Audio 合成，无外部录音；发动机空间声源与落脚事件。 */
import * as THREE from 'three';
export interface SoundActor { kind: string; index: number; position: THREE.Vector3; phase: number; throttle: number; alive?: boolean }
interface Engine { oscillators: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode; panner: PannerNode }
export class CampAudio {
  enabled = true;
  volume = 0.35;
  onChange: () => void = () => undefined;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private engines: Engine[] = [];
  private sources = new Set<AudioBufferSourceNode>();
  private stepBuffer: AudioBuffer | null = null;
  private effects = new Map<string, AudioBuffer>();
  private effectCount = 0;
  private lastSteps = new Map<string, number>();
  private running = false;
  private suspendTimer = 0;
  private generation = 0;
  private steps = 0;
  private issue = '';
  private forward = new THREE.Vector3();
  /** 必须在点击 / 键盘事件中调用，遵守浏览器的声音启动规则。 */
  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext(); this.master = this.ctx.createGain(); this.master.gain.value = 0;
        this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 1024;
        this.master.connect(this.analyser); this.analyser.connect(this.ctx.destination);
        this.stepBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.16), this.ctx.sampleRate);
        const samples = this.stepBuffer.getChannelData(0);
        let seed = 17, low = 0;
        for (let i = 0; i < samples.length; i++) {
          const t = i / this.ctx.sampleRate;
          seed = (seed * 1664525 + 1013904223) >>> 0;
          const noise = (seed / 4294967296) * 2 - 1; low = low * 0.68 + noise * 0.32;
          samples[i] = (Math.sin(2 * Math.PI * (105 * t - 110 * t * t)) * 0.55 + low * 0.7) * Math.exp(-t * 35) * Math.min(1, t * 700);
        }
        this.ctx.onstatechange = () => this.onChange();
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().then(() => {
        if (!this.running) this.pause(); else this.master!.gain.value = this.enabled ? this.volume : 0;
      }).catch(e => { this.issue = String(e); this.onChange(); });
    } catch (e) { this.issue = String(e); this.onChange(); }
  }
  play() { this.running = true; this.generation++; clearTimeout(this.suspendTimer); this.lastSteps.clear(); this.unlock(); if (this.master) this.master.gain.value = this.enabled ? this.volume : 0; }
  pause() {
    this.running = false; const version = ++this.generation; clearTimeout(this.suspendTimer);
    if (this.master) this.master.gain.value = 0;
    this.sources.forEach(s => { try { s.stop(); } catch { /* 已播放完 */ } }); this.sources.clear(); this.lastSteps.clear();
    // 先静音，再让最后的静音采样进入 analyser；冻结音频时钟与持续振荡器。
    this.suspendTimer = window.setTimeout(() => { if (version === this.generation && this.ctx?.state === 'running') void this.ctx.suspend(); }, 40);
  }
  reset() { this.lastSteps.clear(); this.sources.forEach(s => { try { s.stop(); } catch { /* 已结束 */ } }); this.sources.clear(); }
  exit() { this.pause(); this.engines.forEach(e => { e.oscillators.forEach(o => { o.stop(); o.disconnect(); }); e.gain.disconnect(); e.filter.disconnect(); e.panner.disconnect(); }); this.engines = []; this.steps = 0; }
  setEnabled(value: boolean) { this.enabled = value; if (this.running) { if (value) this.play(); else { const wasRunning = this.running; this.pause(); this.running = wasRunning; } } this.onChange(); }
  setVolume(value: number) { this.volume = THREE.MathUtils.clamp(value, 0, 1); if (this.master) this.master.gain.value = this.running && this.enabled ? this.volume : 0; this.onChange(); }
  /** 演习炮声与撞击也经过同一 master，暂停会停止瞬态声源。 */
  effect(kind: 'shot' | 'rifle' | 'hit' | 'destroyed', position: THREE.Vector3) {
    if (!this.ctx || !this.running || !this.enabled || this.ctx.state !== 'running') return;
    const ctx = this.ctx, duration = kind === 'rifle' ? 0.12 : kind === 'shot' ? 0.45 : kind === 'hit' ? 0.25 : 0.85;
    let buffer = this.effects.get(kind);
    if (!buffer) {
      buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0); let seed = 37, low = 0;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0; const t = i / ctx.sampleRate;
        low = low * 0.83 + (seed / 2147483648 - 1) * 0.17;
        const wave = Math.sin(Math.PI * 2 * (kind === 'rifle' ? 360 : kind === 'hit' ? 210 : 75) * t * Math.exp(-t * 2));
        data[i] = (low * 0.85 + wave * 0.35) * Math.exp(-t * (kind === 'destroyed' ? 5 : 13)) * Math.min(1, t * 1000);
      }
      this.effects.set(kind, buffer);
    }
    const source = ctx.createBufferSource(), gain = ctx.createGain(), panner = this.panner(); source.buffer = buffer; gain.gain.value = kind === 'rifle' ? 0.32 : kind === 'shot' ? 0.8 : 0.6;
    panner.positionX.value = position.x; panner.positionY.value = position.y; panner.positionZ.value = position.z;
    source.connect(gain); gain.connect(panner); this.sources.add(source); this.effectCount++;
    source.onended = () => { source.disconnect(); gain.disconnect(); panner.disconnect(); this.sources.delete(source); }; source.start();
  }
  private panner() {
    const p = this.ctx!.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 10; p.maxDistance = 200; p.rolloffFactor = 1.15;
    p.connect(this.master!); return p;
  }
  private engine(kind: string) {
    const ctx = this.ctx!, panner = this.panner(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = 0.6; filter.frequency.value = 450; gain.gain.value = kind === 'aircraft' ? 0.15 : kind === 'armor' ? 0.11 : 0.08;
    gain.connect(filter); filter.connect(panner);
    const oscillators = [ctx.createOscillator(), ctx.createOscillator()];
    oscillators.forEach((o, i) => { o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = 45 * (i + 1); o.connect(gain); o.start(); });
    return { oscillators, gain, filter, panner };
  }
  update(actors: SoundActor[], camera: THREE.Camera, speed: number) {
    if (!this.ctx || !this.running || !this.enabled || this.ctx.state !== 'running') return;
    const ctx = this.ctx, t = ctx.currentTime, listener = ctx.listener;
    camera.getWorldDirection(this.forward);
    listener.positionX.value = camera.position.x; listener.positionY.value = camera.position.y; listener.positionZ.value = camera.position.z;
    listener.forwardX.value = this.forward.x; listener.forwardY.value = this.forward.y; listener.forwardZ.value = this.forward.z;
    listener.upX.value = 0; listener.upY.value = 1; listener.upZ.value = 0;
    let engineIndex = 0;
    for (const a of actors) {
      if (a.kind === 'patrol') {
        const beat = Math.floor(a.phase / Math.PI), key = a.kind + a.index, prior = this.lastSteps.get(key);
        this.lastSteps.set(key, beat);
        // 低帧率只补当前落脚；拖动时间轴 / 继续后不会挤出一串旧脚步。
        if (a.alive !== false && prior !== undefined && beat !== prior) {
          const source = ctx.createBufferSource(), gain = ctx.createGain(), panner = this.panner(); source.buffer = this.stepBuffer;
          source.playbackRate.value = Math.sqrt(speed); gain.gain.value = 0.32;
          panner.positionX.value = a.position.x; panner.positionY.value = 0.1; panner.positionZ.value = a.position.z;
          source.connect(gain); gain.connect(panner); this.sources.add(source); this.steps++;
          source.onended = () => { source.disconnect(); gain.disconnect(); panner.disconnect(); this.sources.delete(source); }; source.start(t);
        }
      } else {
        const e = this.engines[engineIndex] ?? (this.engines[engineIndex] = this.engine(a.kind)); engineIndex++;
        e.gain.gain.setTargetAtTime(a.alive === false ? 0 : a.kind === 'aircraft' ? 0.15 : a.kind === 'armor' ? 0.11 : 0.08, t, 0.08);
        const frequency = a.kind === 'aircraft' ? 45 + a.throttle * 48 : a.kind === 'armor' ? 28 + a.throttle * 15 : 37 + a.throttle * 20;
        e.oscillators.forEach((o, i) => o.frequency.setTargetAtTime(frequency * (i ? 2.01 : 1), t, 0.12));
        e.filter.frequency.setTargetAtTime(200 + a.throttle * 650, t, 0.1);
        e.panner.positionX.value = a.position.x; e.panner.positionY.value = a.position.y + 0.8; e.panner.positionZ.value = a.position.z;
      }
    }
  }
  getState() {
    let rms = 0;
    if (this.analyser) { const a = new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(a); rms = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0) / a.length); }
    return { enabled: this.enabled, volume: this.volume, context: this.ctx?.state ?? 'locked', currentTime: this.ctx?.currentTime ?? 0,
      gain: this.master?.gain.value ?? 0, rms, engines: this.engines.length, activeSteps: this.sources.size, footsteps: this.steps, effects: this.effectCount, issue: this.issue };
  }
}
