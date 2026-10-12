# 012 · 真实运行截图

2026-10-11，Codex 内置浏览器，WebGPU 后端。以下均为本机实际页面截图；初版记录来自原创场景，新增 `upstream-*` 来自固定上游城市及本机适配。没有把作者仓库中的宣传图片当作运行证据。动画时刻与页面滚动可能不同，不用于逐像素量化。

| 文件 | 截图内容与条件 |
| --- | --- |
| [cover.jpg](cover.jpg) | 默认霓虹街巷、3000 可见粒子，四层效果开启 |
| [desktop.jpg](desktop.jpg) | 桌面首屏，中文标题与实时场景 |
| [roof-height.jpg](roof-height.jpg) | 雨棚观察视角与 GPU 回读高度图，亮处为较高表面 |
| [reflection-on.jpg](reflection-on.jpg) | 低机位湿地视角，关闭雨和 Bloom，开启镜像反射 |
| [reflection-off.jpg](reflection-off.jpg) | 同一视角关闭镜像反射；普通灯光高光仍存在 |
| [droplets-on.jpg](droplets-on.jpg) | 车身近景，关闭雨和 Bloom，开启原创简化水珠 |
| [droplets-off.jpg](droplets-off.jpg) | 同一视角关闭水珠，表面恢复平滑高光 |
| [mobile.jpg](mobile.jpg) | 390 × 844 浏览器尺寸，画布与控制面板纵向排列 |
| [gpu-verification.jpg](gpu-verification.jpg) | 实际 GPU 缓冲与高度纹理回读检查通过 |
| [upstream-glass.jpg](upstream-glass.jpg) | 1280 × 800，原库完整城市的真实玻璃水珠开场 |
| [upstream-city.jpg](upstream-city.jpg) | 同一尺寸，点击 ENTER 后的原库城市、Quadra、雨丝、湿地与返回研究台入口 |
| [upstream-walk.jpg](upstream-walk.jpg) | 实际按 W 前进并拖动环顾后的原库城市画面 |
| [upstream-controls.jpg](upstream-controls.jpg) | 1280 × 800，原库城市与中文四项控制，默认全部开启，包含单项观察和机位入口 |
| [upstream-rain-off.jpg](upstream-rain-off.jpg) | 街口关闭雨滴 / 水花，其余三项开启，水珠仍可独立观察 |
| [upstream-bloom-off.jpg](upstream-bloom-off.jpg) | 同一街口关闭雨和辉光，招牌边缘恢复清晰；反射与水珠开启 |
| [upstream-reflection-off.jpg](upstream-reflection-off.jpg) | 同一街口再关闭镜像反射，原路面纹理与灯光高光保留 |
| [upstream-droplets-on.jpg](upstream-droplets-on.jpg) | 车身定位，只开启原库水珠，实际强度 100%；已加入有效强度同步法线的修正 |
| [upstream-droplets-off.jpg](upstream-droplets-off.jpg) | 同一机位关闭水珠，实际强度 0%，原车身模型纹理继续保留 |
| [upstream-controls-mobile.jpg](upstream-controls-mobile.jpg) | 390 × 844，原库中文面板四项开关可用，滚动查看原理和参数，无横向溢出 |
| [walk-transit.jpg](walk-transit.jpg) | 原创扩展街区的夜航站台、第一人称 HUD 和效果控制 |
| [walk-mobile.jpg](walk-mobile.jpg) | 390 × 844，避雨亭漫游，按住方向按钮后的实际位置变化 |
| [gpu-upgrade.jpg](gpu-upgrade.jpg) | 本轮 GPU 回读复查通过，结果保存在 `notes/gpu-verification-upgrade.json` |
| [modules-minimal.jpg](modules-minimal.jpg) | 1280 × 900，四个可复用模块的独立宿主、实际开关与参数，未引入原城市模型 |
| [modules-droplets-on.jpg](modules-droplets-on.jpg) | 独立材质近景，停雨、反射开启、水珠强度 100%；使用修正后的 TSL 颜色节点 |
| [modules-droplets-off.jpg](modules-droplets-off.jpg) | 同一机位关闭水珠，强度 0%，材质恢复平滑，原底色保留 |
| [modules-disposed.jpg](modules-disposed.jpg) | 在漫游机位释放模块后效果对象归零，宿主样块保留，W 不再移动 |
| [modules-mobile.jpg](modules-mobile.jpg) | 390 × 844，最小示例纵向排列，雨开关关闭，其他层保留；无横向溢出 |
| [modules-consumer.jpg](modules-consumer.jpg) | 实际 tgz 在独立目录安装和构建后的页面，800 × 500 画布显示雨、反射与样块 |
| [modules-gpu-check.jpg](modules-gpu-check.jpg) | 抽取后的降雨算法在真实 GPU 中完成有棚 / 无棚 / 恢复检查 |
| [modules-upstream-walk.jpg](modules-upstream-walk.jpg) | 原库完整城市使用抽取后的共享控制器，按 W 1 秒后实际位置变化，中文控制面板保留 |

原库城市截图包含作者及第三方模型、材质与界面，作为本机研究记录；不将画面中的素材宣称为本地原创或 MIT。来源和授权见 [逐项说明](../web/THIRD_PARTY.md)。

手机截图属于桌面浏览器的尺寸验证，不能解释为真实手机 GPU 性能测试。

[返回项目说明](../README.md)
