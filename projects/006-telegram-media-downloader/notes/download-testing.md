# 下载能力验证：受控实验与真实账号边界

日期：2026-10-11。固定上游 commit：`169a678627cec090ce1fa8b6eaac250547f0121a`，脚本 1.212，GPL-3.0。

## 真实 Telegram 当前状态

已通过浏览器页面确认 WebK 登录成功。没有运行上游下载器，没有完成图片、视频、语音或 Stories 的账号下载测试。用户尚未指定四类获授权样例的位置。内置浏览器当前工具没有用户脚本安装或任意脚本执行接口；普通浏览器的原生控制此前因无法可靠确认 URL 而停止，此轮没有绕过该限制。

这份记录不包含账号姓名、聊天名、消息内容、会话凭证或私有媒体。

## 已执行的受控实验

调用固定版本的原下载函数，使用真实本机 HTTP 返回字节；图片链接由保存适配器承接，Blob 保存由对象 URL 适配器承接。DOM 是最小测试替身，文件系统接口是排队写入替身。VM 仅在 IIFE 结束前追加三个函数的导出，未改原下载函数和 Stories 定时器。**不是 Telegram 浏览器实测，不验证当前页面选择器、权限或画质。**

源脚本 SHA-256：`80167ae47412eba6030c470a387e4e3e546e3b7a663e99b8dac92cb7d1d30ecf`。原样副本保存在 `experiments/upstream/telegram-media-downloader.user.js`。

自有素材：FFmpeg n6.1.3 生成 JPEG 彩色测试图与四秒 H.264 视频；Windows Microsoft Huihui Desktop 合成中文测试语音，再转 Opus/OGG。没有上传到 Telegram。HTTP 正常分段每段最多 8,192 字节；脚本实际请求的是 `bytes=offset-`。

| 实验 | 实际观察 | 能证明 / 不能证明 |
| --- | --- | --- |
| 图片链接保存 | 17,802 字节，640 × 360 JPEG；哈希一致 | 链接参数及保存适配器工作；不证明真实浏览器下载政策 |
| 视频正常分段 | 47 个请求，382,362 字节；4 秒 H.264，640 × 360；哈希一致 | 受控响应下原 Range / Blob 路径保存完整 |
| 语音正常分段 | 5 个请求，36,731 字节；9.93 秒 Opus；哈希一致 | 原音频 Range / Blob 路径保存完整；不是 Telegram 语音消息 |
| WebK 图片 / 视频 Stories | 两路均注入按钮并保存相应完整文件 | 指定 DOM 替身下入口路由正确；不证明当前 Telegram DOM 兼容 |
| WebA 图片 / 视频 Stories | 两路均注入按钮并保存相应完整文件 | 同上；没有访问真实 Stories |
| 视频 HTTP 200 无范围头 | 中止，无输出文件 | 视频仍强制解析 Content-Range，不能正确接受本次完整 200 响应 |
| 语音 HTTP 200 无范围头 | 完整响应保存成功，哈希一致 | 只证明本次全文件响应；不证明一般异常处理可靠 |
| 视频 206 起点错配 | 中止，无输出文件 | 范围检查有效 |
| 语音 206 起点错配 | 只保存首段 8,192 / 36,731 字节；哈希不一致 | finally 返回覆盖异常，错误后仍触发保存 |
| 视频排队写入时序 | 调用 close 时有 46 次写入待完成；Completed 先出现；最终文件完整 | 界面完成早于关闭。替身串行写入最终成功，没有证明真实文件系统损坏 |

共 12 项：9 项输出完整文件、2 项中止、1 项输出截断文件。不能把这个计数解释为 Telegram 成功率。实验耗时包含本地替身和人工延迟，不作为吞吐速度。

## 文件核验

正常图片、视频、语音均通过 SHA-256 比对以及 FFmpeg 完整解码。原始哈希和请求日志在 [controlled-results.json](../experiments/results/controlled-results.json)，元数据与解码结果在 [media-verification.json](../experiments/results/media-verification.json)。

异常语音仍能被 FFprobe 识别和 FFmpeg 解码，但仅约 1 秒，原文件为 9.93 秒。**可播放不等于完整**；此例需要字节数、哈希或可信原始时长发现截断。

| 原始素材 / 正常输出 | SHA-256 |
| --- | --- |
| 图片 | `ca3d329f8714db5fa23cfcec5ed2abab8d34e4cb7fb2071e70d2190d3b4e43b8` |
| 视频 | `4a04900953b7f52e4f513cbadd4afc0ef7f6ecb7da50aa23ee2bec0235e68b5e` |
| 测试语音 | `4377a5f0eee3aa60e05bac62ca0d5e498f6d479d38cebed75cd679dde831ff5f` |

## 复现受控实验

在项目根目录执行。已提交固定自有素材，通常不用重新生成。

```powershell
node projects/006-telegram-media-downloader/experiments/run.mjs
node projects/006-telegram-media-downloader/experiments/verify-media.mjs '包含 ffmpeg.exe 与 ffprobe.exe 的绝对目录'
```

第二条需本机 FFmpeg，示例占位目录不能直接执行。此环境实际使用 `D:\26project\26audio_and_video_project\ffmpeg-n6.1.3-win64-gpl-shared-6.1\bin`。重新生成素材可运行 `experiments/generate-fixtures.ps1 -Ffmpeg <ffmpeg.exe>`，但不同语音引擎或编码版本可能改变字节与哈希，需同步重跑核验。

源码仪器化、真实本地 HTTP、下载输出和报告写入由 `experiments/run.mjs` 完成。测试适配器不连接浏览器，不读取账号。上游固定原样脚本由网页提供下载，供用户手动导入支持的脚本管理器；导入操作尚未执行。

## 继续真实账号实测（未执行）

1. 在支持用户脚本管理器的浏览器中，按[固定 README 手动导入说明](https://github.com/Neet-Nestor/Telegram-Media-Downloader/blob/169a678627cec090ce1fa8b6eaac250547f0121a/README.md#manual-installation)导入固定脚本，核对 1.212 与源哈希，再刷新 WebK。
2. 用户指定图片、视频、语音的聊天，以及 Stories 账号；优先使用已知原始文件的自有小样例。
3. 每类记录按钮是否出现、由官方还是脚本下载、实际文件名、后缀、大小、时长 / 分辨率与可播放性；可得原始文件时比对哈希。
4. Stories 分图片与视频验证；语音需要加载并使用 WebK 置顶播放控件。没有入口时记录 DOM 适配失败，不能用浏览器原生下载冒充脚本成功。
5. 只在样例通过后扩展到大文件、多分辨率和断网恢复；将每类结果分别更新，保留失败现象及环境。

登录成功、受控实验成功、浏览器播放本地输出均不能替代上述账号实测。当前没有原图 / 最高画质、真实网络速度、大文件内存、跨浏览器、真实用户脚本文件系统接口或受限保存频道的结果。
