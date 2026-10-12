# Rain Kit · 中文 API

所有 `delta` 单位为秒；更新步长限制到 0–0.05。`dispose()` 可重复调用。公开入口 `index.js`，函数之间不通过全局性能配置或 DOM ID 通信。以下默认值对应 0.1.0。

## createWeather(options) → Promise<Weather>

| 参数 | 默认 | 含义 |
| --- | --- | --- |
| `scene / renderer / camera` | 必填 | 宿主场景、已 `await renderer.init()` 的 WebGPURenderer、相机 |
| `capacity` | 5000 | 初始化时分配与更新的粒子数，500–5000 |
| `count` | 3000 | 可见实例数，限制到 500–capacity；不会减小计算分配 |
| `enabled` | true | 是否开启雨丝和水花 |
| `height.width / height.height` | 80 / 80 | 高度纹理覆盖的世界 X / Z 范围（米） |
| `height.cameraHeight / height.depth` | 60 / 90 | 俯视相机世界 Y 与投影深度 |
| `height.resolution / height.frameSkip` | 384 / 2 | 纹理边长与更新间隔 |
| `rain.rainArea` | `{width:35,height:35}` | 雨区 X / Z 范围；镜头前偏移 5 米 |
| `rain.opacity / rain.intensity` | .42 / .85 | 雨丝透明度及倍率，0–1 |
| `rain.fallSpeed` | .28 | 以 60 FPS 为参考的下落步进；内部按 delta 积分 |
| `rain.splashOpacity / rain.splashSize` | .3 / 1.5 | 水花透明度与比例 |
| `hideObjects` | [] | 高度通道要隐藏的天空、粒子、透明特效、代理几何等 |

- `update(delta, { hideObjects: [] })`：自动排除自己的雨组，先更新高度图再计算粒子。关闭后两项都跳过。
- `setEnabled(boolean)`、`setIntensity(0..1)`、`setDropCount(500..capacity)`；非法非有限数值抛出错误。强度只影响雨丝，停雨用 enabled。
- `getState()`：`{ enabled, count, intensity, capacity }`。
- `height.renderTarget`：真实高度纹理；`rain.readPositions()`：按需 GPU 回读；`group`：模块雨组。用于调试，常规帧无需回读。
- `dispose()`：移除雨组，释放高度图与雨资源，恢复相机 layer 2 原状态。一个相机同时使用一套天气。

容量固定是为了避免重新编译；可见数量被容量约束，5000 不能绘制进只有 1000 的缓冲。多套天气实例的参数分别存储，不共享页面状态。

## createWetGround(options) → WetGround

| 参数 | 默认 | 含义 |
| --- | --- | --- |
| `scene` | 必填 | 宿主场景，模块自动添加平面 |
| `size / y` | 400 / -5.4 | 平面边长与高度；新场景通常传 `y:0` |
| `uvRepeat / roughnessScale` | 14.9 / .55 | 程序纹理平铺与粗糙度倍率 |
| `reflectionStrength / normalWarp` | .08 / .035 | 镜像混合强度与法线采样偏移 |
| `resolutionScale / frameSkip` | .5 / 2 | 倒影分辨率比例与更新间隔，各实例独立 |
| `rippleAmount / rippleScale / rippleSpeed` | 1 / 4.83 / 3 | 雨纹量、密度与速度 |
| `rippleStrength / rippleNormalStrength` | .08 / .015 | 雨纹对反射和法线的扰动 |
| `fogNear / fogFar` | 0 / 51 | 平面远处的透明渐隐 |
| `textures` | null | 可选 `{albedoMap,roughnessMap,normalMapTex}`；缺省生成原创 Canvas 纹理 |
| `disposeTextures` | false | 外部纹理默认借用；生成纹理总由模块释放 |

- `update(delta)`：更新雨纹时间。
- `updateReflection(renderer, perspectiveCamera)`：更新矩阵后、主画面渲染前调用。尊重开关和 frameSkip；临时渲染状态用 finally 恢复。
- `setEnabled` / `setReflectionEnabled(boolean)`、`isEnabled()`；关反射后不更新镜像，普通灯光高光仍在。
- `setReflectionStrength(0..2)`、`setRippleAmount(0..1)`、`setRippleScale(value)`、`setRippleSpeed(value)`。
- `mesh / material / renderTarget / uniforms`：供宿主组合与调试；`dispose()` 释放自己的资源。

