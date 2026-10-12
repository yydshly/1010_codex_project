export function validateDecision(decision, view, liveReachable) {
  if (decision.go == null) return { accepted: true, reason: '保持本地节奏' };
  if (!view.reachable.some(p => String(p.id) === String(decision.go))) return { accepted: false, reason: '模型选了观察范围外的平台' };
  if (!liveReachable.some(p => String(p.id) === String(decision.go))) return { accepted: false, reason: '回复时落点已过期，本地接管' };
  return { accepted: true, reason: '落点仍可达' };
}
export function stepComplete(agents, gameTime) {
  const models = agents.filter(a => a.config.provider !== 'cpu');
  return models.length > 0 && models.every(a => (a.stats.attempts >= a.config.limit || !a.me?.alive) && !a.busy)
    && gameTime > Math.max(...models.map(a => a.nextThinkAt || 0)) + 1;
}
