# PDoomVideo 实验记录

固定研究版本为 `fa546a38092e75f2b079e6a86d6abc54dd525d17`。首次九帧渲染发生于 2026-10-10，子项目收录和短片输出验证发生于 2026-10-11。输出图像、模型方案和上游源码能力分别记录。

## 环境与安装

Windows PowerShell；Node.js v22.15.0，npm 10.9.2，Chrome 154.0.8037.99，ffmpeg n6.1.3-20250831。Chrome 位于 `C:/Program Files/Google/Chrome/Application/chrome.exe`。未记录显卡型号，不把本机耗时推广为硬件性能基准。

上游在临时目录 clone 后通过 `git rev-parse HEAD` 固定版本，执行 `npm.cmd ci --ignore-scripts --no-audit --no-fund`，成功安装 46 个包。运行副本及依赖没有放进总仓库根目录；项目内复现位置建议为 `vendor/pdoom-video`。

ClaudeAnimationBase 的远程 HEAD 与 clone 后 SHA 均为 `0ac8bf2b31942376cb6b8c4074715595d512acd2`。README、LICENSE、配置、角色、时间轴与渲染驱动已核对；其安装、demo 和模型生成流程未运行。

## 九帧联系表

在 PDoomVideo 副本执行：

```powershell
node render.mjs --sheet=4.7,24,39.5,61.5,74.5,96.5,119.5,130.7,145 --cols=3 --w=480 --out=out/research-sheet.jpg
```

命令退出码 0，图片 1440×810，共九个时刻；已打开检查角色、场景、字幕和水彩效果。`--w=480` 只控制每格缩略图，内部绘制仍为 1920×1080。

| 时间秒 | 场景 | 该次绘制毫秒 |
| --- | --- | --- |
| 4.7 | 屏幕中的主角和火花 | 548 |
| 24 | 第一副歌舞台与打气道具 | 12200 |
| 39.5 | 健身房跑步机 | 7749 |
| 61.5 | 第二副歌舞台 | 7961 |
| 74.5 | 角色组成神经网络 | 15295 |
| 96.5 | 回形针场景 | 5157 |
| 119.5 | 数据中心 | 6224 |
| 130.7 | 递归升级 | 1472 |
| 145 | 剧场谢幕 | 13877 |

渲染驱动报告的计时包含该次画面绘制与合成，不包含浏览器全部启动耗时。联系表复制到 [研究图像](../assets/upstream-contact-sheet.jpg)，文件大小 293273 字节，SHA-256 记录在 [验证数据](verification-results.json)。

## 页面加载失败

本轮执行 `node render.mjs --stills=4.7 --out=out/research-still`，退出码 1，报 `Navigation timeout of 30000 ms exceeded`，发生在 `openPage()` 的 `page.goto(..., waitUntil: networkidle0)`。该次没有取得单帧或显卡信息。

页面包含 Google Fonts 请求，这是一个外部加载依赖，但本次没有网络追踪，不能确认它是超时根因。未改动上游源码；后续短片导出成功。未来工具需本地字体、启动超时提示与失败资源清理。

## 短片导出和媒体核验

随后在相同副本执行：

```powershell
node render.mjs --clip=4.5:5 --fps=24 --out=F:/codex_project/1010_codex_project/projects/008-pdoom-video/out/upstream-clip.mp4
```

退出码 0，日志为 `frame 1/12 40317 ms/frame` 和 `frame 12/12 9017 ms/frame`。后者是驱动报告的累计平均值，不是单个末帧耗时；该次不能与先前独立九帧直接比较。

从总仓库根目录核验：

```powershell
ffprobe -v error -count_frames -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration:format=duration,size -of json projects/008-pdoom-video/out/upstream-clip.mp4
ffmpeg -v error -i projects/008-pdoom-video/out/upstream-clip.mp4 -f null -
```

ffprobe 退出码 0，视频为 H.264、1920×1080、24 fps、12 帧，音频为 AAC；两条流时长均为 0.500000 秒，容器大小 1016833 字节。完整解码命令退出码 0，无错误输出。输出在忽略的 `out/`，可本机查看，不作为已部署演示或新的音乐成品收录。

这个实验验证了“源码画面 → 连续帧 → 视频与音频编码”的短链路。0.5 秒不足以验证全片节奏、歌词同步、续跑或多 worker 的稳定性。

## 验证范围

| 项目 | 状态 |
| --- | --- |
| PDoomVideo 固定版本、锁文件安装、联系表生成 | 已验证 |
| 九帧画面、水彩效果与字幕观察 | 已验证选定时刻 |
| 0.5 秒 MP4 音视频参数与完整解码 | 已验证 |
| 原版页面加载可靠性 | 发生一次失败，根因待定位 |
| 全长 156.6 秒 MV 和全片音画同步 | 未验证 |
| 并行速度、缓存续跑和跨环境像素一致性 | 未验证 |
| ClaudeAnimationBase demo | 未运行，仅源码核对 |
| 本地上传、角色定制、画风、规则分镜与导出工具 | 后续已实现并验证；见 [本地工具记录](local-tool.md) |
| 真实模型分镜 | 适配器已实现，真实服务未配置、未实测 |
| librosa、中文唱词强制对齐 | 未安装、未测试 |
| 分镜示例 | 人工设计；只做数据一致性检查，无音频和渲染器 |
| 在线部署 | 未部署 |

本页记录上游实验；本地工具的构建、10 项核心测试、界面和媒体验收另见 [实现与验证](local-tool.md)。交付前执行根目录 `npm.cmd run check` 和 `web/` 的适用检查；未调用上游占位 `npm test`。
