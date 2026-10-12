import { Agent } from '/ai/agent.js';
import { controllerTick, bestTarget, candidates } from '/ai/controller.js';
import { observe } from '/ai/observe.js';
import { cpuInput } from '/cpu.js';
import { parseDecision } from '/ai/providers.js';

import { validateDecision } from './decision-guard.js';
export class LabAgent extends Agent {
  constructor(config, hooks) {
    super({ ...config, learn: false, intervalMs: 1400 }, hooks);
    this.stats.attempts = 0; this.stats.applied = 0; this.stats.stale = 0; this.stats.landings = 0;
  }
  schedule(delay = this.config.intervalMs) {
    if (this.config.provider === 'cpu' || this.busy || this.stats.attempts >= this.config.limit) return;
    super.schedule(delay);
  }
  async think() {
    if (this.busy || this.stopped || !this.me?.alive || this.game.phase !== 'playing' || this.stats.attempts >= this.config.limit) return;
    this.busy = true; this.abort = new AbortController(); this.stats.attempts++;
    const view = observe(this.game, this.me), alternative = bestTarget(this.game, this.me)?.id ?? null;
    const requestId = this.stats.attempts;
    this.emit({ kind: 'request', view, requestId, cpuAlternative: alternative }); this.touch();
    try {
      const response = await fetch('/lab/decide', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: this.config.runId, provider: this.config.provider, view, plan: this.plan, persona: this.config.persona }), signal: this.abort.signal });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || '请求失败');
      if (this.stopped || !this.me?.alive || this.game.phase !== 'playing') return;
      const decision = parseDecision(result.text); if (!decision) throw new Error('模型回复不是有效行动 JSON');
      this.stats.calls++; this.stats.tokensIn += result.usage.in; this.stats.tokensOut += result.usage.out;
      this.stats.lastMs = result.ms; this.stats.avgMs = Math.round(this.stats.avgMs + (result.ms - this.stats.avgMs) / this.stats.calls);
      const validation = validateDecision(decision, view, candidates(this.game, this.me));
      if (validation.accepted) { if (decision.go != null) this.intent = { action: 'descend_to', platformId: Number(decision.go) }; else this.intent = null; this.stats.applied++; }
      else { this.intent = null; this.stats.stale++; }
      // Item decisions use the CURRENT inventory and a living rival, never a stale input packet.
      if (decision.item && this.me.carry && (decision.item !== 'throw' || this.game.players.some(p => p.id === decision.target && p.alive))) this.pendingItem = { do: decision.item, target: decision.target };
      this.plan = decision.plan; this.stats.lastPlan = decision.plan; this.stats.lastWhy = decision.why; this.currentDecision = requestId;
      this.emit({ kind: 'think', requestId, model: result.model, ms: result.ms, usage: result.usage, view, decision, validation, cpuAlternative: alternative });
    } catch (error) {
      if (error.name !== 'AbortError') { this.stats.errors++; this.stats.lastError = error.message; this.emit({ kind: 'error', requestId, text: error.message }); }
    } finally { this.busy = false; this.nextThinkAt = (this.game?.t || 0) + 2; this.touch(); if (this.config.observationMode !== 'step' && !this.stopped && this.me?.alive && this.game.phase === 'playing') this.schedule(); }
  }
  drive() {
    const me = this.me; if (!me || !me.alive || this.game.phase !== 'playing') return;
    if (me.ground != null && me.ground !== this.lastGround) {
      this.stats.landings++; this.emit({ kind: 'land', platform: me.ground, modelTarget: this.intent?.platformId ?? null,
        requestId: this.currentDecision ?? null, metres: me.meters, hp: me.hp, x: Math.round(me.x), y: Math.round(me.y) });
    }
    this.lastGround = me.ground;
    if (this.intent && (me.ground === this.intent.platformId || !candidates(this.game, me).some(p => p.id === this.intent.platformId))) this.intent = null;
    const isCPU = this.config.provider === 'cpu';
    if (!isCPU && this.config.observationMode === 'step' && !this.busy && this.nextThinkAt != null && this.game.t >= this.nextThinkAt && this.stats.attempts < this.config.limit) { this.nextThinkAt = null; this.schedule(0); }
    const start = performance.now();
    const input = { ...(isCPU ? cpuInput(this.game, me) : controllerTick(this.game, me, this.intent)) };
    this.stats.ruleMs = Number((performance.now() - start).toFixed(3));
    const source = isCPU ? 'CPU 规则' : this.game.bossArena ? 'Boss 规则控制器' : this.intent ? '模型目标 + 本地执行' : this.busy ? '等待模型 · 本地接管' : '本地接管';
    if (this.pendingItem && me.carry) {
      if (this.pendingItem.do === 'use') input.eat = true;
      else {
        input.pass = true; const target = this.game.players.find(p => p.id === this.pendingItem.target && p.alive);
        if (target) { input.left = target.x < me.x; input.right = target.x > me.x; }
      }
      this.emit({ kind: 'item', action: this.pendingItem.do, carry: me.carry, target: this.pendingItem.target }); this.pendingItem = null;
    }
    this.lastInput = input; this.source = source;
    const active = Object.keys(input).filter(k => input[k]); const key = active.join(',') + source;
    if (key !== this.lastControl && this.game.t - (this.lastControlAt || -2) >= .6) {
      this.emit({ kind: 'control', keys: active, source, target: isCPU ? bestTarget(this.game, me)?.id ?? null : this.intent?.platformId ?? null,
        requestId: this.currentDecision ?? null, hp: me.hp, metres: me.meters });
      this.lastControl = key; this.lastControlAt = this.game.t;
    }
    const packet = JSON.stringify({ type: 'input', ...input }), now = performance.now();
    if (packet !== this.lastPacket || now - this.lastSentAt > 250) {
      if (this.ws?.readyState === 1) this.ws.send(packet); this.lastPacket = packet; this.lastSentAt = now;
    }
  }
}
