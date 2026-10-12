// 兼容原街区参数；公开模块默认使用 UV0。
import { createDropletMaterial as createMaterial } from "../../modules/rain-kit/droplets.js";
export function createDropletMaterial(baseColor, glass = false) { return createMaterial({ color: baseColor, glass, uvChannel: 1 }); }
