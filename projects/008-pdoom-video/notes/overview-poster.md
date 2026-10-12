# PDoomVideo 与纸间 MV：一图总览

![角色 × 音乐，如何生成专属 MV？](../assets/pdoom-mv-overview.png)

本图将源库效果、底层原理、已实现的本地探索、价值与未来方向放在一张海报里。制作日期：2026-10-12。文件：`assets/pdoom-mv-overview.png`，1024×1536 PNG。使用内置 imagegen 生成，未调用 CLI 或外部付费 API。

## 核心理解

对我们的产品目标，可以概括为：**定制自己的角色，再让音乐与故事驱动这个角色出演 MV。** 角色可以在不同作品中持续复用，逐步形成自己的 IP、动作、场景和画风资产。

源库展示的是这一思路的具体作品与程序化制作方法。它为固定歌曲编写了九章场景、角色动作、镜头和歌词时间表；换歌需要重新编排。它提供架构与效果参考，尚不是上传任意歌曲便自动生成剧情的通用服务。

我们的「纸间 MV」已经将参数化角色、音乐歌词上传、三种画风、自动规则分镜、编辑预览和 MP4 导出做成可运行的本地工具。15 秒／720p／360 帧及 30 秒／1080p／720 帧成片均通过完整解码验证，输出为 24 fps、H.264＋AAC。

当前分镜依据**手动 BPM 和歌词关键词规则**，尚未自动分析音频节拍、情绪和歌曲结构。真实模型适配器已实现，但没有配置并实测真实模型；任意图片角色绑定、准确唱词对齐、演唱口型和多角色仍属扩展方向。当前工具的 Canvas 轻量水彩与源库 p5.brush 画质不同。

## 图中信息与证据

