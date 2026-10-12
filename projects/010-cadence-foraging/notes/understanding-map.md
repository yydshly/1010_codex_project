# Cadence 中文研究总图

2026-10-12 把当前理解汇总成一张图：能力 → 两条已验证学习链 → 12 组算法与机制的作用 → 真实效果 → 14 个场景 → 扩展优先级与价值。

- [高清 PNG](../assets/cadence-understanding-map.png)：3200×6700，适合直接查看、放大和分享。
- [SVG](../assets/cadence-understanding-map.svg)：同一张图的可放大版本，文字保留为矢量；九处截图链接能进入对应的本机演示。
- [网页入口](http://127.0.0.1:8190/applications.html#research-map)：原图预览、两种格式下载与详细研究指南。
- [来源凭据](understanding-map-source.json)：截图来源、裁取坐标、原文件 SHA256、冻结数据源与输出哈希。

## 图中讲什么

四类能力为预测／判断、动作／奖励、记忆／回查、学动作后果／规划。历史轨迹只是输入的一种，监督预测与奖励学习不是同一个训练任务，EP 也不代表整个库。

机制区列出反馈神经图、EP、时序残差模型与 Newton 求解、Actor–Critic、TD、资格迹、Trace、两速联想 Delta、Records、RecordPatchNet 的显式反向求导与可选巩固、BeliefPatch 的有限证据修复、可控输入规划。每项同时说明“算法负责哪一步”和适用边界。规则、Q-learning、匀速、匀加速度、零位移明确列为应用侧对照；滤波与其他序列模型列为库外候选。

效果区使用四店、街区、真实内部更新、两种捕鱼条件和一条训练鱼的 EP 独立探针六组已有证据。数字来自原始 JSON；截图是某个种子／时刻，标题下的数据是多种子汇总。不能混淆近期命中率、全程命中率、轨迹误差、射击命中或训练样本改善。

EP 数字桥从相同输入／旧参数的自由起点、正负教学、局部导数，到有符号系数还原和权重更新。它汇总同一训练样本的记录，不生成新的教学过程，也不替代单步播放器。

业务区归纳 14 个场景及输入→输出→反馈；本地已测、上游机制与候选分别标明。无人机／宠物／设备／路由／模拟控制等新业务没有新增准确度、控制、体验或收益实验。最后列出加条件、信息消融、物理与学习、多分支校准、模拟规划、长期状态与存档六项扩展。

## 截图怎样接入

共 9 张原图：`cover.jpg`、`route-cover.jpg`、`algorithm-update.png`、`fish-inertia-desktop.jpg`、`fish-independent-desktop.jpg`、`ep-weight-check.png`、`ep-beta-factor-desktop.png`、`ep-contrast-scale-desktop.png`、`capabilities-explorer-desktop.jpg`。

只裁取相关显示区域、按比例缩放并排版，没有改动原实验结果。最后一张是业务候选的说明界面，图中明确注明“不是无人机实测”。没有把其余手机布局、同一场景的重复截图再充当不同效果。

## 来源与再生成

上游 Cadence 0.80.0 / commit `19bee92756d1842176ad30b1cd01edbfbfa3f14c` / GPL-3.0。机制来源为该版本的 contracts、learning、reward、temporal、memory、record-patch、belief、interaction 文档；研究来源与许可证仍见 [THIRD_PARTY.md](../THIRD_PARTY.md)。场景价值属于本项目的应用推断。

生成器：[build-understanding-map.py](../web/scripts/build-understanding-map.py)。使用 Python、Pillow 与已安装中文字体绘制图形和精确文字，并同时生成 PNG 与内嵌截图的 SVG；不调用模型。Windows 默认为微软雅黑；其他系统通过 `--font` 与 `--font-bold` 指定实际字体文件。依赖没有加入根目录或改变算法运行环境。

```powershell
# 在仓库根目录；使用带 Pillow 的 Python
python projects/010-cadence-foraging/web/scripts/build-understanding-map.py
# 重建网页，将图与来源凭据加入资料库
Set-Location projects/010-cadence-foraging/web
npm.cmd run build
```

生成时从冻结 JSON 计算 NPC 总体命中、街区四条件 Cadence 成绩、捕鱼误差／命中，以及 EP 权重前后与损失，检查实际 288 项更新和梯度一致性。原图尺寸、字体与文本布局检查保留在来源凭据中。

本轮没有重新训练或改动原始数据，也没有公开部署。图仅总结固定配置的开发研究，未证明一般优势、低功耗或商业收益。

## 本轮实际验证

- 生成器逐行检查 231 行受控文字均在声明的排版区域内；原数据验证通过，没有运行新的模型实验。
- 独立检查原截图 9 份、冻结 JSON 5 份、输出 2 份的 SHA256 与来源凭据一致。SVG 内嵌 9 张 JPEG、保留 231 个文本节点和 9 个本机演示链接，XML 可解析。
- PNG 与六组局部排版图均实际查看。真实浏览器加载 SVG 后检查所有文字的边界和相互交叠：没有越过画布，也没有文字交叠；已调整四类能力底部说明与对照算法行间距。
- 网页 PNG 真实加载为 3200×6700；默认宽度没有页面横向溢出。390×844 的页面内容宽／scrollWidth 为 375／375，预览图宽约 339 px；原尺寸与 SVG 链接可用。
- `web/npm.cmd run build` 六入口构建成功，既有 7 项 EP 数值测试与研究源文件哈希检查通过。根 `npm.cmd run catalog:sync` 与 `npm.cmd run check` 通过，13 个项目登记一致。

没有重新运行 49 项 Python/API 测试或准确度评估：本轮没有改 Python 模型运行行为，7 项现有 EP 检查随构建执行。手机为浏览器尺寸检查，没有真实手机设备测试；原街景包的 500 kB 构建提示仍存在。图解只总结已保存证据。

最终交付检查：生产服务的 123 份资源均实际读取，字节数与 SHA256 逐项匹配源文件；实际下载的高清 PNG 与原图哈希相同。首页“一张总图”入口与“图解”分类可用，两份格式均能找到。SVG 图层的 9 个截图链接带可读名称。

直接检查 SVG 期间，浏览器工具日志捕获 4 条 `animation` 字段相关错误，来源未定位；图中文字、嵌入图层和排版检查均能完成。回到 HTML 总图页并刷新没有新增该错误，PNG 显示与下载正常。保留这一检查限制，不把它记为零错误。页面实拍另存于 `assets/understanding-map-qa/web-preview.jpg`，未复制进资源库。
