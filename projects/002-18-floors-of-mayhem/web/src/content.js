export const gallery = [
  {
    id: 'boss', label: '妖王战', tag: '01 / BOSS BATTLE',
    image: 'upstream-boss.png', title: '下落之后，横版开打。',
    description: '看起手、躲攻击、打破架势。探索会切换为封闭平台战，战利品带进下一境。',
    source: '上游作者提供的孙悟空平台战截图',
    alt: '孙悟空平台战：角色、横版平台与 Boss 生命和架势条'
  },
  {
    id: 'motion', label: '游玩片段', tag: '02 / GAMEPLAY',
    image: 'upstream-gameplay.gif', poster: 'upstream-boss.png', title: '看一场会动的像素冒险。',
    description: '角色、场景与战斗反馈组成实际游玩片段。点击画面右上角可以停止动态预览。',
    source: '上游最终制作视频的游玩截取 GIF',
    alt: '上游视频截取的动态游玩画面'
  },
  {
    id: 'ultimate', label: '角色技能', tag: '03 / HERO SKILLS',
    image: 'upstream-ultimate.png', title: '同一个世界，不同的出招。',
    description: '灵气与方向组合输入触发专属技能。角色动作、特效和命中反馈连接到真实战斗规则。',
    source: '上游作者提供的专属大招演出截图',
    alt: '上游角色专属大招演出画面'
  },
  {
    id: 'lobby', label: '游戏大厅', tag: '04 / LOBBY',
    image: 'lobby.png', title: '选个怪咖，准备出发。',
    description: '五个固定角色、自定义捏脸、章节巡游与玩法入口。第一次进入就能看懂如何开始。',
    source: '本次本地运行的真实大厅截图',
    alt: '本地游戏大厅，包含场景巡游和角色选择'
  },
  {
    id: 'ai', label: 'AI 配置', tag: '05 / MODEL AGENTS',
    image: 'ai-settings.png', title: '让模型也成为参赛者。',
    description: '本地版可以配置模型、人格和视觉观察。普通电脑无需 API；模型对战需要自己的有效接口。',
    source: '本次本地 AI 配置截图，未调用真实模型',
    alt: '本地 AI 选手配置，API key 输入为空'
  },
  {
    id: 'result', label: '本局结算', tag: '06 / RESULTS',
    image: 'solo-result.png', title: '结束一局，带走一个称号。',
    description: '距离、角色头像与本局行为进入结算。再来一局、返回大厅和个人最佳构成短局循环。',
    source: '本次本地短局结算：19 米 / 190 分',
    alt: '本地结算显示嘴硬的男人称号与角色头像'
  }
];

export const modes = [
  { id: 'solo', label: '下落冒险', number: '01', headline: '下一块平台，在哪里？',
    description: '持续寻找落点，在碎裂、移动、弹簧和尖刺之间做选择。补给、精英与 Boss 改变每一段节奏。',
    chips: ['机关与道具', '九章 · 九个妖王', '本机存档'],
    loop: ['寻找落点', '穿过机关', '迎战妖王', '携奖励继续'],
    note: '81 难是九章组合配置，不代表 81 个独立 Boss。' },
  { id: 'friends', label: '朋友联机', number: '02', headline: '同一张地图，各自找活路。',
    description: '创建房间、邀请朋友，共享地图与比赛状态。无尽看存活，限时看距离，淘汰后可以观战。',
    chips: ['2–12 位玩家', '房间码邀请', '服务端判定'],
    loop: ['创建房间', '朋友加入', '共享对局', '排名与重开'],
    note: '12 客户端本地测试已通过，真实公网性能仍待验证。' },
  { id: 'coop', label: '双人搭子', number: '03', headline: '自己活下来，也拉搭子一把。',
    description: '传一颗红心、接住补给、靠近拉起濒死的队友。两人的较小深度，才是共同走过的距离。',
    chips: ['恰好 2 人', '传球与救援', '共同进度'],
    loop: ['结成搭子', '互相补给', '濒死救援', '共同结算'],
    note: '协作规则与真实 WebSocket 测试通过，真人协作手感待验证。' },
  { id: 'agents', label: '模型对战', number: '04', headline: '同样的规则，不同的判断。',
    description: '模型选择落点和道具策略，本地控制器执行移动。决策流、调用耗时和战绩让行为变得可观察。',
    chips: ['6 个配置席位', '人格与视觉', '赛后提示词记忆'],
    loop: ['配置模型', '观察局面', '执行策略', '赛后复盘'],
    note: '新增本机观察室已跑通 MiniMax、OpenAI 与规则 CPU 对照，可回放决策、按键和落地；胜率仍待多局验证。' }
];

export const agentSteps = [
  { name: '观察', role: '游戏 → 观察器', title: '先把局面变成可理解的信息。',
    body: '保留生命、背包、可达平台和附近对手。需要时也能附上画面，让模型决定什么值得关注。',
    label: '局面输入', example: '生命 1 / 3 · 持有红心\n可达落点：平台 A、平台 B\n附近有一位对手' },
  { name: '决策', role: '模型 → 策略', title: '模型选择目标，而不是每帧按键。',
    body: '选择去哪个平台、使用还是投掷道具；短计划和人格可以影响策略。这一步通过外部模型 API 完成。',
    label: '策略输出', example: '目标：平台 B\n道具：使用红心\n计划：先补血，再保持安全高度' },
  { name: '执行', role: '策略 → 本地控制器', title: '把一个决定，变成连续动作。',
    body: '控制器对齐落点、移动和下落。模型还没回答，或目标平台已失效时，也能处理紧急危险。',
    label: '动作输入', example: '向右移动 → 对齐落点 → 穿台\n根据最新状态继续修正\n服务端仍负责判定结果' },
  { name: '反馈', role: '游戏 → 事件与记录', title: '决定有没有用，看游戏的真实结果。',
    body: '生命变化、落点、淘汰原因与成绩进入事件流。延迟、调用量和 Token 帮助理解策略与成本。',
    label: '可观察结果', example: '成功落在目标平台\n生命恢复 · 深度继续增加\n记录行动结果与请求耗时' },
  { name: '复盘', role: '结果 → 下一局记忆', title: '把这一局的经验，带到下一局。',
    body: '总结存入本机，并加入下一局提示词。它是记忆机制；是否提高表现，需要与无记忆方案对照。',
    label: '下局提示词', example: '经验：低生命时优先补给\n保留短计划与历史总结\n相同初始条件下重新比较' }
];
