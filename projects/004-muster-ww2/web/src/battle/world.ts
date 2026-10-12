import * as THREE from 'three';
import { buildCampEnvironment } from '../showcase/environment';
import { COVERS, GOAL, BOUNDS } from './game';
import { AIRPORT, type AirportMission } from './airport';

export function buildBattleWorld(airport = false) {
  const goal = airport ? AIRPORT.headquarters : GOAL;
  const root = buildCampEnvironment().root;
  const earth = new THREE.MeshStandardMaterial({ color: '#7a805d', roughness: 1 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(74, 0.6, 50), earth); base.position.y = -0.32; base.receiveShadow = true; root.add(base);
  const wood = new THREE.MeshStandardMaterial({ color: '#796646', roughness: 0.94 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#969b89', roughness: 0.92 });
  const stripe = new THREE.MeshStandardMaterial({ color: '#c6b775', roughness: 0.8 });
  for (const c of COVERS.slice(0, 3)) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), c.id === 'revetment' ? concrete : wood);
    box.position.set(c.x, c.h / 2, c.z); box.castShadow = true; box.receiveShadow = true; root.add(box);
    for (const dx of [-c.w * 0.35, c.w * 0.35]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.15, c.h + 0.02, c.d + 0.04), stripe); band.position.set(c.x + dx, c.h / 2, c.z); root.add(band);
    }
  }
  // Boundary marking is paired with the same numerical playable bounds.
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-BOUNDS.x, 0.04, -BOUNDS.z), new THREE.Vector3(BOUNDS.x, 0.04, -BOUNDS.z),
    new THREE.Vector3(BOUNDS.x, 0.04, BOUNDS.z), new THREE.Vector3(-BOUNDS.x, 0.04, BOUNDS.z),
  ]), new THREE.LineBasicMaterial({ color: '#c5b990', transparent: true, opacity: 0.55 })); root.add(line);
  const zoneMaterial = new THREE.MeshBasicMaterial({ color: '#d4bb70', transparent: true, opacity: 0.55, depthWrite: false });
  const zone = new THREE.Mesh(new THREE.RingGeometry(goal.radius - 0.16, goal.radius, 80).rotateX(-Math.PI / 2), zoneMaterial);
  zone.position.set(goal.x, 0.07, goal.z); root.add(zone);
  const diskMaterial = new THREE.MeshBasicMaterial({ color: '#d4bb70', transparent: true, opacity: 0.06, depthWrite: false });
  const disk = new THREE.Mesh(new THREE.CircleGeometry(goal.radius, 64).rotateX(-Math.PI / 2), diskMaterial); disk.position.copy(zone.position); root.add(disk);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 4.8, 8), concrete); mast.position.set(goal.x, 2.4, goal.z - 4.5); root.add(mast);
  const flagMaterial = new THREE.MeshStandardMaterial({ color: '#d4bb70', side: THREE.DoubleSide });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.75), flagMaterial); flag.position.set(goal.x + 0.65, 4.25, goal.z - 4.5); root.add(flag);
  const markerCanvas = document.createElement('canvas'); markerCanvas.width = 256; markerCanvas.height = 256;
  const ctx = markerCanvas.getContext('2d')!; ctx.font = 'bold 110px sans-serif'; ctx.fillStyle = '#e2d9b7'; ctx.textAlign = 'center'; ctx.fillText(airport ? 'HQ' : 'A', 128, 166);
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(markerCanvas), transparent: true, depthWrite: false }));
  mark.position.set(goal.x, 0.06, goal.z); root.add(mark);
  const markers: { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; kind: string; index: number; sprite?: THREE.Sprite }[] = [];
  if (airport) {
    const points = [{ ...AIRPORT.depot, text: 'D · 补给站 / 停车装货', kind: 'depot' }, ...AIRPORT.recon.map(p=>({ ...p, text: `${p.id === 'north' ? 'N' : 'E'} · 侦察 / 停车观察`, kind: 'recon' })), ...AIRPORT.posts.map(p=>({ ...p, text: p.name, kind: 'post' }))];
    points.forEach((p,i)=>{
      const material = new THREE.MeshBasicMaterial({ color: p.kind === 'recon' ? '#e2c16c' : '#7ecbd0', transparent:true, opacity:0.8, depthWrite:false });
      const mesh=new THREE.Mesh(new THREE.RingGeometry(p.radius-0.12,p.radius,64).rotateX(-Math.PI/2),material);mesh.position.set(p.x,0.09,p.z);root.add(mesh);markers.push({mesh,kind:p.kind,index:i});
      const c=document.createElement('canvas');c.width=512;c.height=72;const cx=c.getContext('2d')!;cx.fillStyle='#20362deb';cx.fillRect(0,0,512,72);cx.font='bold 26px Microsoft YaHei,sans-serif';cx.textAlign='center';cx.fillStyle=p.kind==='recon'?'#f0d393':'#a6ddd5';cx.fillText(p.text,256,46);
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));sprite.scale.set(7.5,1.05,1);sprite.position.set(p.x,2.8,p.z);root.add(sprite);markers[markers.length-1].sprite=sprite;
    });
    for(let i=0;i<4;i++) { const crate=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.65,0.65),wood);crate.position.set(AIRPORT.depot.x+(i%2)*0.9-0.5,0.325+Math.floor(i/2)*0.65,AIRPORT.depot.z+2);crate.castShadow=true;root.add(crate); }
    const sand=new THREE.MeshStandardMaterial({color:'#a89e78',roughness:1});
    for(const p of AIRPORT.posts)for(let i=0;i<6;i++)for(let row=0;row<2;row++){const bag=new THREE.Mesh(new THREE.BoxGeometry(.55,.28,.85),sand);bag.position.set(p.x+2.3,.14+row*.27,p.z+(i-2.5)*.8+(row?.15:0));bag.castShadow=true;bag.receiveShadow=true;root.add(bag);}
  }
  return { root, update(captured: number, contested: boolean, mission: AirportMission | null = null) {
    const color = contested ? '#e18e64' : mission || captured > 0 ? '#6ecbd2' : '#d4bb70'; zoneMaterial.color.set(color); diskMaterial.color.set(color); flagMaterial.color.set(color);
    markers.forEach(m=>{ if(mission){const visible=m.kind==='post'?mission.phase>=1:m.kind==='recon'?mission.phase===0:true;m.mesh.visible=visible;if(m.sprite)m.sprite.visible=visible;} if(m.kind==='recon'&&mission){const p=mission.recon[m.index-1];m.mesh.material.color.set(p.done?'#8cce9e':'#e2c16c');m.mesh.material.opacity=p.done?0.3:0.8;} });
  } };
}

