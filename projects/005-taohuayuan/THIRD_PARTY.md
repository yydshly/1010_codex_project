# 上游、资源与本地新增内容

## 上游应用

上游：[JimLiu/taohuayuan](https://github.com/JimLiu/taohuayuan)；固定 commit：`61567657a5cffd64461d8e00c5907540b733f8dc`。研究日期：2026-10-11。

固定版本根目录与 README 未找到整体源码许可证。公开可读不等同于已授予复制分发或商业使用许可。原始代码、模型、音频与上游构建保存在 Git 忽略的 `web/.cache/upstream/`；汇总产物在同样忽略的 `web/dist/`。本项目未给这些文件添加 MIT 或其他整体许可证。

## 模型、纹理与音频

依据固定版本 [assets-src/LICENSES.md](https://github.com/JimLiu/taohuayuan/blob/61567657a5cffd64461d8e00c5907540b733f8dc/assets-src/LICENSES.md)：

| 素材 | 上游记录 | 当前处理 |
| --- | --- | --- |
| 岩石、蕨类与部分贴图 | Poly Haven 原始素材 CC0 1.0，参考场景做过网格烘焙 | 在本机缓存运行，保留来源记录 |
| boatman.mshz、monk.mshz | 参考场景 Sakura River Valley，未找到许可，个人学习 | 不作为可公开发布素材，公开前替换 |
| 桃花源记朗读 m4a | 项目方提供，源文件名包含 lilihong | 未认定拥有公开或商业授权 |
| 程序化场景几何与材质 | 上游源码生成 | 同属未标明整体许可证的源码 |

CC0 范围不能扩展到整个应用、人物与朗读。完整素材记录见上述链接，原有根 README 和来源 Git 信息保留在缓存中。

## 本地新增与调整

`web/public/` 研究台、准备/构建/服务器脚本、测试和中文笔记为本次新增。连接层依赖固定上游的诊断接口；三维场景不宣称为本地原创。

缓存内唯一依赖调整：npm override `source-map-js` 为 `1.2.2`。依据研究时的 [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) 审计，发生在 Vite → PostCSS 构建链；场景代码未改动。修补结果见实验记录。

`assets/` 的截图采集自本机研究台和上游画面，用于研究说明与验证；人物和场景来源仍属上游，不因截图获得额外许可。本次静态手册使用截图进行来源明确的研究说明，原版三维构建、人物与朗读继续只在本机缓存运行；研究集未统一指定自有内容许可证。

2026-10-12 新增中文研究总览的排版与内容源。图内 001 扩展画面来自已有研究街实拍，复制记录见 [截图来源](assets/README.md#001-扩展效果参考)，摘要与源路径见 [生成清单](assets/research-overview-manifest.json)。001 的场景依据 Sakura Crossing，导览、状态机与 MiniMax 讲解为本地新增；方法迁移没有引入桃源源码、人物或音频。图片仅裁切、等比缩放与文字排版，不扩大素材授权范围。
