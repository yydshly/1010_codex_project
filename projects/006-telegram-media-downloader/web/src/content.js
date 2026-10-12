export const upstream = 'https://github.com/Neet-Nestor/Telegram-Media-Downloader';
export const revision = '169a678627cec090ce1fa8b6eaac250547f0121a';
export const source = `${upstream}/blob/${revision}/src/tel_download.js`;

export const media = {
  image: { label: '图片', title: '山间的一次日落', filename: 'sunset-example.jpeg', size: '2.4 MB', caption: '读取当前图片地址，触发浏览器保存。', detail: '图片使用页面中的 img.src。示例文件名经过人工命名；上游图片默认使用随机名称。', lines: 'L468–480', anchor: '#L468-L480', progress: false },
  video: { label: '视频 / GIF', title: '把这一刻，保存下来', filename: 'landscape-example.mp4', size: '24 MB', caption: '按字节范围读取，逐段保存媒体。', detail: '自有视频路径检查 Content-Range 并更新进度。GIF 类动画也可能以视频形式保存；原画质和多分辨率表现待实测。', lines: 'L150–321', anchor: '#L150-L321', progress: true },
  audio: { label: '语音', title: '一段值得留下的讲解', filename: 'voice-example.ogg', size: '1.2 MB', caption: 'WebK 已加载的语音来源可进入音频保存流程。', detail: '语音入口来自 WebK 的 audio-element 与置顶音频控件。WebA 主线没有同等语音入口。波形与时长均为示意，无真实音频。', lines: 'L640–683', anchor: '#L640-L683', progress: false },
  story: { label: 'Stories', title: '短暂的画面，也有保存入口', filename: 'story-example.jpeg', size: '3.6 MB', caption: '识别故事中的图片或视频，选择对应保存路径。', detail: 'WebK 与 WebA 分别适配 Stories 的容器和媒体元素。此处演示图片故事；视频故事会走视频路径。', lines: 'L486–531 / L685–726', anchor: '#L486-L531', progress: false },
};

export const steps = [
  { title: '已有访问', subtitle: '账号能查看媒体', heading: '先有网页访问，再有保存入口。', text: '媒体来自当前已登录、能够查看内容的 Telegram 网页。脚本没有增加访问未获权限频道的实现；本展示也不连接账号。', code: '当前账号 → 网页能显示 / 播放媒体', lines: 'README · 使用前提', url: `${upstream}/blob/${revision}/README.md` },
  { title: '识别页面', subtitle: '扫描 DOM 与按钮', heading: '网页结构，是脚本的观察入口。', text: '两个约 500 毫秒的定时器分别识别 WebK / WebA 媒体容器。恢复隐藏的官方按钮，或插入自有按钮。具体类名变化可能使适配失效。', code: '500 ms 扫描 → 媒体元素 / 隐藏按钮', lines: 'L485–636 / L639–831', url: `${source}#L485-L831` },
  { title: '选择路径', subtitle: '官方按钮 / 媒体地址', heading: '两条保存路径，体验有所不同。', text: 'WebK 能恢复并复用官方下载按钮；自有路径读取 img.src、video.currentSrc 或音频来源。官方下载可能进入浏览器下载管理，不一定显示脚本进度。', code: '官方按钮 → 点击\n当前媒体地址 → 自有保存函数', lines: 'L740–805 / L468–480', url: `${source}#L740-L805` },
  { title: '读取数据', subtitle: 'Range 与完整性检查', heading: '分段读取，不等于断点续传。', text: '视频与音频从当前偏移继续请求，解析 Content-Range 并检查范围。实际分块大小由响应决定；没有持久化任务和成熟重试机制。', code: 'Range: bytes=offset-\nContent-Range: bytes start-end/total', lines: 'L176–265 / L329–408', url: `${source}#L176-L265` },
  { title: '保存文件', subtitle: '文件写入 / Blob 回退', heading: '浏览器能力决定保存方式。', text: '支持文件系统接口时分段写入；否则在内存中累积 Blob，生成对象 URL 触发保存。写入等待链、200 响应和大文件内存影响仍需实测。', code: '文件系统接口 → 分段写入\n回退路径 → Blob → 浏览器保存', lines: 'L267–320 / L410–465', url: `${source}#L267-L320` },
];

