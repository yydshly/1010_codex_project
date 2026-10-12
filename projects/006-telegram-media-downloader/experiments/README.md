# 下载器受控实验

使用上游固定 1.212 的原下载函数和 Stories 路由，验证真实 HTTP 字节读取、Blob 保存与异常处理。这里的 DOM、链接保存和文件系统接口是测试适配器，**没有运行在 Telegram 或浏览器中**。

- `upstream/telegram-media-downloader.user.js`：原样源码，来自 commit `169a678627cec090ce1fa8b6eaac250547f0121a`；GPL-3.0，完整许可见 [原文](../licenses/UPSTREAM-GPL-3.0.txt)。
- `fixtures/`：自有测试图片、视频及合成中文语音，无 Telegram 用户内容。
- `run.mjs`：12 项真实本机 HTTP 实验，在内存中追加测试导出。
- `verify-media.mjs`：使用 FFprobe 元数据与 FFmpeg 解码核验保存输出。
- `results/`：实际文件、请求日志、哈希、写入时间线与解码结果。

运行和结论见 [下载验证笔记](../notes/download-testing.md)。Node.js 22+，无 npm 依赖。重新生成素材需要 Windows System.Speech 与 FFmpeg。固定原样脚本尚未导入 Telegram 浏览器。
