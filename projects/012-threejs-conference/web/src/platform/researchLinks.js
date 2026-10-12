export const localHost = ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
export function bindResearchLinks() {
  const peer=localHost ? 'http://127.0.0.1:5188/' : '../001-sakura-crossing/';
  for(const [attribute,page] of [['data-research-hub','research.html'],['data-research-map','scene-map.html'],['data-weather','weather.html']]) {
    document.querySelectorAll(`[${attribute}]`).forEach(anchor=>{anchor.href=peer+page;});
  }
}