- 上游效果与原理：[能力研究](research.md)、[实验记录](experiment.md)、[上游验证数据](verification-results.json)。
- 本地实际流程与能力：[实现与实测](local-tool.md)、[15 秒浏览器验证](local-tool-verification.json)、[30 秒集成验证](local-tool-integration.json)。
- 工具化目标与扩展：[实施方案](mv-tool-plan.md)、[分镜契约](storyboard-contract.md)。
- 来源版本：[PDoomVideo @ fa546a3](https://github.com/JohnHeibel/PDoomVideo/tree/fa546a38092e75f2b079e6a86d6abc54dd525d17)；[ClaudeAnimationBase @ 0ac8bf2](https://github.com/JohnHeibel/ClaudeAnimationBase/tree/0ac8bf2b31942376cb6b8c4074715595d512acd2)。
- 许可记录：[UPSTREAM.md](../UPSTREAM.md)。PDoomVideo 的 package.json 标注 ISC，未发现独立 LICENSE；基础库有明确 MIT 原文。上游角色、歌曲不是本项目新增素材。

## 图片参考与呈现方式

海报使用以下实测图作为图像参考：上游九帧联系表、本地成片四帧联系表、实际工具界面、素描画风和平涂画风。海报采用生成式排版，参考画面可能被重绘，**不能作为未经修改的截图或像素级验收证据**；查看准确效果请使用以下原始图与验证记录。

1. [上游九帧原始渲染](../assets/upstream-contact-sheet.jpg)
2. [本地成片原始抽帧](../assets/local-mv-contact-sheet.jpg)
3. [实际工具界面](../assets/mv-studio-cover.png)
4. [实际墨线素描画风](../assets/mv-style-ink.png)
5. [实际平涂卡通画风](../assets/mv-style-flat.png)

生成提示词要求更高分辨率，内置工具实际返回 1024×1536；保存原始返回文件，未插值放大。海报中的未来路线是产品规划，未部署为在线服务，也未作为已实现能力登记。

## 最终生成提示词

以下为实际提交给内置 imagegen 的完整提示词。按以上顺序传入五张本地参考图，`transparent_background=false`。

```text
Create ONE polished, comprehensive Chinese research infographic poster as a final raster image. Infographic-diagram intent. Use a tall portrait composition, approximately 2400 × 3600 pixels or the highest practical resolution, readable on zoom. This is a professional product and engineering research overview for a Chinese user, not a fictional marketing advertisement. Render all listed Chinese text accurately; use clear contemporary Chinese sans-serif type, with an elegant bold serif-like title if available. Generous spacing and a strong hierarchy. No tiny cramped paragraphs. No extra invented words, claims, numbers, charts, logos, QR codes or watermarks.

VISUAL DIRECTION: warm ivory paper, restrained sage green, peach/orange mascot accents, indigo for future plans, dark charcoal text, fine hand-drawn flow connectors. Cohesive editorial infographic with modest watercolor textures around the edges, not behind small text. A friendly block-shaped character motif can guide the reader. Rich actual visual evidence occupies about 30% of the page; diagram and concise text occupy the rest. Arrange an oversized headline, a two-panel original-versus-exploration comparison, a full-width architecture flow, two columns for current capabilities and value, and a clear future roadmap across the bottom. Use badges to distinguish “上游作品”, “本地已验证”, “待扩展”. Maintain at least 70px-equivalent readable body type at the requested large resolution where practical. Do not distort Latin identifiers.

REFERENCE ROLES, in order:
1. upstream-contact-sheet.jpg: REAL screenshots of PDoomVideo's upstream nine-scene music video rendered from its pinned source. Use cropped portions showing the lab, red-curtain theater, and dark data center as authentic evidence inserts in the LEFT original-work panel. Preserve original characters, rendered scenes and palette. Do not imply our local tool already has these upstream scenes.
2. local-mv-contact-sheet.jpg: REAL extracted frames of our exported 15-second local MP4. Use these actual light stage / garden / star prop / dark curtain scenes as an authentic small filmstrip in the RIGHT exploration panel. Preserve the rounded peach character with yellow beanie; do not embellish the output quality.
3. mv-studio-cover.png: REAL screenshot of the working local “纸间 MV” tool. Place a cropped but recognizable screenshot of its interface and main canvas in the RIGHT exploration panel, overlapping the filmstrip gracefully. Preserve the interface, do not invent new UI.
4. mv-style-ink.png: REAL local ink-style output. Use a small actual thumbnail in a row of style samples.
5. mv-style-flat.png: REAL local flat-color output. Use a small actual thumbnail in that same row.
The watercolor style thumbnail can be cropped from reference 2 or 3. These references are visual evidence, not palette-only inspiration. Embed their visible scene content as faithfully as possible; do not replace them with new, imagined movie scenes. Keep labels outside the source frames. Small unreadable embedded UI text may remain as part of the screenshot, but the main infographic text must be crisp.

EXACT TEXT CONTENT AND INFORMATION STRUCTURE:

HEADER:
“角色 × 音乐，如何生成专属 MV？”
“PDoomVideo 源库 →「纸间 MV」本地探索 → 产品化方向”
Prominent takeaway in a highlighted band:
“核心价值：让自己的角色，成为音乐与故事的主角。”

SECTION 1 — TWO VISUAL PANELS:
LEFT title “01 源库原有效果”
badge “上游作品”
image inserts from reference 1.
Caption:
“固定歌曲《I'm Upping My P(doom)》”
“Clawd 角色 · 九章剧情 · 表情动作 · 道具与镜头”
“水彩、墨线、纸纹；动作与歌词配合音乐”
Important small but readable statement in an amber callout:
“现有分镜已写入代码；换歌仍需重新编排。”
Evidence tag:
“本地验证：九个时刻抽帧＋0.5 秒片段”
Do not imply the full original movie was locally rendered.

RIGHT title “02 我们的探索效果”
badge “本地已验证”
screenshot insert from reference 3 and filmstrip from reference 2.
Caption:
“纸间 MV：可运行的本地最小工具”
“角色参数 → 音乐／歌词 → 预设画风 → 分镜 → MP4”
three actual style thumbnails labeled:
“轻量水彩” “墨线素描” “平涂卡通”
Two clear specification badges:
“15 秒 · 720p · 360 帧”
“30 秒 · 1080p · 720 帧”
small validation line:
“均为 24 fps · H.264＋AAC · 完整解码通过”

SECTION 3 — FULL-WIDTH PRINCIPLE DIAGRAM:
Title “03 底层原理：用时间驱动角色与画面”
A six-stage left-to-right or smoothly wrapped flow with clear arrows:
“角色／场景参数” → “音乐与歌词时间轴” → “分镜、动作与镜头” → “按时间 t 计算每帧” → “Chrome 逐帧渲染” → “ffmpeg 合成 MP4”
Use a small side music-beat pulse graphic feeding the “分镜、动作与镜头” and frame calculation stages.
Three short principle notes beneath:
“节拍控制摆动、跳跃与切镜”
“统一角色参数，保持主角一致”
“时间函数可重放，镜头可编辑”
Technology comparison, small but readable:
“源库：p5.js＋p5.brush＋Puppeteer＋ffmpeg”
“本地：Canvas 2D＋结构化分镜 JSON＋模板执行器”
Critical clarity callout:
“源库中的 AI 用于创作分镜与代码；播放时执行已写好的程序。”

SECTION 4 — CURRENT CAPABILITIES AND BOUNDARY:
Title “04 已经跑通什么？”
Checklist, no invented capabilities:
“角色：名称、配色、比例、眼睛、头饰与情绪”
“输入：MP3／WAV＋TXT／LRC／SRT 歌词”
“编排：六类场景、六种动作，可编辑镜头与字幕”
“交付：预览、项目保存、MP4 导出、取消与续跑”
Amber clearly visible boundary box:
“当前自动分镜＝手动 BPM＋歌词关键词规则”
“尚未自动分析音频节拍、情绪或歌曲结构”
“真实模型适配器已实现，但尚未配置与实测”
“图片角色绑定、唱歌口型仍待扩展”
Keep these as honest progress boundaries, not alarm warnings.

SECTION 5 — VALUE AND MEANING:
Title “05 对我们的价值与意义”
Four small cards with elegant relevant icons:
“自有 IP” / “一个角色，持续出现在不同歌曲与故事中”
“可控创作” / “动作、镜头、画风和字幕可以检查与修改”
“可复用资产” / “角色、场景、动作、时间轴与渲染模块逐步积累”
“内容表达” / “音乐短片、技术科普、研究介绍、动态绘本与品牌故事”
One bold synthesis line:
“从一支特定 MV，走向可复用的角色内容生产工具。”
Small personalization line:
“对我们的项目库：把研究成果与创意，转化为统一角色的动态表达。”

SECTION 6 — PRODUCT GOAL + ROADMAP:
Title “06 可扩展方向”
badge “产品目标，尚未全部实现”
A concise top goal-flow:
“定制角色 → 上传音乐 → 选择画风 → 自动理解与编排 → 调整预览 → 导出专属 MV”
small phrase:
“歌词可选；先完成 15～30 秒，再扩展完整歌曲。”
Three distinct staged roadmap columns:
“近期” / “节拍与段落检测” / “真实模型分镜验证” / “更准确的歌词校时”
“中期” / “角色性格与动作库” / “剧情连续性与镜头语言” / “更丰富的场景和画风”
“远期” / “图片角色绑定与多角色” / “演唱口型与竖屏输出” / “生成式视频作为独立后端”
Keep the future roadmap visually indigo and separate from green verified areas.

FOOTER, compact but legible:
“研究总览 · 2026-10-12”
“来源：JohnHeibel/PDoomVideo @ fa546a3；ClaudeAnimationBase @ 0ac8bf2”
“PDoomVideo 标注 ISC；通用基础库为 MIT。上游角色与音乐归原作者。”
“画面参考本地实测；总览采用生成式排版。本地工具尚未部署。”

COMPOSITION QUALITY: comprehensive but readable, polished poster, coherent hierarchy. Allow a little more vertical space rather than shrinking text. Every section and distinction must survive. Primary source and real local demo are visually separate. Actual-output reference images can also subtly frame the header, but do not place busy reference screenshots behind explanatory text.
```
