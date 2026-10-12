# Google Vids 中文观看页

原生静态页面，提供本项目在 Google Vids 实际制作的两个视频版本及中文分工说明，另保留官方样片拆解。无需安装依赖。

```powershell
cd F:\codex_project\1010_codex_project\projects\007-google-vids\web
npm run dev
```

实际作品对照访问 http://127.0.0.1:4317/actual.html ，官方样片访问 http://127.0.0.1:4317/ 。另一个端口可用 `node scripts/serve.mjs --port 4319`。

```powershell
npm run build
node scripts/serve.mjs --dist --port 4318
```

构建文件在 `dist/`（忽略于 Git）。服务只监听 127.0.0.1；仅本机预览，未部署。

点击三种观看模式和时间点会加载对应官方 YouTube iframe，注释随所选时间点变化，并非逐帧自动识别。播放需要访问 YouTube；浏览器可能要求再点击播放器。每段均提供原视频直达链接。

`actual.html` 使用 HTML5 播放器播放两份真实 Vids MP4，支持下载、七段时间点跳转与原生文件入口。两播放器互斥播放，避免声音叠加。服务支持 MP4 MIME、字节 Range 与流式传输，构建会复制实际作品及截图。

页面本身不会再次调用 Vids、消耗 AI 额度或上传资料。生成、编辑和两份 MP4 导出已在本轮完成，事实来源和验证范围见项目 README 与 notes。