目前按透视相机与平面地面实现。纹理会设置 RepeatWrapping，albedo 设置 sRGB。外部贴图应专供此地面，或自行 clone，以免改变共享贴图的采样设置。更大扰动会产生视觉偏移，最小示例使用 `.005 / .008 / .002` 的较小扰动。

## createDropletMaterial(options) → Droplets

| 参数 | 默认 | 含义 |
| --- | --- | --- |
| `color / glass` | `#9bb9aa` / false | 底色与玻璃风格默认参数；glass 不自动提供透明折射 |
| `uvChannel` | 0 | 0–3；几何必须有对应 `uv / uv1 / uv2 / uv3` |
| `repeat` | [32,20] | 水珠网格密度 |
| `speed / amount / normalStrength` | .45 / 1 / .5 | 滑动速度、湿润强度与法线扰动 |
| `metalness / roughness` | .65 / .34 | 干态基础材质；glass 默认 .2 / .17 |

- `material`：新建的 MeshPhysicalNodeMaterial。宿主赋给自己的 Mesh，不原地修改原材质。
- `update(delta)`；`setEnabled(boolean)`：强度归零，重新开启恢复用户设定；关闭时图案时间暂停。
- `setAmount(0..1)`、`setSpeed(0..4)`；`getState()` 为 `{enabled,amount,speed}`。
- `uniforms.time / amount / speed / normalStrength`：实际节点；`dispose()` 释放本材质。

高金属度需合适的环境和灯光。最小示例用 `.05`，方便观察材质底色。颜色使用 TSL `color()` 节点，避免把 Color 的 r/g/b 当 Vector3 的 x/y/z。这个原创效果展示通用材质方法，视觉图案与原库复杂的滑落 / 拖尾算法不同。

## createWalkControls(options) → Walk

| 参数 | 默认 | 含义 |
| --- | --- | --- |
| `camera / domElement` | 必填 | PerspectiveCamera 与接受输入的 canvas |
| `model` | null | 可步行模型，参与地面探测；不用把复杂车身当可步行面 |
| `ground` | null | 基础地面 Mesh |
| `colliders` | `[model]` | 墙体碰撞根列表，建议提供简单代理几何 |
| `baseFov` | 85 | 漫游基础视角 |
| `settings` | 见 walk.js DEFAULTS | 可覆盖下面的步行预算 |
| `onLookChange` | undefined | 视角变化回调 |

常用 settings：`eyeHeight:1.55`、`moveSpeed:3`、`playerRadius:.55`、`sprintMultiplier:1.8`、`crouchMultiplier:.55`、`maxStepUp:.4`、`maxStepDown:1.75`、`mouseSensitivity:.002`。

- 默认 inactive；`setActive(boolean)`、`isActive()`、`update(delta)`。
- 输入：WASD / 方向键、Shift、C 切换蹲下；未锁定时拖动画布环顾。失焦释放输入。
- `setMoveAxes(x,y)`：触屏方向输入，x 向右为正，y 向后为正；前进 `(0,-1)`，停下 `(0,0)`。
- `clearInput()`、`setCrouched(boolean)`、`setEyeHeight(value)`、`setBaseFov(value)`。
- 传送后 `syncEulerFromCamera()`、`snapCameraToGround()`；`applyLookDelta(dx,dy)` 可接自定义触控。
- `requestPointerLock()` 可选，返回浏览器请求结果；宿主要捕获 Promise 拒绝。最小示例使用拖动，无锁定请求。
- `subscribe(listener)` 返回取消订阅函数；`isMoving()`、`getHorizontalSpeed()`。
- `dispose()`：停用并解绑自身监听，宿主模型 / BVH / renderer 保留。

`buildModelBvh(root)` 加速静态几何射线；它安装 Three.js Mesh / BufferGeometry 的 BVH 扩展，重复调用不会重复构建。宿主创建的 BVH 随几何由宿主管理：卸载时 `geometry.disposeBoundsTree?.()`，然后 `geometry.dispose()`。几何改动需 refit / rebuild；该控制器不是刚体引擎，也未实现跳跃。

## 循环与生命周期

移动相机 → 高度 / 雨计算 → 水珠 / 雨纹时间 → 世界与相机矩阵 → 镜像渲染 → 宿主主渲染。启用 OrbitControls 或其他镜头控制时先停用 walk。关雨不自动关闭水珠或镜像，联动由宿主决定。卸载先停宿主循环，再释放控制器与效果，最后释放宿主资源。
