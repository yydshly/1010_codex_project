// 固定版本的最小接入；锚点变化时明确失败，避免生成没有连到场景的假面板。
export function patchUpstreamMain(source) {
  const marker = '// LOCAL_RESEARCH_PANEL';
  if (source.includes(marker)) return source;
  const importAnchor = 'const loader = createLoaderOverlay();';
  const connectAnchor = '  await introFlow.run();';
  for (const anchor of [importAnchor, connectAnchor])
    if (source.split(anchor).length !== 2) throw new Error(`固定上游接入锚点不匹配：${anchor}`);
  return source.replace(importAnchor, `${marker}\nimport { connectResearchPanel } from "./local-shell.js";\n\n${importAnchor}`)
    .replace(connectAnchor, `${connectAnchor}\n\n  connectResearchPanel({ world, pipeline, camera, cameraDirector, renderer, appShell, profile: performanceProfile, perfStats: performanceTools.perfStats });`);
}
