import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWeather, createWetGround, createWalkControls } from '@research/rain-kit';
import { buildStreet, buildSky } from '../scene/street.js';
import { PAL } from '../rendering/palette.js';
import { adaptStreetMaterials, createToonPipeline } from './toon-adapter.js';
import { createStreetColliders } from './collision.js';
import notesUrl from '../../../notes/weather-reuse.md?url&no-inline';
import './style.css';

const embedded = new URLSearchParams(location.search).get('embed') === '1';
if (embedded) {
  document.body.classList.add('embedded');
  document.querySelector('.control-panel').prepend(document.querySelector('.weather-select'));
}
const $ = selector => document.querySelector(selector);
$('#notes-link').href = notesUrl;
const landmarks = {
  street: { position: [-5.9,1.675,5.65], target: [-4.1,2.1,-.15], label: '街口 · 樱花树与斑马线' },
  shop: { position: [1.8,1.76,.65], target: [1.8,2.1,5.5], label: '商店屋檐 · 向外看雨' },
  pavilion: { position: [8.6,1.91,-1.25], target: [4,1.8,4.7], label: '阅读亭 · 屋内看街' },
};
function solidTexture(rgb) {
  const tex = new THREE.DataTexture(new Uint8Array([...rgb,255]),1,1);
  tex.needsUpdate = true; return tex;
}
async function start() {
  const canvas = $('#scene'), frame = $('#viewport-wrap');
  const renderer = new THREE.WebGPURenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.3));
  renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  await renderer.init();
  if (renderer.backend.isWebGLBackend) throw new Error('此页的雨滴计算需要 WebGPU。请用支持 WebGPU 的 Chromium 浏览器打开本机地址。');
  $('#engine').textContent = 'WebGPU · 共享模块实时运行';
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(PAL.fog,45,100);
  const camera = new THREE.PerspectiveCamera(43,1,.1,220);
  const sun = new THREE.DirectionalLight(PAL.sun,2.25); sun.position.set(-12,18,12);
  sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:70});
  sun.shadow.normalBias = .035; sun.shadow.bias = -.00035; scene.add(sun);
  const fill = new THREE.DirectionalLight(PAL.fill,1.08); fill.position.set(12,7,-10); scene.add(fill);
  const bounce = new THREE.DirectionalLight(0xd8cbe8,.34); bounce.position.set(5,-8,12); scene.add(bounce);
  const hemi = new THREE.HemisphereLight(PAL.hemiSky,PAL.hemiGround,1.12); scene.add(hemi);
  const skyRoot = new THREE.Group(); scene.add(skyRoot); buildSky(skyRoot);
  const streetRoot = new THREE.Group(); scene.add(streetRoot); const world = buildStreet(streetRoot);
  world.shop.setOpen(true); world.shop.update(0,true); world.setCollection(true);
  const style = adaptStreetMaterials(streetRoot), skyStyle = adaptStreetMaterials(skyRoot);
  const colliders = createStreetColliders(); scene.add(colliders.root);
  const controls = new OrbitControls(camera,canvas);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 8; controls.maxDistance = 48;
  controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI / 2 - .06;
  const textures = {albedoMap:solidTexture([142,138,156]),roughnessMap:solidTexture([64,64,64]),normalMapTex:solidTexture([128,128,255])};
  // Original road top = .025. The .027 plane preserves the original road's
  // markings (.031/.032) and the curb (.125), without depth fighting.
  const ground = createWetGround({scene,size:100,y:.027,uvRepeat:18,
    textures,disposeTextures:true,reflectionStrength:.55,normalWarp:.0015,
    rippleScale:1.6,rippleSpeed:1.4,rippleStrength:.003,rippleNormalStrength:.0008,
    fogNear:40,fogFar:100,resolutionScale:.5,frameSkip:2});
  ground.mesh.scale.set(.34,.053,1); ground.mesh.position.z = 3.9;
  ground.mesh.visible = false; ground.setEnabled(false); ground.setRippleAmount(0);
  const walk = createWalkControls({camera,domElement:canvas,model:streetRoot,
    colliders:[colliders.root],ground:world.ground,baseFov:68,
    settings:{eyeHeight:1.65,moveSpeed:2.8,playerRadius:.28,maxStepUp:.3,maxStepDown:.7}});
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  $('#loading-detail').textContent = '初始化 GPU 雨滴、高度图和动画风描线…';
  const weather = await createWeather({scene,renderer,camera,enabled:false,capacity:2500,count:1800,
    hideObjects:[skyRoot,colliders.root],height:{width:64,height:64,cameraHeight:40,depth:65,resolution:256,frameSkip:2},
    rain:{rainArea:{width:34,height:34},opacity:.32,intensity:.7,fallSpeed:.24,splashOpacity:.16,splashSize:.8}});
  const pipeline = createToonPipeline(renderer,scene,camera);
  let walking = false, disposed = false, last = performance.now(), time = 0, hudTime = 0;
  const savedPosition = new THREE.Vector3(), savedTarget = new THREE.Vector3();
  let savedFov = 43;
  const state = {rain:false,reflection:false,weather:'sunny'};
  function refreshStatus() {
    $('#status').textContent = `${state.rain?'雨滴 1800 · 涟漪开':'雨滴停 · 涟漪关'} / ${state.reflection?'湿地倒影开':'干燥路面'}`;
    $('#weather-label').textContent = state.weather==='rainy' ? '雨天 · 樱花听雨' : '晴天 · 花瓣轻落';
    $('#scene-title').textContent = state.weather==='rainy' ? '让雨，落进春天。' : '春光里，慢一点。';
  }
  function setRain(enabled) {
    state.rain = enabled; weather.setEnabled(enabled); ground.setRippleAmount(enabled?1:0);
    $('#rain').checked = enabled; refreshStatus();
  }
  function setReflection(enabled) {
    state.reflection = enabled; ground.mesh.visible = enabled; ground.setEnabled(enabled);
    $('#reflection').checked = enabled; refreshStatus();
  }
  function setWeather(value) {
    state.weather = value; const rainy = value==='rainy';
    sun.intensity = rainy ? 1.55 : 2.25; fill.intensity = rainy ? 1.15 : 1.08;
    sun.color.set(rainy ? 0xdde8ff : PAL.sun);
    scene.fog.color.set(rainy ? 0xdde3f2 : PAL.fog);
    setRain(rainy); setReflection(rainy);
    document.querySelectorAll('[data-weather]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.weather===value)));
  }
  function showPosition() {
    $('#position').textContent = walking ? `位置 ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)} m · ${walk.isCrouched()?'蹲下':'站立'}` : '观察模式 · 共享街景几何';
  }
  function teleport(place) {
    const view = landmarks[place]; walk.clearInput(); camera.position.fromArray(view.position);
    camera.lookAt(new THREE.Vector3().fromArray(view.target)); walk.syncEulerFromCamera();
    walk.snapCameraToGround(); $('#place-label').textContent = view.label; showPosition();
  }
  function overview() {
    const portrait = frame.clientWidth/frame.clientHeight < 1;
    controls.enableDamping=false; controls.update();
    camera.fov = portrait ? 52 : 43; camera.position.set(portrait?6:13,portrait?15:12,portrait?33:30);
    controls.target.set(0,2.2,-.7); camera.updateProjectionMatrix(); controls.update();
    controls.enableDamping=true;
    $('#place-label').textContent = '春日研究街 / 全景';
  }
  function setWalking(enabled) {
    if (walking===enabled) return;
    walking = enabled; controls.enabled = !enabled;
    if (enabled) {
      savedPosition.copy(camera.position); savedTarget.copy(controls.target);
      savedFov = camera.fov;
      walk.setBaseFov(68); camera.fov=68; camera.updateProjectionMatrix();
      teleport('street'); walk.setActive(true); canvas.focus({preventScroll:true});
      if (!embedded) frame.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    } else {
      walk.setActive(false); walk.clearInput(); camera.position.copy(savedPosition);
      controls.target.copy(savedTarget); camera.fov=savedFov; camera.updateProjectionMatrix(); controls.update();
      $('#place-label').textContent = '春日研究街 / 全景';
    }
    $('#walk').setAttribute('aria-pressed',String(enabled));
    $('#walk').innerHTML = enabled ? '退出漫游 · 返回观察 <span>↗</span>' : '进入第一人称漫游 <span>↗</span>';
    $('#input-hint').textContent = enabled ? 'WASD 移动 · 拖动转头 · Esc 返回' : '拖动环顾 · 滚轮缩放';
    $('#walk-help').textContent = enabled ? '按住方向按钮也能行走。地点按钮会把你带到街上。' : '走进同一条街，近看招牌与湿地。';
    $('#crosshair').hidden = $('#walk-pad').hidden = !enabled; showPosition();
  }
  const observer = new ResizeObserver(() => {
    const w = Math.max(1,frame.clientWidth), h = Math.max(1,frame.clientHeight);
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
    const pixels = renderer.getDrawingBufferSize(new THREE.Vector2()); pipeline.resize(pixels.x,pixels.y);
  }); observer.observe(frame); overview();
  let frameVisible = true;
  const visibilityObserver = new IntersectionObserver(records => {
    frameVisible = records.some(record => record.isIntersecting);
    if (!frameVisible) walk.clearInput();
  });
  visibilityObserver.observe(frame);
  document.querySelectorAll('[data-weather]').forEach(button => button.addEventListener('click',()=>setWeather(button.dataset.weather)));
  $('#rain').addEventListener('change',event=>setRain(event.target.checked));
  $('#reflection').addEventListener('change',event=>setReflection(event.target.checked));
  $('#reflection-strength').addEventListener('input',event=>{
    const value = Number(event.target.value); ground.setReflectionStrength(value); $('#reflection-value').textContent=`${Math.round(value*100)}%`;
  });
  $('#ink').addEventListener('change',event=>{pipeline.setInk(event.target.checked);style.setInk(event.target.checked)});
  $('#grade').addEventListener('change',event=>pipeline.setGrade(event.target.checked));
  $('#walk').addEventListener('click',()=>setWalking(!walking));
  $('#overview').addEventListener('click',()=>{setWalking(false);overview()});
  document.querySelectorAll('[data-place]').forEach(button=>button.addEventListener('click',()=>{setWalking(true);teleport(button.dataset.place)}));
  const axes = {forward:[0,-1],backward:[0,1],left:[-1,0],right:[1,0]};
  document.querySelectorAll('[data-move]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);walk.setMoveAxes(...axes[button.dataset.move])});
    const stop = ()=>walk.setMoveAxes(0,0);
    for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event,stop);
  });
  const onKey = event=>{if(event.code==='Escape'&&walking)setWalking(false)};
  window.addEventListener('keydown',onKey);
  $('#fullscreen').addEventListener('click',async()=>{
    try { if(document.fullscreenElement) await document.exitFullscreen(); else await frame.requestFullscreen(); }
    catch { $('#input-hint').textContent='可继续在窗口里漫游；浏览器未接受全屏'; }
  });
  function dispose() {
    if(disposed)return;disposed=true;renderer.setAnimationLoop(null);observer.disconnect();visibilityObserver.disconnect();
    window.removeEventListener('keydown',onKey);controls.dispose();walk.dispose();weather.dispose();ground.dispose();
    pipeline.dispose();style.dispose();skyStyle.dispose();colliders.dispose();
    const geometries=new Set(),materials=new Set(),maps=new Set();
    scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material)});
    for(const material of materials){for(const value of Object.values(material))if(value?.isTexture)maps.add(value);material.dispose()}
    for(const value of maps)value.dispose();for(const value of geometries)value.dispose();renderer.dispose();
  }
  window.addEventListener('pagehide',event=>{if(!event.persisted)dispose()},{once:true});
  if(import.meta.hot)import.meta.hot.dispose(dispose);
  renderer.setAnimationLoop(()=>{
    if(disposed)return;const now=performance.now(),delta=Math.min((now-last)/1000,.05);last=now;
    if(document.hidden||!frameVisible){walk.clearInput();return}
    time+=delta;
    if(walking)walk.update(delta);else controls.update();
    world.animatePetals(time);world.shop.update(delta,false);style.update();
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    weather.update(delta);ground.update(delta);ground.updateReflection(renderer,camera);pipeline.render();
    hudTime+=delta;if(hudTime>.2){hudTime=0;showPosition()}
    if(!$('#loading').hidden)$('#loading').hidden=true;
  });
  document.querySelectorAll('button:disabled,input:disabled').forEach(element=>element.disabled=false);
  setWeather('sunny');showPosition();
}
start().catch(error=>{
  console.error(error);$('#loading').hidden=false;$('#loading strong').textContent='街景暂时无法运行';
  $('#loading-detail').textContent=error.message || '请使用支持 WebGPU 的 Chromium 浏览器。';
});
