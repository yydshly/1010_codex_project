/** Adapted from ClaudeAnimationBase/src/clawd.js move(), MIT, John Heibel 2026.
 * Commit 0ac8bf2b31942376cb6b8c4074715595d512acd2. See THIRD_PARTY_NOTICES.md.
 * Changes: explicit BPM/offset, supported subset, TypeScript and no global p5 dependency.
 */
export function move(style:string,t:number,bpm:number,offset:number){
  const bp=(t-offset)*bpm/60,bf=bp-Math.floor(bp),hit=Math.max(0,1-bf*3.5),s1=Math.sin(bp*Math.PI),ab=Math.abs(s1);
  const o={dy:0,sq:0,aL:.2,aR:.2,rot:0,walk:0,dx:0};
  switch(style){
    case 'bounce':o.dy=-ab*1.6;o.sq=hit*.12;o.aL=.4+s1;o.aR=.4-s1;break;
    case 'hop':o.dy=-ab*4;o.sq=hit*.18;o.aL=o.aR=.3+ab*1.1;break;
    case 'sway':o.dx=s1*3;o.rot=s1*.12;o.aL=.5+.6*s1;o.aR=.5-.6*s1;o.sq=hit*.08;break;
    case 'wave':o.dy=-ab;o.aL=1.1+.5*Math.sin(bp*Math.PI*4);o.aR=-.2;o.sq=hit*.08;break;
    case 'walk':o.walk=bp/2;o.dy=-ab*.6;o.aL=.3*s1;o.aR=-o.aL;break;
    default:o.dy=-ab*.5;o.sq=hit*.05;
  }return o;
}
