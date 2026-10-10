# {{number}} · {{name}} 图片资源

放置真实运行截图、架构图和演示 GIF。建议封面文件名为 `cover.png` 或 `cover.webp`，使用清晰、适度压缩的图片。

在根 `projects.json` 配置：

```json
"cover": {
  "path": "projects/{{directory}}/assets/cover.png",
  "alt": "填写这张图片展示的界面、功能或实验结果"
}
```

只有在文件存在后才填写 `cover`，随后运行 `npm run catalog:sync`。多图展示可直接编辑本项目 README，并给每张图添加说明。引用上游图片需注明来源并核对授权。

[返回项目说明](../README.md)
