# 来源与授权记录

## 2026-10-12 · 研究总图与跨项目证据

`assets/research-overview.svg/png` 是项目 002 的新研究图，沿用此前研究总览的排版风格，以 `web/src/research-content.js` 数据确定性生成，不合成或改画运行截图。嵌入上游作者 `upstream-boss.png` 与本机 `lobby.png`、`ai-battle.png`；其素材归属仍按下文记录。

`assets/neon-rift-combat.png`、`neon-openai-dynamic-log.png` 为项目 003 的原创机甲原型实拍快照；玩法、场景几何与规则独立设计，未引入上游游戏源码/美术。画面含 ImageGen 指挥官肖像；原项目来源说明保存在 `references/003-fog-harbor/README.md`。

`assets/ai-town-decisions.png` 为项目 001 守灯夜本机实拍，场景视觉参考 Kenton-GMI/sakura-crossing（固定 commit `de01898e89c7f6ab3fad93fa802f0f5ac66fbd81`，MIT），AI 游戏扩展自编。跨项目文本与原始 JSON 仅作为本研究证据，快照清单和 SHA-256 在 `references/manifest.json`；未将自编扩展统一声明为 MIT，也未发布其他项目后端。

图像生成记录 `assets/guide-export.json` 保存 SVG/PNG/WebP 哈希；公开文件不包含本机配置、模型凭据或用户存档。

- 上游：[andyhuo520/18-floors-of-mayhem](https://github.com/andyhuo520/18-floors-of-mayhem)。
- 固定 commit：`99d7215966762a13b17b54d36f9ae3e3b96f98df`；研究日期：2026-10-10。
- 源码 MIT，版权为 `Copyright (c) 2026 Andy Hu and contributors`；原文保存在 [UPSTREAM_LICENSE.txt](notes/UPSTREAM_LICENSE.txt)。
- 上游素材声明原文保存在 [UPSTREAM_ASSET_CREDITS.md](notes/UPSTREAM_ASSET_CREDITS.md)，未翻译或改写。

`vendor/upstream/` 是忽略提交的原始检出，保留上游 LICENSE 和素材；用于阅读与本地验证，没有修改上游。`web/` 是自有中文展示页，仅打包列出的展示素材与研究说明，没有复制游戏引擎、模型接口实现或完整游戏客户端。

本次本地截图为 `assets/lobby.png`、`lobby-full.png`、`descent.png`、`solo-result.png`、`ai-settings.png`，均捕获自未修改的上游页面，包含上游角色、场景和字体；截图不会改变素材授权归属。

`assets/upstream-boss.png` 原样复制自上游 `docs/孙悟空平台战.png`，是作者提供的效果资料，不是本次通关证明。[原文件地址](https://github.com/andyhuo520/18-floors-of-mayhem/blob/99d7215966762a13b17b54d36f9ae3e3b96f98df/docs/%E5%AD%99%E6%82%9F%E7%A9%BA%E5%B9%B3%E5%8F%B0%E6%88%98.png)。

`assets/upstream-ultimate.png` 原样复制自上游 [docs/专属大招演出.png](https://github.com/andyhuo520/18-floors-of-mayhem/blob/99d7215966762a13b17b54d36f9ae3e3b96f98df/docs/%E4%B8%93%E5%B1%9E%E5%A4%A7%E6%8B%9B%E6%BC%94%E5%87%BA.png)。`assets/upstream-gameplay.gif` 原样复制自上游 [docs/gameplay-preview.gif](https://github.com/andyhuo520/18-floors-of-mayhem/blob/99d7215966762a13b17b54d36f9ae3e3b96f98df/docs/gameplay-preview.gif)，为最终制作视频截取。本次没有重新渲染视频或实际打到这些 Boss 和技能画面。

`assets/showcase-desktop.png`、`showcase-full.png`、`showcase-mobile.png`、`showcase-play.png` 是自有展示页实际本机截图，仍包含上游游戏素材。展示页保留作者、固定版本和素材说明，并区分本地截图、作者效果资料和未调用模型的流程示意。

按上游 README 声明，源码 MIT 不自动覆盖图片、角色、音乐、音效、字体与真人视频。部分第三方音频声明为 CC0，但活跃使用的部分死亡/拾取/拳击音效与角色语音为生成素材，不能统一归为 CC0。中文像素字体附 OFL 许可。生成素材和视频在独立产品中的复用条件仍需逐项核对。

本研究记录上游声明，未作独立版权清查，也未将其扩大为商业素材复用许可。

## 本机 AI 对战实验扩展

观察室在自有 `web/` 中复用固定 SHA `99d7215966762a13b17b54d36f9ae3e3b96f98df` 的 MIT 源码模块：Room、Agent、观察与执行控制器、CPU 和画面。通过本机服务转发上游白名单素材，不复制额外素材或修改 vendor。MIT 原文保留在 `notes/UPSTREAM_LICENSE.txt`。新增运行截图与战报是本次实际调用接口及服务端状态记录，详见 `notes/ai-battle.md`。
