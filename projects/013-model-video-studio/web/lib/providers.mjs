import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export function validateConfig(config, role) {
  const allowed = { text: ['codex','openai'], image: ['import','openai','minimax'], voice: ['openai','minimax'], video:['disabled','studio'], lipsync:['disabled','studio'], music:['disabled','studio'] };
  if (!allowed[role]?.includes(config.provider)) throw new Error('不支持的模型协议');
  const result = { provider: config.provider, model: String(config.model || '').trim().slice(0, 100), apiKey: String(config.apiKey || ''), voice: String(config.voice || '').slice(0, 120) };
  if (result.apiKey.length > 4096 || /[\r\n]/.test(result.apiKey)) throw new Error('密钥格式不正确');
  if (['codex','import','disabled'].includes(result.provider)) return result;
  const url = new URL(config.baseUrl);
  if (url.username || url.password || url.search || url.hash) throw new Error('接口地址不能包含账户、查询参数或片段');
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('远程接口使用 HTTPS；本地模型可使用 HTTP');
  if (!result.model) throw new Error('请填写模型名称');
  result.baseUrl = url.href.replace(/\/$/, '');
  return result;
}
export function publicConfig(config) {
  return Object.fromEntries(Object.entries(config).map(([role, c]) => {
    const { apiKey, ...safe } = c; return [role, { ...safe, keyConfigured: !!apiKey }];
  }));
}
export async function minimaxEnv(file) {
  try {
    const raw = await readFile(file, 'utf8'), env = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
    return { baseUrl: env.MINIMAX_API_BASE || 'https://api.minimax.cn', apiKey: env.MINIMAX_API_KEY || '' };
  } catch { return { baseUrl: 'https://api.minimax.cn', apiKey: '' }; }
}
function endpoint(base, route) { return base.replace(/\/v1\/?$/, '').replace(/\/$/, '') + '/v1/' + route; }
async function request(config, route, body, binary = false) {
  let res;
  try {
    res = await fetch(endpoint(config.baseUrl, route), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(config.apiKey ? { Authorization: 'Bearer ' + config.apiKey } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(150000), redirect: 'error' });
  } catch (e) { throw new Error(e.name === 'TimeoutError' ? '模型接口超过 150 秒' : '模型接口连接失败，请核对地址和网络'); }
  if (!res.ok) throw new Error('模型接口 HTTP ' + res.status);
  if (binary) return Buffer.from(await res.arrayBuffer());
  const data = await res.json();
  if (data.error || data.base_resp?.status_code) throw new Error('模型接口错误代码 ' + (data.error?.code || data.base_resp?.status_code));
  return data;
}
const fields = { title: { type: 'string' }, body: { type: 'string' }, narration: { type: 'string' }, imagePrompt: { type: 'string' } };
export const storyboardSchema = { type: 'object', additionalProperties: false, required: ['title','scenes'], properties: { title: { type: 'string' }, scenes: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'object', additionalProperties: false, required: Object.keys(fields), properties: fields } } } };
export async function generateText(config, codex, brief) {
  const prompt = `根据用户创作说明，制作约75秒、6个场景的中文介绍视频。主题必须以用户说明为准，不相关时不要介绍工作台本身。用户说明：${brief}\n当主题涉及「映序 Studio」时，以下事实可作参考：文案复用本机 Codex 或 OpenAI兼容接口；图片导入或使用兼容/MiniMax图片API；配音用 MiniMax 或兼容Speech API；人工编辑标题、要点、口播，以前移、后移按钮调整排序；可重新生成单场景素材；本机FFmpeg导出1080p MP4。当前聊天内置图片工具需先生成再导入，不能声称网页直接调用。每个title为4至10个汉字，body为12至25个汉字；每个narration为45至58个汉字（总约300字），自然中文口播，避免生硬朗读API缩写或英文品牌；口播聚焦用户价值。imagePrompt为英文，描写无文字的高质量编辑插画，象征该场景，统一柔和紫色和青绿色、奶油纸色。不要生成写实人物、品牌logo或文字。title填写整个视频名称。只输出JSON。`;
  let result;
  if (config.provider === 'codex') result = await codex.generate(prompt, storyboardSchema, config.model || codex.model);
  else {
    const data = await request(config, 'chat/completions', { model: config.model, messages: [{ role: 'system', content: '只输出JSON，格式为{title:string,scenes:[{title,body,narration,imagePrompt}]}。' }, { role: 'user', content: prompt }], max_tokens: 4096 });
    result = { text: data.choices?.[0]?.message?.content, provider: 'openai', model: config.model, usage: data.usage };
  }
  const text = result.text?.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  let draft; try { draft = JSON.parse(text); } catch { throw new Error('文案模型返回的内容不是有效分镜 JSON'); }
  if (!Array.isArray(draft.scenes) || draft.scenes.length < 3 || draft.scenes.length > 8) throw new Error('文案模型必须返回3至8个场景');
  for (const s of draft.scenes) for (const key of Object.keys(fields)) if (typeof s[key] !== 'string' || !s[key].trim() || s[key].length > 1500) throw new Error('分镜缺少有效的 ' + key);
  return { draft, evidence: { provider: result.provider, model: result.model, usage: result.usage, at: new Date().toISOString() } };
}
export async function generateImage(config, prompt, file) {
  if (config.provider === 'import') throw new Error('当前图片模式是导入：请为这个场景上传图片，或配置图片 API');
  const data = config.provider === 'minimax'
    ? await request(config, 'image_generation', { model: config.model, prompt: prompt.slice(0, 1500), aspect_ratio: '16:9', response_format: 'base64', n: 1 })
    : await request(config, 'images/generations', { model: config.model, prompt, size: '1536x1024', n: 1 });
  let bytes;
  const base64 = data.data?.image_base64?.[0] || data.data?.[0]?.b64_json;
  if (base64) bytes = Buffer.from(base64.replace(/^data:.*?;base64,/, ''), 'base64');
  else {
    const imageUrl = new URL(data.data?.image_urls?.[0] || data.data?.[0]?.url);
    if (imageUrl.protocol !== 'https:') throw new Error('图片下载链接必须是 HTTPS');
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error('图片下载 HTTP ' + res.status);
    bytes = Buffer.from(await res.arrayBuffer());
  }
  if (bytes.length < 256 || bytes.length > 20000000) throw new Error('图片数据大小不正确');
  await writeFile(file, bytes);
  return { provider: config.provider, model: config.model, traceId: data.id, sha256: hash(bytes), at: new Date().toISOString() };
}
export async function generateVoice(config, text, file) {
  let bytes, traceId;
  if (config.provider === 'minimax') {
    const data = await request(config, 't2a_v2', { model: config.model, text, stream: false, language_boost: 'Chinese', output_format: 'hex', voice_setting: { voice_id: config.voice || 'Chinese (Mandarin)_Warm_Girl', speed: 1.08, vol: 1, pitch: 0 }, audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 } });
    if (!/^[a-f0-9]+$/i.test(data.data?.audio || '') || data.data.audio.length % 2) throw new Error('配音接口没有返回有效音频');
    bytes = Buffer.from(data.data.audio, 'hex'); traceId = data.trace_id;
  } else bytes = await request(config, 'audio/speech', { model: config.model, input: text, voice: config.voice || 'alloy', response_format: 'mp3' }, true);
  if (bytes.length < 500 || bytes.length > 20000000) throw new Error('配音数据大小不正确');
  await writeFile(file, bytes);
  return { provider: config.provider, model: config.model, voice: config.voice, traceId, text, sha256: hash(bytes), at: new Date().toISOString() };
}
export function hash(value) { return createHash('sha256').update(value).digest('hex'); }
