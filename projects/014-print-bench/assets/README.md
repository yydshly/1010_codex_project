# 图稿、原图与授权

[总览 PNG](research-overview.png) 与 [SVG](research-overview.svg) 由本项目脚本排版，不是模型编造的源码运行截图。SVG 完整嵌入八张原图；展示裁切和标注由矢量布局完成，来源文件没有改写。

| 文件 | 类型与来源 | 用途 |
| --- | --- | --- |
| `source/nuggs-den-hero.png` | [固定版本原图](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/designs/nuggs-den/previews/hero.png) | 原库参数化设计效果；作者发布图，非本机完整产品复现 |
| `source/pip-piano-hinge-hero.png` | [固定版本原图](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/designs/pip-piano-hinge/previews/hero.png) | 铰链预览；非 PR #424 整件前后对照 |
| `source/nuggs-den-cutaway.png` | [固定版本原图](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/designs/nuggs-den/previews/cutaway.png) | 来源补充，未放入最终总图 |
| `local/teardrop-before.png` | 本机 OpenSCAD 2021.01；修改前模块与最小测试件 | 孔顶朝 −Z 的局部复现 |
| `local/teardrop-after.png` | 本机 OpenSCAD 2021.01；修改后模块与同一测试件 | 孔顶朝 +Z 的局部复现 |
| `extensions/muster-fieldcamp.png` | 原样复制自 `projects/004-muster-ww2/assets/fieldcamp-overview.png` | 已有 3D 项目；裁切场景局部 |
| `extensions/jevclip-workbench.jpg` | 原样复制自 `projects/009-jevclip/assets/showcase-desktop.jpg` | 已有字幕助手；候选解析回归 |
| `extensions/paper-mv.png` | 原样复制自 `projects/008-pdoom-video/assets/mv-studio-complete.png` | 已有纸间 MV；裁切预览区域 |
| `extensions/yingxu-overview.jpg` | 原样复制自 `projects/013-model-video-studio/assets/research/overview.jpg` | 已有映序工作台；裁切成片区域 |

上游模型图版权归 print-bench 贡献者，按照 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 引用；[完整声明](../licenses/UPSTREAM-CC-BY-SA-4.0.txt) 保留在本项目。修改是中文标注、对照和编排，图像字节没有更改。本图编排与新写内容采用相同许可证，来源截图保留原项目条款。

Muster 模型来自 Kenton Wang 的 [muster-ww2](https://github.com/Kenton-GMI/muster-ww2)，MIT 声明见[副本](../licenses/MUSTER-MIT.txt)。其他项目截图的素材、模型与界面按原项目说明处理，不把整个研究集统一改成 CC-BY-SA-4.0。

`overview-preview.png` 是缩小版；`overview-export.json` 记录 SVG、PNG 与嵌入图片的 SHA-256。四个扩展项目已有截图不表示 Issue 自动改代码流程已经接入。原 X 视频没有作为图片材料使用。

[返回项目说明](../README.md)
