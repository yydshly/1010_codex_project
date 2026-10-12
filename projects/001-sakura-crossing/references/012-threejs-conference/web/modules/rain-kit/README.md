# Rain Kit · 四项可复用模块

`@research/rain-kit@0.1.0`，本机模块包，2026-10-11。提供降雨天气、湿地反射、原创水珠材质和第一人称漫游，供本仓库其他子项目复用。没有城市模型、固定 DOM 面板、视频、音效或远程资源依赖。

| 模块 | 接入函数 | 宿主提供 |
| --- | --- | --- |
| 降雨天气 | `await createWeather(options)` | scene、已 init 的 WebGPURenderer、camera |
| 湿地反射 | `createWetGround(options)` | scene；每帧更新镜像画面 |
| 表面水珠 | `createDropletMaterial(options)` | 有对应 UV 的几何；把返回材质赋给 Mesh |
| 第一人称漫游 | `createWalkControls(options)` | PerspectiveCamera、画布、地面和碰撞几何 |

**版本边界**：锁定 `three@0.185.1` 和 `three-mesh-bvh@0.9.13`，使用浏览器 ES modules / Vite。材质与天气依赖 `three/webgpu`、TSL 和 WebGPURenderer；传统 WebGLRenderer / ShaderMaterial 项目需先做独立页面或渲染适配。模块尚未发布到 npm，也没有公开部署。

## 在其他子项目使用

方法 A：将整个 `rain-kit/` 文件夹复制到目标 Web 项目的 `modules/`，保留内部目录与来源、授权文件。在**目标子项目**独立安装依赖：

```powershell
npm.cmd install --save-exact three@0.185.1 three-mesh-bvh@0.9.13
```

```js
import { createWeather, createWetGround, createDropletMaterial, createWalkControls }
  from './modules/rain-kit/index.js';
```

方法 B：在本项目 `web/` 执行 `npm.cmd run pack:kit`，生成 `public/downloads/research-rain-kit-0.1.0.tgz`。也可在最小示例页下载。进入目标 Web 项目后：

```powershell
npm.cmd install --save-exact three@0.185.1 three-mesh-bvh@0.9.13 "F:\codex_project\1010_codex_project\projects\012-threejs-conference\web\public\downloads\research-rain-kit-0.1.0.tgz"
```

随后从 `@research/rain-kit` 导入。也可分别导入 `/weather`、`/ground`、`/droplets`、`/walk`。不要在根研究仓库安装依赖，也不要在同一场景混用不同版本的 Three.js 对象。

## 最快跑起独立示例

包内 [examples/minimal.js](examples/minimal.js) 包含完整宿主：初始化渲染器、程序几何、灯光、模块接入、循环和清理。新建 Vite 页面，放置 `<canvas id="scene"></canvas>`，用 CSS 给画布容器设置确定宽高，再接入：

```js
import { createMinimalExample } from '@research/rain-kit/examples/minimal';

const canvas = document.querySelector('#scene');
const app = await createMinimalExample({ canvas });
const resize = () => {
  const r = canvas.parentElement.getBoundingClientRect();
  app.resize(r.width, r.height);
};
const observer = new ResizeObserver(resize);
observer.observe(canvas.parentElement); resize();
app.setEffect('walk', true); // WASD、Shift、C、拖动环顾
window.addEventListener('pagehide', () => {
  observer.disconnect(); app.dispose();
}, { once: true });
```

复制源目录使用时，第一行改成 `./modules/rain-kit/examples/minimal.js`。本项目现成页面为 `web/minimal.html`；在研究台运行后访问 `http://127.0.0.1:5192/minimal.html`。页面可独立开关、切换三个机位、调雨滴数量、释放和重新接入模块。

## 接入你已有的场景

下面是接入片段，假设宿主已有 `scene`、初始化完成的 `renderer`、`camera`、有 UV0 的 `mesh`、地面与灯光：

```js
import { createWeather, createWetGround, createDropletMaterial,
  createWalkControls, buildModelBvh } from '@research/rain-kit';

const ground = createWetGround({ scene, y: 0, reflectionStrength: .5 });
const drops = createDropletMaterial({ color: '#a6caba', metalness: .1, uvChannel: 0 });
const previousMaterial = mesh.material;
mesh.material = drops.material;
buildModelBvh(collisionRoot); // 宿主的静态代理几何
const walk = createWalkControls({ camera, domElement: renderer.domElement,
  ground: ground.mesh, model: walkableSurfaces, colliders: [collisionRoot] });
walk.setActive(true);
const weather = await createWeather({ scene, renderer, camera, count: 1500,
  height: { width: 80, height: 80, cameraHeight: 60, depth: 90 },
  hideObjects: [skyMesh, smokeMesh, collisionRoot] });

let previous = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.max(0, Math.min((now - previous) / 1000, .05));
  previous = now;
  walk.update(dt); // 移动相机
  weather.update(dt); // 高度图，然后 GPU 降雨
  ground.update(dt); drops.update(dt);
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  ground.updateReflection(renderer, camera);
  renderer.render(scene, camera); // 或宿主已有 pipeline.render()
});

// 停雨和表面水珠独立；涟漪由宿主决定是否联动。
weather.setEnabled(false); ground.setRippleAmount(0);
drops.setEnabled(true);
```

`collisionRoot`、`walkableSurfaces`、`skyMesh`、`smokeMesh` 是宿主对象的示意变量；不存在的项从参数中删除。后处理、导航、交互和 UI 继续由宿主管理。

## 释放顺序与资源所有权

```js
renderer.setAnimationLoop(null);
walk.dispose(); weather.dispose(); ground.dispose();
mesh.material = previousMaterial; drops.dispose();
// 最后由宿主释放自己的几何、纹理、原材质、BVH、后处理和 renderer。
```

模块自行释放它们创建的网格、材质、纹理、RenderTarget、计算节点及输入监听。外部传入的 wet-ground 纹理默认借用，`disposeTextures: true` 才转交释放责任。宿主模型、原材质、渲染器和原有动画循环不属于模块。Three.js 的计算缓冲底层缓存由 renderer 管理，页面最终仍应调用宿主的 `renderer.dispose()`；当前未做长期 GPU 内存稳定性基准。

同一相机只接一套天气；天气会开启专用 layer 2，释放时恢复其原开关。漫游不创建 UI，也不强制鼠标锁定。默认 inactive，需显式 `setActive(true)`；拖动模式可直接使用。多个输入控制器应由宿主互斥启用。

## 原理与适用范围

降雨用俯视高度图做 GPU 查询，每列只记最高面；适合竖直降雨，不能准确处理多层室内外与斜向风雨。水花独立生成。湿地用镜像相机再渲染一遍，适合平坦地面。水珠用原创椭圆掩码改变法线、粗糙度与颜色，没有流体或逐颗水滴几何。漫游用射线与 BVH 探测墙面和地面，适合静态场景中的步行。

高度图应覆盖镜头附近雨区，雨区宽高各至少比高度图小 10 米；高度相机要高于屋顶，深度要覆盖最低地面，场景应有连续基础地面。几何移动后 BVH 需由宿主 refit / rebuild；动态角色和刚体物理需另接系统。

完整参数见 [中文 API](API.md)，出处与授权见 [PROVENANCE](PROVENANCE.md)。本地代码保留尚未指定发布许可证的状态，包声明 `UNLICENSED` / `private`；上游 MIT 声明单独保留。
