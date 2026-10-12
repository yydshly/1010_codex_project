# 011 · 研究总图生成

[高清 PNG](../assets/research-overview.png) 与 [可缩放 SVG](../assets/research-overview.svg) 来自同一个 `build-overview.mjs`，尺寸为 3600 × 5000。文字和算法箭头采用确定性 SVG，三个效果模块来自此前保存的实际网页截图，没有使用图像生成模型重建作者效果。

## 复用与运行

需要 Node.js 22 或更新版本、Sharp 与可用中文字体。Web 展示和静态构建不依赖 Sharp；只有重新生成研究总图时需要它。本次使用 Codex 提供的 Sharp 运行时，没有向根目录或 Web 引入依赖。

在本子项目目录运行，`--sharp-dir` 指向含 `sharp` 的 `node_modules`：

```powershell
node tools/build-overview.mjs --sharp-dir '<包含 sharp 的 node_modules 绝对路径>'
```

已在本项目工具目录附近安装 Sharp 时也可省略该参数。字体优先使用 Microsoft YaHei；修改文字或替换字体后需重新检查行宽与画面。

输出为 `assets/research-overview.svg`、`research-overview.png`、`research-overview-preview.png` 和 `research-overview-layout.json`。SVG 内嵌截图，PNG 可独立查看；元数据保留截图文件名与文字行位置，便于核对排版。

## 维护约定

绿色用于作者效果与方法，橙色用于已验证的本地示意，紫色用于应用推断和扩展规划。算法图保持三个独立预测器的实际依赖，不能把最终把手画成运动解码的反馈输入。作者 AP 来自固定验证报告，柜门 90° 与抽屉 60 cm 是展示参数。

更新结果或流程时，先核对固定版本来源，并同步项目说明、来源记录与验证边界。总图对已有项目的建议尚未接入；来源和授权见 [THIRD_PARTY.md](../THIRD_PARTY.md)。
