# Jevclip 中文全景图：来源与制作说明

整理日期：2026-10-12。固定研究版本：`3d4b13f6ecbb7f56cf212c5040b4b4e19d83967a`，包版本 `0.1.1`，Alpha，上游 MIT。

## 图与可编辑资料

- [高清 PNG 长图](../assets/jevclip-overview-2026-10-12.png)：适合直接查看、放大、分享。
- [可编辑 SVG](../assets/jevclip-overview-2026-10-12.svg)：文字与图形仍可编辑；字体使用系统字体，未打包字体文件。
- [文字与排版源程序](../scripts/render-overview.py)：两种格式来自相同文字和图形布局，不依赖模型判断。
- [内置图片工具尝试提示](infographic-prompt.md)：两次网络失败的原始提示；不是成功生成记录。

图中八部分依次解释输出效果、底层流程、Jev 调用、源库与演示能力区别、场景与边界、对当前项目研究的价值、验证证据和扩展路线。

## 必须保留的事实区分

Jevclip 调用 Jev 来判断当前字幕段；代码结合分数、门槛和时长预算选择内容。FFmpeg 执行视频剪辑。另一个生成式模型负责摘要，代码将引用片段编号映射为源时间或段落。库中没有 Jev 权重或训练代码，不能从 API 调用还原完整模型训练实现。

当前网页「片刻」已实现字幕导入、关键词筛选、时间线、原文与原视频回查、人工修正、Markdown 导出与本机恢复，未调用真实 Jev 或摘要模型，不导出剪辑视频。网页交互验证与上游模拟模型测试不能证明真实语义判断效果。

图中的“约 50 个真实字幕片段”是建议的小样本试验起点，尚未开展。扩展路线是按“先验证价值、再完成粗剪、再补多模态、最后积累资料库”提出的建议顺序；不代表已经实现，也不是源库承诺。

## 事实来源

| 内容 | 依据 |
| --- | --- |
| 输入、切段、API、模型默认值、缓存与失败状态 | [固定版本源代码](https://github.com/cclank/jevclip/tree/3d4b13f6ecbb7f56cf212c5040b4b4e19d83967a)，主要为 `subtitles.py`、`jev.py`、`store.py` |
| 价值分、门槛、时长预算、高亮与保守删除 | 固定版本 `rubric.py`、`reel.py`；[详细中文分析](research.md) |
| 摘要模型、片段引用与检查局限 | 固定版本 `llm.py`、`summary.py`；[引用可靠性分析](research.md#引用可靠性) |
| Jev 定位及公开的 RLCD 描述 | [TypeSafe System One](https://docs.typesafe.ai/concepts/system-one)、[机器学习说明](https://docs.typesafe.ai/introduction/machine-learning-primer)；未推断未公开的底座、参数与权重 |
| 上游效果与许可 | [上游 README](https://github.com/cclank/jevclip/blob/3d4b13f6ecbb7f56cf212c5040b4b4e19d83967a/README.md)、[MIT 副本](../licenses/UPSTREAM-MIT.txt)；作者效果限于有限样本 |
| 101 项上游测试、99 通过与两个 Windows 相关失败 | [实际测试输出](upstream-test-output.txt)、[验证记录](verification.md) |
| 网页能力、15 项数据测试、交互验证和 API 未调用 | [项目 README](../README.md)、[Web 说明](../web/README.md)、[验证记录](verification.md) |
| 个人价值、评估方案与路线 | 本项目结合用户的 GitHub 项目研究流程提出的分析建议；实际节省时间、成本和准确率尚未测量 |

## 制作与复现

内置 `image_gen` 连续两次返回网络错误，没有生成可用图片。没有改用需密钥的 CLI/API 图片生成方式。最终使用 Pillow 绘制正式 PNG，并同时输出 SVG；它是研究信息图，不是截图或模型输出。

源程序要求 Python、Pillow、Windows 的 Microsoft YaHei 系统字体；字体不随项目分发，不引入根目录或网页依赖。使用工作区提供的 Python 运行：

```powershell
& 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' 'projects/009-jevclip/scripts/render-overview.py'
```

图片生成后检查全文可读性、两条输出分支、版本与模型名、公式、能力边界和未验证状态。根仓库交付检查的实际结果见 [验证记录](verification.md)。
