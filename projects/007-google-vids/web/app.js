import {modes,kindLabels} from './data.js';
const $=id=>document.getElementById(id);
let mode=modes[0], point=mode.points[0];
const format=seconds=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
function updateNote(){
  $('kind').textContent=kindLabels[point.kind]; $('kind').className='kind '+point.kind;
  $('time-label').textContent=format(point.time); $('annotation-title').textContent=point.title;
  for(const key of ['seen','ai','human','unknown']) $(key).textContent=point[key];
  $('original-link').href='https://www.youtube.com/watch?v='+mode.video+'&t='+point.time+'s';
  $('video-caption').textContent=mode.subtitle+' / '+format(point.time)+' 起';
  for(const button of $('points').children) button.setAttribute('aria-pressed',String(Number(button.dataset.time)===point.time));
}
function play(time){
  const frame=document.createElement('iframe');
  frame.title='Google Workspace 官方视频：'+mode.subtitle;
  frame.src='https://www.youtube.com/embed/'+mode.video+'?start='+time+'&end='+mode.end+'&autoplay=1&rel=0&playsinline=1';
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen=true; frame.referrerPolicy='strict-origin-when-cross-origin';
  $('player-wrap').replaceChildren(frame);
  $('player-status').textContent='播放器已打开；若未自动播放，请点击播放器。无法加载时可打开原视频。';
}
function selectMode(next,load){
  mode=next; point=next.points.find(p=>p.time===next.start)??next.points[0];
  for(const button of $('mode-buttons').children) button.setAttribute('aria-pressed',String(button.dataset.mode===mode.id));
  $('points').replaceChildren(...mode.points.map(p=>{
    const button=document.createElement('button'); button.className='point'; button.dataset.time=p.time;
    const time=document.createElement('time');time.textContent=format(p.time);
    const label=document.createElement('span');label.textContent=p.label;
    button.append(time,label);button.addEventListener('click',()=>{point=p;updateNote();play(p.time);});return button;
  }));
  updateNote(); if(load) play(next.start);
}
for(const item of modes){
  const button=document.createElement('button'); button.className='mode';button.dataset.mode=item.id;
  const label=document.createElement('strong');label.textContent=item.label;
  const subtitle=document.createElement('small');subtitle.textContent=item.subtitle;
  button.append(label,subtitle);button.addEventListener('click',()=>selectMode(item,true));$('mode-buttons').append(button);
}
$('play').addEventListener('click',()=>play(point.time));
selectMode(modes[0],false);
