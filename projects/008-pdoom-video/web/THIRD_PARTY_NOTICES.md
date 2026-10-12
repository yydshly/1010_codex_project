# 来源与许可证

`shared/motion.ts` 改编自 [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase/blob/0ac8bf2b31942376cb6b8c4074715595d512acd2/src/clawd.js) 的 `move()`，保留节拍驱动位移、压缩伸展、手臂摆动公式。研究版本：`0ac8bf2b31942376cb6b8c4074715595d512acd2`。修改为显式 BPM 与偏移参数、TypeScript 和六种动作子集，去除 p5 全局依赖。原许可证全文见下方。

整体创作和逐帧导出架构参考 [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo/tree/fa546a38092e75f2b079e6a86d6abc54dd525d17)。本工具没有复制其歌曲、歌词、品牌角色、场景代码或水彩素材。当前画布角色、场景、风格适配器、示例音乐、界面和业务代码为本地新增；水彩为轻量程序纹理，并非 p5.brush 的原版水彩质量。

依赖各自许可证见 `package-lock.json` 与安装包的 LICENSE。

## ClaudeAnimationBase 原许可证

MIT License

Copyright (c) 2026 John Heibel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