export const scenarios = [
  { label: '个人备份', heading: '给自己的媒体，留一份本地副本。', text: '保存自己或获授权的图片、视频和语音，便于离线查看。先验证文件能打开，再把它纳入日常备份。', value: '直接价值：减少逐个寻找保存入口的操作', boundary: '输出质量、稳定性与最高画质待实测。', symbol: '01' },
  { label: '学习资料', heading: '把讲解留住，把来源一起记下。', text: '保存讲解图、语音和视频后，另行记录标题、来源和日期。转写、摘要与全文检索是后续扩展，不是当前下载器能力。', value: '延伸价值：从媒体文件走向可检索资料', boundary: '来源整理、OCR 和 AI 摘要尚未实现。', symbol: '02' },
  { label: '创作研究', heading: '为参考素材，建立清晰的来路。', text: '收集获授权的设计、游戏与前端演示素材，供本地研究。把文件与项目笔记关联，减少“保存后找不到”的问题。', value: '对研究集的价值：连接素材、来源与笔记', boundary: '保存权限与二次发布授权需分别确认。', symbol: '03' },
  { label: '工具开发', heading: '学习如何给现有网页，加一层能力。', text: '以这个小型脚本研究 DOM 适配、媒体取数、HTTP Range 和浏览器文件写入。网页结构和完整性边界，比下载图标更值得研究。', value: '技术价值：理解浏览器增强工具的完整流程', boundary: '长期自动归档需要队列、去重与恢复机制。', symbol: '04' },
];

export const roadmap = [
  { title: '先把文件保存可靠', tag: 'P0 · 下载正确性', text: '等待每次写入和最终关闭，传递异常，区分 200 / 206，检查最终字节数，加入真实取消与重试。', prerequisite: '前提：有已知原始文件的小 / 大样例，可注入读取和写入失败。', output: '产物：可靠下载引擎、明确成功 / 失败状态与错误记录。', acceptance: '验收：正常与异常路径均不误报成功，样例文件可比对哈希。', source: `${upstream}/issues/164` },
  { title: '让用户选择，交给队列执行', tag: 'P1 · 批量与任务', text: '为用户选中的媒体建立队列，限制并发，拦截重复任务，提供失败重试与任务记录。', prerequisite: '前提：单文件正常、错误与取消路径已通过验证。', output: '产物：可确认的选择列表、任务状态与明确的刷新恢复策略。', acceptance: '验收：页面切换不下载错误媒体；重试不重复写入，失败任务可定位。', source: `${upstream}/issues/159` },
  { title: '把来源和文件一起留下', tag: 'P2 · 整理与去重', text: '记录消息来源、日期、标题、文件哈希和标签，按来源与时间命名并建立本地索引。', prerequisite: '前提：能取得所选媒体的来源，允许用户控制记录范围。', output: '产物：媒体文件 + 来源卡 + 去重索引。', acceptance: '验收：从文件能回查来源；重复内容不静默覆盖，缺失字段有说明。', source: null },
  { title: '让内容可以检索与回查', tag: 'P3 · 知识处理', text: '按需接入图片 OCR、语音转写、摘要和全文搜索，保留生成内容与原始媒体的对应关系。', prerequisite: '前提：文件可靠、来源可查；模型费用与外部传输范围明确。', output: '产物：可检索文本、原文链接与可修正的生成记录。', acceptance: '验收：摘要可回到原始片段；评估错误率与检索耗时，收益仍需实测。', source: null },
  { title: '把网页变化隔离到适配层', tag: 'P4 · 维护与复用', text: '拆分 WebK / WebA 适配器，统一媒体描述与下载引擎；页面事件明确时评估变化监听。', prerequisite: '前提：维护每个平台的验证样例；模块边界可以在 P0 起建立。', output: '产物：平台适配器、共同数据结构和回归样例。', acceptance: '验收：网站改版后的失败能定位；更新单个平台不破坏另一个入口。', source: null },
];

export const valueProfiles = {
  occasional: { heading: '先用一个小样例，判断是否省事。', description: '偶尔保存时，入口是否好找、文件是否可用，比新增自动化功能更直接。如果原页面已经允许下载，优先用官方按钮。', priority: '投入顺序：检查官方入口 → 试一个获授权样例 → 核验输出', benefit: '把可查看的媒体变成本地副本；具体省时效果未测。', cost: '脚本安装与维护，失败排查，手工记录来源。', measure: '记录尝试次数、失败原因与单次操作耗时，再决定是否长期使用。' },
  research: { heading: '最有价值的增量，是来源与检索。', description: '如果 Telegram 经常是你的资料入口，单纯保存更多文件容易增加整理负担。先让每个文件对应来源、标签和项目，再考虑转写与搜索。', priority: '投入顺序：可靠保存 → 来源卡与去重 → 按需检索', benefit: '把参考素材、消息出处和当前项目笔记连接起来。', cost: '索引格式、来源维护、存储，以及可选模型处理费用。', measure: '观察每周实际复用次数与找资料耗时；没有这些数据前不推算收益。' },
  developer: { heading: '把它当作浏览器增强工具的研究样本。', description: '单文件用户脚本把页面识别、媒体取数和本地保存连在一起。值得拆解的是平台适配边界、异步错误传播和完整性验证。', priority: '投入顺序：固定版本 → 跟踪两条路径 → 修可靠性 → 拆适配层', benefit: '学习 DOM 注入、Range、文件写入，以及复用已有网页能力的方法。', cost: '需要可控样例与账号测试；网站变化会带来持续维护。', measure: '用正常、异常和大文件样例证明修复，再评估是否可复用到其他获授权页面。' },
};
