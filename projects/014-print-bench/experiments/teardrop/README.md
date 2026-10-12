# PR #424 水滴孔朝向的本机最小复现

本实验验证旋转改动的几何效果。没有调用远端模型，没有在本仓库开 Issue / PR，没有实物打印，也没有整体复现上游产品。

## 来源与固定版本

- [需求 #398](https://github.com/shaiss/print-bench/issues/398)、[PR #424](https://github.com/shaiss/print-bench/pull/424)。
- `before/printability.scad` 来自[修改前模块](https://github.com/shaiss/print-bench/blob/6c3bdc031e15d9ae5b614358dcae0fd2dca4f95d/lib/printability.scad)。
- `after/printability.scad` 来自[PR 预览提交版本](https://github.com/shaiss/print-bench/blob/e05e66c77830b1a68a106369b4c66b7e2bff015c/lib/printability.scad)。
- 共享模块原样保留，CC-BY-SA-4.0；[上游许可证](../../licenses/UPSTREAM-CC-BY-SA-4.0.txt)。两个 `case.scad` 是本研究添加的同一测试件。

测试件是 12 × 14 × 12 mm 方块，沿 Y 轴减去名义直径 6 mm、长 16 mm 的水滴孔，`$fn=64`。核心改动：`rotate([-90,0,0])` → `rotate([90,0,0])`。

## 已验证命令

STL 首次生成于 2026-10-11；2026-10-12 复制至项目、重新测量，并用同一 OpenSCAD 2021.01 渲染正面图。便携程序是本机环境，未提交可执行文件；可替换为自己安装的同版本程序。

```powershell
$scadExecutable = 'D:\codex\home\tmp\printbench-research-20261011\openscad-portable\openscad-2021.01\openscad.com'
$experimentRoot = 'F:\codex_project\1010_codex_project\projects\014-print-bench\experiments\teardrop'
& $scadExecutable --export-format binstl -o "$experimentRoot\before\case.stl" "$experimentRoot\before\case.scad"
& $scadExecutable --export-format binstl -o "$experimentRoot\after\case.stl" "$experimentRoot\after\case.scad"
python projects/014-print-bench/experiments/teardrop/measure-stl.py
```

图片参数：`--imgsize=960,720 --camera=0,0,0,90,0,0,35 --projection=o --render --colorscheme=Tomorrow`。输出至 `assets/local/teardrop-before.png` 与 `teardrop-after.png`。

## 结果与口径

| 顶点统计 | 修改前 | 修改后 |
| --- | --- | --- |
| STL 三角面 | 256 | 256 |
| 唯一顶点 | 128 | 128 |
| 筛选孔壁顶点 | 120 | 120 |
| 孔壁最小 Z / mm | −4.799988 | −3.000000 |
| 孔壁最大 Z / mm | +3.000000 | +4.799988 |

[测量 JSON](geometry-measurements.json) 与 [测量脚本](measure-stl.py)保留结果。脚本读取二进制 STL，按 `sqrt(x²+z²) <= 4.85` 筛选本测试件孔壁，断言上下范围在 0.001 mm 容差内。它是特定测试件的回归验证，不是通用孔洞检测或打印安全判定。

渲染也确认扩展孔顶从下方翻到上方。OpenSCAD 的 CGAL 面数与 STL 三角面数定义不同，不混用。
