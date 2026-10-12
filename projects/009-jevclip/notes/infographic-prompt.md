# Jevclip 全景图生成提示

日期：2026-10-12。类别：`infographic-diagram`。以下提示曾用于内置 `image_gen` 工具；两次请求均因 `network error: error sending request` 失败，未产出可用图片。未调用 CLI/API 图片生成方式。最终交付改为 Pillow 原生绘图与 SVG 排版，文字和图形来自 `../scripts/render-overview.py`，详见 [制作说明](infographic.md)。

图中事实依据固定上游 commit `3d4b13f6ecbb7f56cf212c5040b4b4e19d83967a` 与本项目验证记录。扩展路线是建议顺序，并不代表已经实现。最终图是知识汇总，不是网页运行截图或真实模型输出。

## 内置图片工具尝试提示（未成功产出）

```text
Use case: infographic-diagram
Asset type: Chinese research overview poster, one final image for the Jevclip research subproject.
Primary request: Create one comprehensive, accurate, beautifully organized Chinese infographic that summarizes our understanding of cclank/jevclip: capabilities, actual outputs, underlying principles, Jev model integration, scenarios, limitations, personal value for a GitHub project researcher, real API requirements, validation status, and expansion roadmap.
Style/medium: professional editorial information design, crisp flat vector-like diagram rendered as a high-resolution raster image. No photography, no fake app screenshot.
Composition: tall portrait poster, ideally 2160 x 3840 pixels or highest available resolution in approximately 9:16 aspect ratio. One coherent page. Large title, numbered section headings, generous card padding, exact Chinese typography. Two-column cards for compact comparisons, full-width central pipeline. Clear orthogonal arrows. All text must fit without clipping. Body text remains readable when zoomed. Prioritize accurate Chinese characters and complete information over decoration. Typography: clean modern Chinese sans-serif, bold headings, monospace only for short API/model labels. Thin rules, small useful icons, no 3D objects. Paper white background, dark charcoal text, deep forest-green main diagram, sage-green cards, muted blue model cards, warm amber boundary/verification accents. Semantic color legend: green 已实现, blue 上游能力, amber 待验证/扩展. Avoid red alarm styling.
Title and subtitle (verbatim):
“Jevclip 一图读懂”
“字幕驱动的内容粗剪 · 带出处的知识整理”
Top metadata line:
“cclank/jevclip  |  v0.1.1 · Alpha · MIT  |  研究版本 3d4b13f6ecbb”

Layout and exact text:

SECTION 01, full width:
Heading “01  它能带来什么效果？”
Main statement, prominent:
“把长视频中的有用讲解筛出来，再产出可回查的研究材料。”
Three compact result cards:
“精选高亮”
“按时长预算挑选片段，保持原顺序”
“保守去水版”
“移除明确低价值内容，尽量保留完整讲解”
“带引用摘要”
“生成要点，回到源时间或段落核查”
Small supporting text:
“还可输出重对齐字幕、报告与 JSON。适合内容初筛与粗剪，之后仍需人工复核和精剪。”

SECTION 02, full width, dominant middle diagram:
Heading “02  底层如何实现？”
Five connected stages. Distinguish model reasoning and deterministic code visually.
Stage 1:
“字幕 / 文字稿”
“SRT · VTT · JSON”
“解析源位置，按停顿与句子切段，约 20 秒一段”
Stage 2, model card:
“远程 Jev 判断”
“发送标题 + 当前片段原文”
“TypeSafe API”
“默认模型 jev-1.13.0”
Stage 3, small structured output card:
“结构化答案与概率”
“类别 Choice / 信息密度 Score”
“夸大、独立性、相关性 Noul”
Stage 4, code card:
“代码决定取舍”
“价值分 + 门槛 + 人工校准”
“时长预算选择 / 保守删除”
Then split into two visible branches:
Branch A:
“FFmpeg 剪辑”
“精选 MP4 / 去水 MP4 / 对齐字幕”
Branch B:
“另一个生成式模型”
“保留段 → 摘要 + 片段编号”
“代码映射为源时间 / 段落”
Do not draw Jev directly generating summary or Jev directly editing video.
Under the diagram, two compact technical strips:
“价值分 = 信息密度 / 3 × (1 − 闲话概率) × 关注点相关度”
“闲话包括寒暄、推广、空话；未设关注点时相关度为 1。门槛需用自己的材料校准。”
“SQLite 缓存以模型、标题、原文、问题为依据；改门槛或时长预算可复用判断。请求失败应标记未判断。”

SECTION 03, two cards side by side:
Heading “03  Jev 是什么？需要真实调用吗？”
Left card:
“Jevclip 是调用方”
“API：api.typesafe.ai/v1/systemone”
“密钥：TYPESAFE_API_KEY”
“库中没有 Jev 权重或训练代码”
“Jev：文本结构化决策模型”
“官方描述采用 RLCD 后训练，提高决策校准”
“具体底座、参数与完整训练实现未核实”
Right card:
“体验网页交互：无需真实 Jev”
“复现语义筛选：需要真实 Jev 或已有判断缓存”
“验证模型效果：需要真实调用与人工标注”
“自动生成摘要：另配生成式模型”
“剪视频：由 FFmpeg 执行”
“未来可替换判断模型，但要重新评估”
Small full-width note:
“模型判断不等于事实核验；概率校准不保证每条答案正确。接 API 时字幕文本会发往外部服务，密钥应留在服务端。”

SECTION 04, comparison table spanning page width:
Heading “04  源库能力与当前演示的区别”
Table headers:
“能力” | “上游 Jevclip” | “当前网页「片刻」”
Rows, render as exact text, clean row separation:
“导入与切段” | “字幕、文字稿解析” | “已实现，支持拖放”
“关注点筛选” | “Jev 语义判断与概率” | “本地关键词 + 人工取舍”
“视频处理” | “FFmpeg 真正剪辑导出” | “原视频定位与时间线预览”
“摘要与出处” | “模型生成，编号映射源位置” | “原句摘录，点击回查与跳转”
“研究保存” | “报告、字幕与 JSON” | “Markdown 导出与本机恢复”
“模型接入” | “需要 API 配置” | “未调用 Jev 或摘要模型”
Prominent note below:
“当前演示验证了研究流程；不能用来证明 Jev 的识别准确率，也不输出剪辑成品。”

SECTION 05, two cards side by side:
Heading “05  适用场景与能力边界”
Left card title “适合”
“教程与课程、技术讲解、作者访谈”
“项目演示的有声讲解、长视频资料初筛”
“字幕中含有主要信息，且需要保留出处”
Right card title “目前不具备”
“无自动转写；不理解视频画面”
“无旁白操作、未读出的 PPT / 图表容易遗漏”
“无镜头节奏、配乐、调色、转场能力”
“字幕错误或缺少前文，会影响判断”
Small note:
“带时间引用 ≠ 摘要结论一定被原文支持；仍需检查语义、条件与上下文。”

SECTION 06, full-width highlighted card:
Heading “06  对你的价值：把视频变成项目研究证据”
Four compact nodes connected by a simple process:
“项目教程 / 作者讲解”
“按部署、原理、效果、局限筛选”
“形成中文 README 与研究笔记”
“点击出处回到原文和视频”
Supporting exact text:
“减少反复拖动进度条；让研究结论有依据；保留人工纠正与可审计记录。”
“可复用的工程思路：模型判断、代码策略、源位置绑定、缓存、失败状态、人工复核。”
“如果很少研究长视频，直接收益有限；它补充源码阅读与测试，实际节省时间尚未测量。”

SECTION 07, two cards side by side:
Heading “07  已验证什么？怎样判断值不值得接？”
Left card title “已有证据”
“上游测试：101 项，99 通过”
“2 项失败与 Windows 路径 / CRLF 夹具有关”
“真实 FFmpeg 剪辑与字幕对齐已测试”
“网页：15 项数据测试通过，交互已验证”
“模型测试采用模拟；真实 Jev 效果未独立验证”
“作者效果记录仅是有限样本”
Right card title “下一步：用真实材料验证”
“先标注约 50 个真实字幕片段”
“对比关键词规则与真实 Jev 判断”
“观察重点误删、漏选、无关保留与连贯性”
“核查摘要结论是否被引用原文支持”
“记录延迟、调用量、成本和缓存收益”
“这是小样本试验，不能据此宣称通用准确率”

SECTION 08, full-width roadmap:
Heading “08  可扩展路线（以下均为规划）”
Four sequential compact cards, ordered:
“1  真实判断与评估”
“接入 Jev / 摘要 API，领域标注与门槛校准”
“2  完整粗剪流程”
“服务端 FFmpeg 导出，人工审片，字幕与出处保留”
“3  补足多模态”
“ASR + 术语纠错，OCR / 关键帧，前后文复核”
“4  研究资料库”
“跨视频检索、来源版本、要点与证据关联”

Bottom conclusion band, prominent:
“近期价值：有依据的内容初筛与视频粗剪”
“长期方向：可回查、可纠正、可持续积累的视频研究助手”

Footer in small but legible text:
“来源：github.com/cclank/jevclip · TypeSafe 官方文档 · 本地研究与验证记录”
“整理日期：2026-10-12  |  基于固定版本研究  |  图为知识汇总，非模型效果截图”

Constraints: exactly one poster; simplified Chinese only except technical identifiers. Render supplied copy accurately, do not invent capabilities or statistics. No invented benchmark percentages, no claims of real API success, no invented Jev base model, no pricing. Do not confuse the proposed roadmap with implemented functionality. All pipeline branches and model/code responsibilities must be clear. No decorative pseudo-text, no logos, no QR codes, no watermark. Do not omit section 07 or the current demo limitations.
```
