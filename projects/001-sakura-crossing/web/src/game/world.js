import * as THREE from 'three';
import { buildComponents } from '../lab/components.js';
import { Pipeline } from '../rendering/post.js';
import { cel, flat } from '../rendering/toon.js';
import { BUILDINGS, PLACES } from './engine.mjs';

export function createWorld(canvas, labels, onPick) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9cbbb');scene.fog=new THREE.Fog('#e9cbbb',65,110);
  const camera=new THREE.PerspectiveCamera(42,1,.25,150);camera.position.set(25,31,35);camera.lookAt(0,.3,0);
  canvas.addEventListener('wheel',event=>{event.preventDefault();const distance=camera.position.length(),next=THREE.MathUtils.clamp(distance+event.deltaY*.035,28,66);camera.position.multiplyScalar(next/distance);camera.lookAt(0,.3,0);},{passive:false});
  const sunlight=new THREE.DirectionalLight('#ffd9b3',2.1);sunlight.position.set(-16,25,12);sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);
  Object.assign(sunlight.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:70});sunlight.shadow.bias=-.0006;scene.add(sunlight);
  scene.add(new THREE.HemisphereLight('#ffe9d1','#9895b0',1.4));
  const fill=new THREE.DirectionalLight('#aea6dd',.7);fill.position.set(12,10,-12);scene.add(fill);
  const kit=buildComponents({id:'lantern-night',seed:20261011,width:34,depth:30,
    theme:{ground:'#a4b39b',path:'#d1bda4',foliage:['#edb1bb','#e7a4b5'],shop:'柚子杂货铺'},
    paths:[{x:0,z:2,width:31,depth:5,kind:'road'},{x:0,z:0,width:5,depth:27,kind:'walk'},{x:-10,z:-2,width:5,depth:5,kind:'walk'}, {x:0,z:-3,width:7,depth:7,kind:'plaza'}],
    buildings:BUILDINGS.map((b,i)=>({...b,id:`house${i}`,height:3.3+i*.18,rotation:0,wall:['#f0d9bd','#d5e0ce','#ead2cb','#d9d8e6'][i],roof:['#a36872','#789596','#ba867d','#8d88a9'][i],shop:i===0})),
    trees:[[-14,-11],[-4,-10],[4,-10],[14,-11],[-14,7],[14,7],[-4,12],[4,12]].map(([x,z],i)=>({x,z,scale:.95+(i%3)*.07,color:i%2?'#edb5c0':'#dca0b3',seed:i+17})),
    benches:[{x:-4,z:6,rotation:0},{x:4,z:6,rotation:0}],lamps:[{x:-4,z:-5},{x:4,z:-5},{x:-14,z:3},{x:14,z:3}],fountain:false,
  },{bands:3,shadowTint:'#707087',ink:true,inkWidth:1.2});scene.add(kit.root);
  const pipeline=new Pipeline(renderer,scene,camera,{pixelBudget:2.4e6});pipeline.forceScale=1.4;pipeline.setStyle({ink:true,grade:true,inkWidth:1.1,saturation:1.08,warmth:.06});
  const pickables=[], actors=new Map(), lamps=new Map(), spirits=new Map(), labelEls=new Map();let state;
  const mat=color=>cel({color,bands:3,tint:'#6c708d'});
  function mesh(geometry,color,pos,parent=scene){const o=new THREE.Mesh(geometry,mat(color));o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  const sphere=(r,color,pos,parent)=>mesh(new THREE.SphereGeometry(r,12,8),color,pos,parent);
  const box=(size,color,pos,parent)=>mesh(new THREE.BoxGeometry(...size),color,pos,parent);
  function label(id,text,kind='actor'){const el=document.createElement('button');el.className=`world-label ${kind}`;el.textContent=text;el.dataset.entity=id;el.addEventListener('click',()=>onPick({entity:id}));labels.append(el);labelEls.set(id,el);return el;}
  const colors={player:'#7da9bf',companion:'#d7a951',shopkeeper:'#bc7d90',guard:'#789887'};
  for(const[id,color]of Object.entries(colors)){
    const root=new THREE.Group();scene.add(root);
    const body=new THREE.Group();root.add(body);
    mesh(new THREE.CylinderGeometry(.38,.5,.7,10),color,[0,.85,0],body);
    sphere(.49,'#f5dbbb',[0,1.5,0],body);sphere(.5,id==='guard'?'#76665e':'#65575a',[0,1.69,-.07],body).scale.set(1,.6,1);
    for(const x of[-.18,.18])sphere(.045,'#483f42',[x,1.51,.44],body);
    sphere(.07,'#d7948d',[0,1.39,.47],body).scale.set(1,.45,.35);
    const arms=[-.49,.49].map(x=>mesh(new THREE.CapsuleGeometry(.11,.33,3,6),color,[x,.88,0],body));
    const legs=[-.2,.2].map(x=>mesh(new THREE.CapsuleGeometry(.13,.28,3,6),'#5f6674',[x,.36,0],root));
    box([.72,.14,.76],id==='companion'?'#f0cc81':color,[0,1.88,0],body);
    const bag=sphere(.19,'#dfb97a',[.48,.65,-.1],body);bag.scale.set(.8,1,1);
    const ring=mesh(new THREE.RingGeometry(.65,.73,32),'#e3c782',[0,.12,0],root);ring.rotation.x=-Math.PI/2;ring.material=flat({color:id==='player'?'#f7e2a7':color,transparent:true,opacity:.8,side:THREE.DoubleSide});
    const el=label(id,({player:'你',companion:'阿澄 · 队友',shopkeeper:'柚子 · 店主',guard:'晴 · 巡街人'})[id]);
    actors.set(id,{root,body,legs,arms,bag,el,last:new THREE.Vector2(),walk:0});
  }
  for(const id of['west','plaza','east']){
    const place=PLACES[id],root=new THREE.Group();root.position.set(place.x,0,place.z);scene.add(root);
    box([1.3,.2,1.3],'#aaa493',[0,.14,0],root);mesh(new THREE.CylinderGeometry(.1,.13,2.7,8),'#6d7c76',[0,1.5,0],root);
    box([1.7,.12,.18],'#7e776a',[0,2.9,0],root);
    const glow=mesh(new THREE.SphereGeometry(.6,12,8),'#b49980',[0,2.5,0],root);glow.scale.set(.7,1,.7);glow.material=cel({color:'#bc9f84',emissive:'#e2943d',emissiveIntensity:0,cache:false});
    for(const x of[-.43,.43])box([.06,.9,.07],'#9e7056',[x,2.5,0],root);
    box([1,.12,.8],'#9e7056',[0,3.02,0],root);box([.9,.1,.7],'#9e7056',[0,1.96,0],root);
    const light=new THREE.PointLight('#ffc883',0,7,2);light.position.set(0,2.3,0);root.add(light);
    const hit=mesh(new THREE.SphereGeometry(1.2,8,6),'#ffffff',[0,1.5,0],root);hit.visible=false;hit.userData.place=id;pickables.push(hit);
    lamps.set(id,{root,glow,light,el:label(id,place.name,'place')});
  }
  label('shop','领灯油 · 杂货铺','place');
  // Hand-strung festival bulbs and bunting, all generated from geometry.
  for(const z of[-1,5]){
    const points=Array.from({length:25},(_,i)=>new THREE.Vector3(-13+i*26/24,4.8-Math.sin(i/24*Math.PI)*.8,z));
    const wire=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#8b7771'}));scene.add(wire);
    for(let i=1;i<24;i+=2){const p=points[i];const bulb=sphere(.16,i%4===1?'#ffdb9f':'#f5c1b4',[p.x,p.y-.18,p.z]);bulb.material=flat({color:i%4===1?'#ffe0a5':'#f0b7ab'});}
  }
  for(const x of[-15.7,15.7])for(let z=-13;z<=13;z+=2.5){box([.12,.85,.12],'#c1b19a',[x,.5,z]);box([.1,.1,2.6],'#c1b19a',[x,.7,z]);}
  for(let i=0;i<15;i++){const x=-3+(i%5)*1.5,z=-7-Math.floor(i/5)*1.1; sphere(.1,'#ebc780',[x,.14,z]);}
  for(const[id,x]of[['paper1',-13],['paper2',13]]){
    const root=new THREE.Group();root.position.set(x,0,0);scene.add(root);
    const body=mesh(new THREE.ConeGeometry(.48,.95,4),'#f9e6d2',[0,1.2,0],root);body.rotation.z=Math.PI;body.rotation.y=Math.PI/4;
    for(const sx of[-.16,.16])sphere(.055,'#716377',[sx,1.35,.29],root);
    sphere(.11,'#d8a0b0',[0,1.2,.35],root).scale.set(1,.4,.3);
    spirits.set(id,{root});label(id,'纸灵','spirit');
  }
  const arrow=new THREE.Group();scene.add(arrow);
  const ring=mesh(new THREE.RingGeometry(1.05,1.19,40),'#f6d279',[0,.13,0],arrow);ring.rotation.x=-Math.PI/2;ring.material=flat({color:'#fff0b9',side:THREE.DoubleSide,transparent:true,opacity:.9});
  const pointer=mesh(new THREE.ConeGeometry(.23,.5,4),'#f4ce71',[0,4.2,0],arrow);pointer.rotation.z=Math.PI;
  const destinationRing=mesh(new THREE.RingGeometry(.3,.42,32),'#f1dfb7',[0,.15,0]);destinationRing.rotation.x=-Math.PI/2;destinationRing.visible=false;
  const wardRing=mesh(new THREE.RingGeometry(3.7,4,48),'#9bccbe',[0,.17,0]);wardRing.rotation.x=-Math.PI/2;wardRing.material=flat({color:'#def1da',transparent:true,opacity:.5,side:THREE.DoubleSide});wardRing.visible=false;
  const particles=new THREE.BufferGeometry(),positions=new Float32Array(90*3);for(let i=0;i<90;i++){positions[i*3]=Math.sin(i*23.7)*14;positions[i*3+1]=.5+(i%13)*.3;positions[i*3+2]=Math.cos(i*17.3)*12;}particles.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const fireflies=new THREE.Points(particles,new THREE.PointsMaterial({color:'#fff4ac',size:.13,transparent:true,opacity:.8,depthWrite:false}));fireflies.visible=false;scene.add(fireflies);
  const skyLanterns=[];for(let i=0;i<24;i++){const o=box([.36,.58,.36],'#ffda9b',[Math.sin(i*5.8)*11,-4,Math.cos(i*3.2)*10]);o.material=flat({color:'#ffdaa2'});skyLanterns.push(o);}
  const ray=new THREE.Raycaster(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.13),point=new THREE.Vector3();
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;const rect=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    // Invisible interaction spheres still intersect when tested explicitly.
    const hits=ray.intersectObjects(pickables,false);if(hits[0])return onPick({place:hits[0].object.userData.place});
    if(ray.ray.intersectPlane(plane,point))onPick({x:point.x,z:point.z});
  });
  const resize=()=>{const r=canvas.getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();pipeline.setSize(r.width,r.height);};const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  let previous=performance.now(),animation;
  function frame(now){
    const dt=Math.min(.05,(now-previous)/1000);previous=now;const t=now/1000;
    if(state){
      for(const[id,a]of Object.entries(state.actors)){
        const v=actors.get(id),dx=a.x-v.root.position.x,dz=a.z-v.root.position.z,moving=Math.hypot(dx,dz)>.03;
        v.root.position.x=THREE.MathUtils.damp(v.root.position.x,a.x,12,dt);v.root.position.z=THREE.MathUtils.damp(v.root.position.z,a.z,12,dt);
        if(moving)v.root.rotation.y=THREE.MathUtils.damp(v.root.rotation.y,Math.atan2(dx,dz),9,dt);
        v.body.position.y=moving?Math.sin(t*13)*.06:Math.sin(t*2)*.015;v.legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(t*13+i*Math.PI)*.45:0);
        v.arms.forEach((arm,i)=>arm.rotation.x=a.job?-1.1+Math.sin(t*8)*.2:moving?-Math.sin(t*13+i*Math.PI)*.3:0);v.bag.visible=a.oil>0;
      }
      for(const lamp of state.lanterns){const v=lamps.get(lamp.id),lit=lamp.charge>0;v.glow.material.color.set(lit?'#ffd48c':'#ad998e');v.glow.material.emissiveIntensity=lit?.7+Math.sin(t*3)*.08:lamp.progress*.5;v.light.intensity=lit?5:0;v.el.classList.toggle('lit',lit);}
      for(const s of state.spirits){const v=spirits.get(s.id);v.root.position.x=THREE.MathUtils.damp(v.root.position.x,s.x,10,dt);v.root.position.z=THREE.MathUtils.damp(v.root.position.z,s.z,10,dt);v.root.position.y=Math.sin(t*2+s.x)*.16;v.root.rotation.z=Math.sin(t*2)*.1;}
      const dest=state.coach.goal==='player'?state.actors.player:PLACES[state.coach.goal];arrow.position.set(dest.x,0,dest.z);pointer.position.y=4.3+Math.sin(t*2)*.2;
      const endpoint=state.actors.player.path.at(-1);destinationRing.visible=!!endpoint;if(endpoint)destinationRing.position.set(endpoint.x,.15,endpoint.z);
      kit.landmark.open=state.actors.shopkeeper.task!=='wait'||Math.hypot(state.actors.player.x+10,state.actors.player.z+3.3)<3;
      const mist=state.weather.kind==='mist';scene.fog.near=THREE.MathUtils.damp(scene.fog.near,mist?22:65,1.6,dt);scene.fog.far=mist?78:110;
      fireflies.visible=state.weather.kind==='fireflies'||state.phase==='won';fireflies.rotation.y=Math.sin(t*.12)*.08;fireflies.position.y=Math.sin(t*.5)*.2;
      const wardAge=state.time-(state.wardAt?.time??-100);wardRing.visible=wardAge>=0&&wardAge<1;wardRing.position.set(state.actors.player.x,.17,state.actors.player.z);wardRing.scale.setScalar(1+Math.max(0,wardAge)*.4);
      skyLanterns.forEach((o,i)=>{o.visible=state.phase==='won';if(o.visible)o.position.y=2+((t*.8+i*.9)%18);});
      const placed=[],rect=canvas.getBoundingClientRect();
      for(const[id,el]of labelEls){let pos;if(actors.has(id))pos=actors.get(id).root.position.clone().add(new THREE.Vector3(0,2.6,0));else if(lamps.has(id))pos=lamps.get(id).root.position.clone().add(new THREE.Vector3(0,3.8,0));else if(spirits.has(id))pos=spirits.get(id).root.position.clone().add(new THREE.Vector3(0,2,0));else pos=new THREE.Vector3(-10,4.9,-3.3);pos.project(camera);const x=(pos.x+1)*rect.width/2;let y=(1-pos.y)*rect.height/2;for(let tries=0;tries<8&&placed.some(p=>Math.abs(p.x-x)<70&&Math.abs(p.y-y)<19);tries++)y-=20;placed.push({x,y});el.style.left=`${x}px`;el.style.top=`${y}px`;}
    }
    kit.animate(t,dt,matchMedia('(prefers-reduced-motion: reduce)').matches);pipeline.render();animation=requestAnimationFrame(frame);
  }animation=requestAnimationFrame(frame);
  return {update(next){state=next;},dispose(){cancelAnimationFrame(animation);observer.disconnect();kit.dispose();pipeline.dispose();renderer.dispose();}};
}