export class BattleEffects {
  readonly root = new THREE.Group();
  private sphere = new THREE.SphereGeometry(1, 10, 8);
  private bursts: { group: THREE.Group; age: number; duration: number; large: boolean }[] = [];
  private shells = new Map<number, THREE.Mesh>();
  private bombs = new Map<number, THREE.Mesh>();
  private shellMaterial = new THREE.MeshBasicMaterial({ color: '#ffdda0' });
  constructor() { this.root.name = 'battle-effects'; }
  burst(x: number, y: number, z: number, large: boolean, muzzle = false) {
    const g = new THREE.Group(); g.position.set(x, y, z); this.root.add(g);
    for (let i = 0; i < (large ? 10 : muzzle ? 2 : 5); i++) {
      const m = new THREE.Mesh(this.sphere, new THREE.MeshBasicMaterial({ color: i < 2 ? '#ffd38c' : '#5c6057', transparent: true, opacity: 0.8, depthWrite: false }));
      m.position.set(Math.sin(i * 2.4) * (large ? 1.1 : 0.3), i * 0.15, Math.cos(i * 2.4) * (large ? 1.1 : 0.3)); g.add(m);
    }
    this.bursts.push({ group: g, age: 0, duration: muzzle ? 0.2 : large ? 3 : 0.8, large });
  }
  update(dt: number, shells: { id: number; x: number; y: number; z: number; vx: number; vz: number; weapon: string }[], bombs: { id: number; x: number; y: number; z: number }[] = []) {
    const live = new Set(shells.map(s => s.id));
    this.shells.forEach((m, id) => { if (!live.has(id)) { this.root.remove(m); this.shells.delete(id); } });
    for (const s of shells) {
      let m = this.shells.get(s.id); if (!m) { m = new THREE.Mesh(this.sphere, this.shellMaterial); m.scale.set(0.085, 0.085, 0.75); this.root.add(m); this.shells.set(s.id, m); }
      m.scale.set(s.weapon === 'rifle' ? 0.025 : 0.085, s.weapon === 'rifle' ? 0.025 : 0.085, s.weapon === 'rifle' ? 0.35 : 0.75);
      m.position.set(s.x, s.y, s.z); m.rotation.y = Math.atan2(s.vx, s.vz);
    }
    const flying = new Set(bombs.map(b => b.id));
    this.bombs.forEach((m, id) => { if (!flying.has(id)) { m.removeFromParent(); this.bombs.delete(id); } });
    for (const b of bombs) {
      let m = this.bombs.get(b.id);
      if (!m) { m = new THREE.Mesh(this.sphere, this.shellMaterial); m.scale.set(0.16, 0.5, 0.16); this.root.add(m); this.bombs.set(b.id, m); }
      m.position.set(b.x, b.y, b.z);
    }
    this.bursts = this.bursts.filter(b => {
      b.age += dt; const p = b.age / b.duration;
      b.group.children.forEach((o, i) => {
        const m = o as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
        m.scale.setScalar((b.large ? 0.45 : 0.12) + p * (b.large ? 1.7 : 0.6)); m.position.y += dt * (0.8 + i * 0.05);
        m.material.opacity = (i < 2 ? Math.max(0, 1 - p * 4) : (1 - p) * 0.6);
      });
      if (p < 1) return true;
      this.removeBurst(b.group); return false;
    });
  }
  private removeBurst(g: THREE.Group) { this.root.remove(g); g.children.forEach(o => ((o as THREE.Mesh).material as THREE.Material).dispose()); }
  reset() { this.bursts.forEach(b => this.removeBurst(b.group)); this.bursts = []; this.shells.forEach(m => this.root.remove(m)); this.shells.clear(); this.bombs.forEach(m => m.removeFromParent()); this.bombs.clear(); }
  getState() { return { bursts: this.bursts.length, shells: this.shells.size, bombs: this.bombs.size }; }
}
