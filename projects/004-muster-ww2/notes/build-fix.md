# 构建问题与本地修复

研究版本：`7d2fa86ebc3b999eaf085831cdcd5dccefea63d4`。2026-10-11 在引入固定源码后先安装锁定依赖，再运行原版 `npm.cmd run build`，确认失败后修改。

## 复现与原因

```text
src/assets/japan/ha-go/hull.ts(105,17): error TS2300: Duplicate identifier 'P'.
src/assets/japan/ha-go/hull.ts(167,9): error TS2300: Duplicate identifier 'P'.
src/assets/japan/ha-go/hull.ts(168,23): error TS2349: This expression is not callable.
```

`armour(P: Pal, rv: Rivets)` 的参数 `P` 是材质集合，后续通过 `P.paint` 访问材质。同一函数内部又声明 `const P = (x, y, off) => ...`，将它作为车体机枪凸舱的坐标函数。TypeScript 检查出现名字冲突，后续 `P(...)` 调用还被解释为调用材质对象。

`tsconfig.json` 包含整个 `src/`，所以这个尚未注册为公开资产的辅助文件也会阻止构建。开发页面能加载其他模型，不能证明生产构建已经正常。

## 改动

把坐标辅助函数改名为 `bayPoint`，并更新四段坐标数组中的调用；材质参数仍用 `P`。坐标公式、装甲厚度、顶点顺序和材质均保持原实现。

修改位置：[hull.ts](../web/src/assets/japan/ha-go/hull.ts)。没有删除未完成文件、降低 TypeScript 检查或跳过报错。

## 结果与边界

修复后 `npm.cmd run build` 通过，TypeScript 检查和 Vite 构建都成功，产物同时包含展柜 `index.html` 与审查器 `harness.html`。后续在生产预览上进行浏览器验收，实际结果见 [实验记录](experiment.md)。

这个修复只解决代码重名。该版本的日本公开条目为 Type 99 步枪、Type 99 轻机枪、Chi-Ha 坦克，没有 Ha-Go 的公开资产入口，因此不宣称 Ha-Go 已完成或已视觉验收。
