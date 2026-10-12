# 002 · 18 Floors of Mayhem · 像素下落与妖王战 图片资源

## 2026-10-12 新研究图

- `research-overview.svg`：本项目完整矢量总图，嵌入六张已有效果；标题、来源和阶段边界明确。沿用此前总览风格，内容为本项目重排。
- `research-overview.png`：3840×14460 高清导出，根登记表当前封面；没有合成游戏效果。
- `research-guide.webp`：网页用 1280 像素宽预览，完整内容可放大/下载。
- `guide-export.json`：来源数据日期、尺寸和 SVG/PNG/WebP 哈希。
- `neon-rift-combat.png`、`neon-openai-dynamic-log.png`、`ai-town-decisions.png`：跨项目实拍，原始位置与哈希见 `../references/manifest.json`。

下方表格与 cover 示例保留初次展示阶段；当前根索引使用 `research-overview.png`。来源详见 `../THIRD_PARTY.md`。

截图日期：2026-10-10。版本：`99d7215966762a13b17b54d36f9ae3e3b96f98df`。

| 文件 | 来源与内容 |
| --- | --- |
| `lobby.png` | 本地大厅；取景时巡游到高庄夜寨 |
| `lobby-full.png` | 本地大厅完整页面，包括 AI 入口与说明 |
| `descent.png` | 本地短局危险线淘汰反馈，不是成功下落操作证明 |
| `solo-result.png` | 本地 19 米/190 分结算、称号与头像 |
| `ai-settings.png` | 本地 AI 配置，API key 为空，未调用付费模型 |
| `upstream-boss.png` | 上游 `docs/孙悟空平台战.png` 原样复制；不是本次通关截图 |
| `upstream-gameplay.gif` | 上游 `docs/gameplay-preview.gif` 原样复制，是最终制作视频截取 |
| `upstream-ultimate.png` | 上游 `docs/专属大招演出.png` 原样复制 |
| `showcase-desktop.png` | 自有展示页本机首屏，默认桌面视口；根索引封面 |
| `showcase-full.png` | 自有展示页桌面完整页面 |
| `showcase-mobile.png` | 自有展示页 390×844 浏览器尺寸下的完整页面；不代表真实手机性能 |
| `showcase-play.png` | 自有展示页试玩弹窗成功加载未修改的上游游戏 |

在根 `projects.json` 配置：

```json
"cover": {
  "path": "projects/002-18-floors-of-mayhem/assets/showcase-desktop.png",
  "alt": "深渊观察室中文展示页：孙悟空平台战效果与本机试玩入口"
}
```

维护图片登记后运行 `npm run catalog:sync`。来源和素材授权见 [THIRD_PARTY.md](../THIRD_PARTY.md)。

[返回项目说明](../README.md)

- `ai-battle.png`：2026-10-10 本机真实 AI 对战观察室截图。
- `ai-battle-step.json`：MiniMax / OpenAI / CPU 逐步观察的真实接口、输入和引擎状态记录；未包含凭据。
- `ai-battle-realtime.json`：不暂停的同房实时观察记录，揭示模型回复目标过期问题；未包含凭据。
