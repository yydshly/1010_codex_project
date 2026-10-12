import data from '../../../notes/product-directions.json';
import street from '../../../assets/lab-street.jpg';
import forest from '../../../assets/lab-forest.jpg';
import square from '../../../assets/lab-square.jpg';

export { data };
export const images = { street, forest, square };
export const sceneNames = { street: '樱花商业街', forest: '林间村落', square: '小广场' };
export const priorityNames = { first: '优先探索', next: '按需求推进', later: '后期探索' };
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function setupProductSummary() {
  const container = document.querySelector('#direction-summary');
  if (!container) return;
  document.querySelector('.directions-preview .section-heading .text-link').childNodes[0].textContent = `查看 ${data.directions.length} 种产品方向 `;
  container.innerHTML = ['research-town', 'scene-builder', 'exploration-game'].map((id) => {
    const item = data.directions.find((direction) => direction.id === id);
    return `<a class="direction-summary-card" href="./directions.html#${item.id}"><span>${escapeHtml(item.category)} · ${priorityNames[item.priority]}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.problem)}</p><small>查看基础、缺口与最小方案 <b aria-hidden="true">↗</b></small></a>`;
  }).join('');
}
