/** 本地原创场景编排；模型 ID 和几何来自固定版本 Muster。单位保持米。 */
import type { AssetConfig } from '../core/types';
import type { CameraView, Formation } from '../app/types';

export const CAMP_SAVE_KEY = 'muster.fieldcamp.v1';
interface Placement { id: string; assetId: string; label: string; x: number; z: number; n: number; heading: number; spacing?: number; formation?: Formation; columns?: number; config?: AssetConfig }
export const PRESET: Placement[] = [
  { id: 'flight', assetId: 'us-p51d', label: 'P-51D 停机编队', x: -18, z: -8, n: 2, heading: 0, spacing: 15, formation: 'line' },
  { id: 'armor', assetId: 'us-m4a3-sherman', label: '谢尔曼待命车队', x: 22, z: -2, n: 2, heading: 180, spacing: 8, formation: 'line' },
  { id: 'recon', assetId: 'us-m18-hellcat', label: 'M18 机动支援', x: 11, z: -3, n: 1, heading: 180 },
  { id: 'transport', assetId: 'us-willys-mb', label: 'Willys 联络车辆', x: -3, z: 13, n: 2, heading: 90, spacing: 5, formation: 'line', config: { windscreen: 'up' } },
  { id: 'battery', assetId: 'us-m2a1-howitzer', label: '105 mm 炮班阵地', x: 22, z: -16, n: 2, heading: 180, spacing: 11, formation: 'line', config: { trails: 'deployed' } },
  { id: 'squad', assetId: 'us-rifleman', label: '步兵集结班', x: 13, z: 9, n: 12, heading: 90, spacing: 1.7, formation: 'grid', columns: 4 },
  { id: 'leader', assetId: 'us-squad-leader', label: '班长与指挥组', x: 9, z: 13, n: 2, heading: 270, spacing: 2, formation: 'line' },
  { id: 'bar', assetId: 'us-bar-gunner', label: 'BAR 支援组', x: 26, z: 11, n: 3, heading: 180, spacing: 2, formation: 'line' },
];

export const NAMES: Record<string, string> = Object.fromEntries(PRESET.map(p => [p.assetId, p.label]));
export const ZONES = [
  { id: 'overview', number: '00', name: '营地全景', subtitle: '一座可以亲手编排的微缩营地', detail: '沿停机坪、联络道路、装甲待命区和炮位观察素材如何组成场景。点击模型可选择，拖动可调整布置。', group: 'transport', view: { target: [0, 0, 0], yaw: 28, pitch: 48, distance: 118 } },
  { id: 'flight', number: '01', name: '停机与保障', subtitle: 'P-51D · 从单模型到停机编队', detail: '两架 P-51D 按真实米制尺寸停放，保留金属表面、座舱和起落架。机库与停机坪是本地新增的场景构件。', group: 'flight', view: { target: [-18, 1.1, -8], yaw: 28, pitch: 29, distance: 48 } },
  { id: 'armor', number: '02', name: '装甲集结', subtitle: 'Sherman · 装备选项直接改变几何', detail: '为谢尔曼装上履带挡板，或者收起车尾篷布。它们调用原资产的配置构建能力，改变的是眼前的 3D 模型。', group: 'armor', view: { target: [22, 1, -2], yaw: 154, pitch: 25, distance: 32 } },
  { id: 'squad', number: '03', name: '人员与联络', subtitle: 'Infantry · 数量、队形与成组编辑', detail: '把步兵从网格切换为横队，改变人数和间距。模型保留原来的装备组合，整组与单人都可以选中、拖动和旋转。', group: 'squad', view: { target: [15, 0.9, 11], yaw: 42, pitch: 28, distance: 35 } },
  { id: 'battery', number: '04', name: '炮班阵地', subtitle: 'M2A1 · 展开与收拢的真实配置', detail: '切换炮架展开 / 收拢，比较炮班阵地与牵引准备状态。沙袋与补给箱使火炮在场景中有了摆放依据。', group: 'battery', view: { target: [22, 0.8, -16], yaw: 155, pitch: 32, distance: 40 } },
] satisfies { id: string; number: string; name: string; subtitle: string; detail: string; group: string; view: CameraView }[];

export const LABELS: Record<string, string> = {
  sandShields: '履带挡板', stowage: '车尾篷布 / 行李', star: '白色识别星',
  windscreen: '吉普风挡', trails: '炮架状态', up: '竖起', folded: '放倒',
  deployed: '展开炮架', closed: '收拢炮架', gun: '主炮型号',
  m1a2: 'M1A2 · 带炮口制退器', m1a1: 'M1A1 · 无制退器',
  pose: '持枪姿态', haversack: 'M1928 背包', 'port-arms': '胸前持枪',
  'order-arms': '立枪姿态', 'low-ready': '低位持枪', 'shoulder-carry': '肩扛武器',
};
