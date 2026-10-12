export const sections=[['overview','研究总览','先理解工作台'],['works','看实际效果','初稿、成片与混音'],['capabilities','能力地图','能做什么、如何打开'],['workflow','创作流程','把能力组合起来'],['models','模型接入','配置与输入输出'],['comparison','与 Vids 对照','实测经验与差异'],['limits','问题与边界','限制、排错与下一步'],['sources','资料与验证','原文、证据与下载']];
export const statusLabels={tested:'已实测',adapter:'接口已预留',missing:'尚未实现'};
export const capabilities=[
 {id:'story',name:'故事与分镜',status:'tested',panel:'story',scene:1,effect:13.2,summary:'从主题组织可编辑的场景，给每个镜头安排目的、动作和节奏。',input:'主题、受众、用途、语言、目标时长；已有材料需要写入创作说明。',output:'标题、要点、口播、图片提示词；故事梗概、风格、连续性备注和逐镜头设定随项目保存。',steps:['新建视频，写清主题、受众与长度，生成 AI 初稿。','在「故事」调整梗概、风格、当前镜头目的与动作；分镜总览可编辑地点、情绪和连续性。','在时间轴检查顺序与时长，再为各场景准备素材。'],limit:'故事字段可以保存和传递给后续适配器；平台不会自动判断剧情是否合理，也不会在修改梗概后自动重写全片。',evidence:'studio-outline',related:['characters','images','voice']},
 {id:'characters',name:'角色与一致性',status:'tested',panel:'characters',scene:3,effect:33.3,summary:'统一人物设定、参考图与音色，并指定每个镜头的讲述者。',input:'姓名、外观服装、性格描述、项目内参考图片、可选音色 ID。',output:'可复用的角色记录；配音使用所选角色音色，生成请求携带出场角色和参考素材。',steps:['在「角色」添加人物，填写描述并选参考图。','勾选在当前镜头出场，再在「口播」选择讲述者。','修改角色音色后重新生成对应配音；多人对话拆成多个镜头。'],limit:'最多12位角色，每个场景一位说话者。保存设定不等于生成人物，更不能保证跨镜头身份、服装、动作或表情一致；效果取决于接入模型。',evidence:'studio-adapters',related:['story','voice','lipsync']},
 {id:'images',name:'图片与素材',status:'tested',panel:'assets',scene:2,effect:23.4,summary:'导入素材或用独立图片服务生成画面，再进入中央画布。',input:'PNG/JPG/WebP、MP4/WebM、MP3/WAV/M4A；生成图片时需要提示词和图片接口。',output:'项目素材库、可编辑画布对象、可用于角色和镜头的参考图片。',steps:['内置 Codex 图片工具先在对话生成，再用「素材」导入。','选中场景图片后点击素材可替换主图；也可添加其他图片对象。','导入视频可以替换场景画面，音乐请从「音乐」入口加入音乐轨。'],limit:'聊天内置图片工具没有直接暴露给网页的调用接口。素材库音频点击后替换旁白；音乐入口不会替换旁白。导入视频原声静音。',evidence:'image-provenance',related:['canvas','video','music']},
 {id:'canvas',name:'画布与图层',status:'tested',panel:'layers',scene:0,effect:1,summary:'中间直接编辑文字、图片与形状，排版会进入最终视频。',input:'场景内容、画布元素、背景色与样式。',output:'位置、尺寸、字号、颜色、透明度、对齐、层级、显示和锁定状态。',steps:['点击中央对象，再拖动移动或拖右下角缩放。','右侧调整属性；窄屏点击画布右上角属性按钮。','从文字／图层入口添加内容、调整顺序，使用撤销与重做回退。'],limit:'1920×1080 固定画布，每场景最多60个对象、一个视频画面。没有旋转、复杂关键帧、遮罩或多视频叠加；视频对象为矩形裁切。',evidence:'editor-verification',related:['timeline','export','images']},
 {id:'timeline',name:'时间轴与场景剪辑',status:'tested',panel:'scenes',scene:4,effect:43.6,summary:'把场景、口播和音乐放在同一条全片时间线上检查。',input:'场景顺序、片段时长、视频入点、旁白入点与延迟。',output:'可播放、定位、拖动排序、改时长、分割和复制的场景序列。',steps:['拖动场景缩略图改变顺序，拖右边缘调整时长。','播放头位于镜头内部时可以分割；前后各保留至少1秒。','旁白波形来自实际 PCM，音乐按全片时间播放。'],limit:'最多24场景，每场景1–120秒。缩短镜头可能截断旁白；视频用完后停在最后一帧。当前是场景剪辑，不是完整多轨剪辑器。',evidence:'editor-verification',related:['canvas','voice','music']},
 {id:'voice',name:'中文口播与配音',status:'tested',panel:'voice',scene:3,effect:33.3,audio:'chinese-voice',summary:'使用独立语音服务生成中文声音，按场景反复修改。',input:'当前镜头口播、音色、配音服务地址与模型配置。',output:'真实音频、时长和波形；字幕文字与旁白来源文本关联。',steps:['在「口播」修改文本，选择讲述者或默认音色。','点击生成当前口播，试听后调整音量、入点与延迟。','需要时按旁白长度调整镜头，再检查字幕和播放节奏。'],limit:'台词或音色变化后需要重新配音。无有效音频时不能作为有声场景导出，可明确选择静音。字幕目前是整段文字块，没有逐词时间对齐。',evidence:'studio-verification',related:['characters','music','export']},
 {id:'music',name:'音乐与混音',status:'tested',panel:'music',scene:0,effect:0,audio:'original-music',summary:'多条背景音乐与旁白组合，预览与导出都能听到。',input:'导入音频、全片开始时间、素材入点、时长、音量和循环设置。',output:'最多8条音乐，可叠加、循环、淡入淡出；总输出、旁白和音乐分别控制。',steps:['从「音乐」导入背景音乐，或者选素材后加入音乐轨。','调节每轨音量、起止时间、循环与淡入淡出。','设置「口播期间音乐保留」，试听后导出完整混音。'],limit:'45% 表示口播时保留音乐原音量的45%，不是减少45%。按口播音频区间避让，提前0.2秒压低、结束后0.4秒恢复；尚无逐词语音活动检测。本次演示音乐为程序合成。',evidence:'music-verification',related:['voice','music-model','export']},
 {id:'music-model',name:'AI 音乐生成',status:'adapter',role:'music',panel:'music',summary:'保存音乐创作请求，将独立音乐模型的结果送回音乐轨。',input:'音乐描述、全片时长；适配器接收 kind: music、instrumental: true、outputFormat: mp3。',output:'生成结果先进入音频素材库，审核后加入音乐轨；也可关联手工导入结果。',steps:['在音乐侧栏填写描述，准备任务。','配置实现 Studio 协议的音乐适配器，明确提交后才调用模型。','试听结果后应用，再用混音控制完成制作。'],limit:'目前未接真实音乐模型。已测本地 HTTP 合同，不代表任何厂商服务都能直接使用；已有配乐不能标成 AI 音乐生成效果。',evidence:'music-request',related:['music','video','export']},
 {id:'video',name:'动态视频生成',status:'adapter',role:'video',panel:'motion',summary:'为动态镜头预留模型入口和审核流程。',input:'故事、镜头描述、时长、参考图与出场角色；由适配器映射到视频模型。',output:'MP4 结果入库，审核后替换当前镜头画面，继续叠加文字和旁白。',steps:['在故事里规划动态镜头，或直接从「视频」准备任务。','配置视频适配器，提交后查看排队、生成与失败状态。','预览生成结果，或关联外部视频，再点击应用到镜头。'],limit:'没有实跑新的 AI 动态视频。本片末镜头是对已有插画进行程序化缩放。返回视频原声仍静音；动作、镜头连续性与画面质量依赖模型。',evidence:'production-verification',related:['story','characters','lipsync']},
 {id:'lipsync',name:'人物口型与数字人',status:'adapter',role:'lipsync',panel:'motion',summary:'把人物参考素材和中文口播组合为口型模型输入。',input:'人物图或视频、已生成的有效配音、台词、场景时长。',output:'预期得到与口播对齐的视频；当前可保存请求、下载说明、关联外部结果。',steps:['准备角色参考图或人物视频，完成当前镜头配音。','准备口型任务，确认没有缺失素材或过期台词。','接入模型后生成、审核并应用；未接入时可导入外部口型视频。'],limit:'目前没有真实口型模型，不能展示我们生成的说话人效果。音频提交时按入点、延迟、音量对齐，适配器不要重复加延迟。表情、身份与口型准确度仍需模型实测。',evidence:'lipsync-request',related:['characters','voice','video']},
 {id:'export',name:'保存、版本与导出',status:'tested',panel:'scenes',scene:5,effect:55.7,summary:'保留可继续编辑的项目，也交付真正可播放的 MP4。',input:'已准备的素材、有效口播、画布与时间轴、全片混音设置。',output:'本机项目 JSON、独立副本、多个导出版本；1080p 30fps H.264/AAC。',steps:['先保存；需要保留当前作品时创建项目副本。','导出 MP4，完成后在版本窗口播放和下载。','保留项目目录才能继续编辑；MP4 本身不包含编辑结构。'],limit:'没有云端协作、公开分享或多分辨率选择。撤销历史属于当前浏览器会话；历史导出保留文件，不能自动恢复为任意编辑时间点。',evidence:'music-verification',related:['canvas','voice','music']},
 {id:'advanced',name:'尚未覆盖的制作能力',status:'missing',summary:'明确后续范围，避免把入口误认为完成了全部制作能力。',input:'下一步需要独立设计与验证的需求。',output:'目前未提供复杂多轨视频、关键帧、逐词字幕、录屏、实时协作、完整数字人控制。',steps:['先用现有场景、文字、图片、旁白与音乐完成介绍类视频。','人物动作、真实动态画面与口型任务先保留描述和输入。','未来按效果、时长、质量和成本逐项验证模型及编辑能力。'],limit:'组合能力能够完成已有创作流程，但不能推导出所有类型的视频均已实现；剧情规划不等于自动生成完整剧情片。',evidence:'studio-readme',related:['story','video','lipsync']}
];
export const works=[
 {id:'music',asset:'studio-music',title:'中文口播＋背景音乐成片',duration:67.354,group:'映序实跑',example:'music',poster:'studio-poster',description:'当前完整链路：六个场景、中文 MiniMax 配音、已有插画与程序化镜头、原创背景音乐、口播避让和 MP4 导出。',ai:'文案来自 Codex，六张插画来自对话内 Imagegen，中文口播来自 MiniMax。',human:'修改内容和排版、调整场景节奏、导入素材并设置混音。音乐由程序合成，不是 AI 音乐模型输出。',proof:'music-verification'},
 {id:'editor',asset:'studio-editor',title:'同一画面 · 混音前',duration:67.354,group:'映序实跑',example:'control-plane',poster:'studio-poster',description:'保留画布、时间轴和口播的版本。与混音版按相同时间切换，可以比较背景音乐的加入。',ai:'复用先前真实生成的图片和 MiniMax 配音。',human:'调整标题、位置、字体、镜头时长；末镜头导入程序化缩放视频。',proof:'editor-verification'},
 {id:'draft',asset:'studio-draft',title:'Codex 初稿成片',duration:62.021,group:'映序实跑',example:'demo',poster:'studio-poster',description:'把首次文案、图片与配音组织成视频，保留修改前的表达和节奏。',ai:'Codex 结构化分镜，Imagegen 插画，MiniMax 中文配音。',human:'提供目标，导入图片，并调用本地合成流程；不是完全无人干预的生成。',proof:'studio-verification'},
 {id:'final',asset:'studio-final',title:'人工修改后的第一版',duration:65.321,group:'映序实跑',example:'demo',poster:'studio-poster',description:'修正开场与功能表述，重新生成两段口播，复用未修改素材。',ai:'场景5、6按修改后的文本重新调用 MiniMax；其他音频继续复用。',human:'修订标题、要点和不自然的分辨率口播，审核版式后导出。',proof:'studio-verification'},
 {id:'google-final',asset:'google-final',title:'Google Vids 人工编辑版',duration:69.033,group:'Google Vids 实测',poster:'google-sheet',description:'在 Vids 原生编辑器内由14场景删减为7场景，中文画面＋英文 Nyla AI 配音，并从 Vids 导出。',ai:'AI 大纲、中文标题、英文脚本和 Nyla 配音；推荐的素材和音乐来自素材库。',human:'删重复场景、改六处标题、清理残留配音和空白结尾。本次没有生成 Veo 或 AI 人物。',proof:'google-process'},
 {id:'google-draft',asset:'google-draft',title:'Google Vids AI 初稿',duration:117.957,group:'Google Vids 实测',poster:'google-sheet',description:'目标约75秒、6场景，实际生成117.957秒、14场景，展示 AI 初稿为何仍需编辑。',ai:'完成场景组织、英文配音和素材推荐；片段标注 Getty Images，音乐标注 Shutterstock。',human:'提供目标和提示词，选择模板，再触发生成。生成后的长度与内容需要核对。',proof:'google-process'}
];
export const googleChapters=[
 {start:0,title:'开场与主题',note:'保留 AI 开场标题、英文旁白和素材建议。'},
 {start:9.96,title:'可编辑初稿',note:'把“从想法到成品”改成“从想法到可编辑初稿”，准确表达 AI 的作用。'},
 {start:18.24,title:'明确目标与材料',note:'人工补全受众、用途、材料三个维度。'},
 {start:27.08,title:'AI 先出初稿',note:'大纲、脚本、配音由 AI 生成；素材库推荐不等于 AI 新生成视频。'},
 {start:37.12,title:'核对与编辑',note:'删重、修改标题，并手动清理六段残留配音。'},
 {start:47.89,title:'英文配音与导出',note:'Nyla 为实际 AI 英文语音；本片没有 AI 人物。'},
 {start:58.97,title:'AI 起草，你来把关',note:'保留 AI 英文结尾，删除后面的空白场景。'}
];
export const workflow=[
 {title:'定义目标，生成初稿',body:'先写受众、用途、语言、目标长度与材料。AI 输出可以编辑的分镜，人工检查事实、顺序和时长。',cap:'story',action:'new',label:'打开创作说明'},
 {title:'规划镜头与人物',body:'给镜头写目的、动作、景别；角色设定可以复用。说明性短片可先用图文，人物口型需要额外模型。',cap:'characters',panel:'story',label:'打开故事与分镜'},
 {title:'准备画面',body:'在对话生成图片后导入，或配置图片 API。已有视频也可导入；动态视频模型未接入时先准备描述与参考素材。',cap:'images',panel:'assets',label:'打开素材库'},
 {title:'生成并审核口播',body:'按镜头生成中文配音，试听发音与节奏。更改台词、人物音色后重新生成，避免文字和音频脱节。',cap:'voice',panel:'voice',label:'打开口播'},
 {title:'加入音乐与混音',body:'把音乐放到全片时间轴，设置起点、循环、淡入淡出及避让。旁白清楚是调音的首要检查项。',cap:'music',panel:'music',label:'打开音乐与混音'},
 {title:'在画布和时间轴精修',body:'调整构图、文字和镜头顺序，检查文字可读性、音画时长及视频结束的停帧。必要时分割或单段重做。',cap:'timeline',panel:'scenes',label:'回到时间轴'},
 {title:'保存、导出、回看',body:'保存项目和副本；导出 MP4 后播放与下载。保留原素材及项目 JSON，才能继续编辑。',cap:'export',action:'versions',label:'查看当前项目版本'}
];
export const modelRows=[
 {role:'text',name:'文案',tested:'已真实调用 Codex',protocol:'本机 Codex app-server；OpenAI 兼容 Chat',result:'结构化标题、要点、中文口播与图片提示词',boundary:'登录由本机 CLI 管理。其他兼容服务只做了本地合同测试。',cap:'story'},
 {role:'image',name:'图片',tested:'Imagegen 生成后导入已实跑',protocol:'导入；OpenAI 兼容 Images；MiniMax 图片',result:'场景画面或参考图片',boundary:'内置对话图片工具不直接连接网页；配置图片 API 后才可在网页自动请求。',cap:'images'},
 {role:'voice',name:'口播',tested:'已真实调用 MiniMax 中文配音',protocol:'MiniMax 配音；OpenAI 兼容 Speech',result:'MP3 与实际音频时长',boundary:'speech-2.8-hd 是这次样片的实际模型；配置更换不会追溯改写已有素材。',cap:'voice'},
 {role:'music',name:'音乐',tested:'未实测真实音乐模型',protocol:'Studio 异步适配器 v1',result:'audio_base64（MP3）',boundary:'当前可导入／混音，生成接口合同已经测试。样片配乐为程序合成。',cap:'music-model'},
 {role:'video',name:'动态视频',tested:'未实测真实视频模型',protocol:'Studio 异步适配器 v1',result:'video_base64（MP4）',boundary:'视频导入、审核和应用已可用；生成画面的质量、动作和一致性待验证。',cap:'video'},
 {role:'lipsync',name:'口型',tested:'未实测真实口型模型',protocol:'Studio 异步适配器 v1',result:'按当前旁白对齐的 MP4',boundary:'提交前检查人物参考和配音；返回片段不能短于请求时长（容差0.15秒）。',cap:'lipsync'}
];
export const comparisons=[
 ['定位','闭源云端场景视频工作台；本次实际完成初稿、编辑与导出。','原创本机工作台，借鉴场景组织和中央编辑器；没有复制 Google 源码。'],
 ['AI 初稿','本次目标75秒／6场景，实际约118秒／14场景，需删重。','Codex 生成结构化分镜，图片与声音分别准备；初稿62秒，编辑后65秒。'],
 ['模型选择','本次使用 Vids 内置流程和 Nyla 配音；没有验证第三方模型直连。','文案、图片、口播分别配置；音乐、视频和口型预留独立适配器。'],
 ['中文创作','本次采用中文画面＋英文 AI 配音。','已真实生成中文画面＋MiniMax 中文配音。'],
 ['画面来源','本次片段标注 Getty Images，音乐来自 Shutterstock；并非都由 AI 新生成。','六张 Imagegen 插画；末镜头为插画的程序化缩放。没有新的 AI 动态视频。'],
 ['人物与口型','官方展示了 AI 人物能力；项目007这次没有实跑。','已有角色规划与口型请求流程，缺少真实口型模型，尚不能展示生成效果。'],
 ['编辑与音频','本次实测场景删除、标题修改、音轨清理和完整预览。','画布对象、图层、场景时间轴、单旁白与最多8条音乐；含循环、淡入淡出和避让。'],
 ['协作与素材生态','云端文档及官方素材生态；实际作品仍为私有。','本机文件与导入素材；尚无在线素材库、云端协作、评论和权限分享。'],
 ['输出与可控性','已导出两份真实1080p MP4，保留 Vids 源文档。','本机1080p MP4、项目 JSON、原始素材、来源和校验记录均保留。']
];
export const faqs=[
 {q:'我们是不是已经实现了所有能力？',a:'已跑通图文／导入视频＋中文口播＋音乐混音＋编辑导出的完整链路。角色规划已可用；AI 音乐、动态视频、口型还需要接入模型。复杂多轨视频、关键帧、录屏、协作和逐词字幕仍未实现。',cap:'advanced'},
 {q:'这里本质上是什么？价值在哪里？',a:'把文案、视觉、声音、编辑和导出放在同一个项目里。它保存模型产物及人工修改，让每一段可以独立重做并继续组合；价值是减少反复搬运文件，同时保留内容审核和可编辑性。',cap:'story'},
 {q:'故事、角色、视频和口型是什么关系？',a:'故事规划要讲什么；角色保存人物设定与音色；视频模型生成运动画面；口型模型用人物素材与音频生成说话片段。平台负责把输入和产物关联起来，模型决定生成质量。',cap:'lipsync'},
 {q:'能换成自己的模型吗？填一个地址就行吗？',a:'支持列出的协议。兼容 Chat／Images／Speech 的服务可独立配置；协议不同需要适配。音乐、视频、口型使用自定义 Studio 异步协议，原厂地址通常不能直接填入。配置成功也不等于真实效果已经验证。',cap:'video'},
 {q:'为什么图片还要从对话导入？',a:'本机网页没有聊天内置图片工具的直接调用接口。当前示例先在 Codex 对话生成，再导入；接入网页支持的图片 API 后才能由网页自动生成。',cap:'images'},
 {q:'改完台词为什么不能直接导出？',a:'旧音频仍然说着旧台词。工作台检查文本与音频来源，要求重新生成配音，或明确将该镜头静音。修改角色音色同样会让配音失效。',cap:'voice'},
 {q:'为什么导入视频没有原声？',a:'现阶段场景视频原声统一静音，保留独立旁白和音乐，避免重复声音。需要使用视频里的环境音时，应先提取成独立音频再导入音乐轨；网页尚无一键提取功能。',cap:'music'},
 {q:'音乐45%到底是什么意思？',a:'「口播期间音乐保留」为45%，表示在原轨道音量和总音量基础上，再乘以0.45。100%表示不压低；0%表示口播区间音乐降为静音，仍保留渐变恢复。',cap:'music'},
 {q:'为什么预览和成片的声音有细微不同？',a:'预览通过浏览器混音，导出使用 FFmpeg、AAC 编码和峰值限制器。两者共用时间与音量规则，但不是逐样本一致；多轨高音量时更容易听出限制器差别。',cap:'music'},
 {q:'任务过期、失败或中断后怎么办？',a:'镜头、角色或音乐说明改变时，重新准备任务。网络失败或服务重启后先核对外部任务，避免重复提交；可以把已生成结果导入并关联，再审核应用。',cap:'video'},
 {q:'保存、撤销、版本和副本有什么区别？',a:'保存写入当前项目；撤销只回退当前浏览器会话的编辑历史；版本保留已导出的 MP4；副本是独立编辑项目。MP4 历史不等于任意时间点的项目恢复。',cap:'export'},
 {q:'文件和密钥放在哪里？能多人协作吗？',a:'项目保存在本机 .local/projects。模型配置及密钥只在服务进程内存，MiniMax 可从已配置的本机环境文件加载；浏览器不接收密钥。没有云端同步或实时协作。备份作品要保留完整项目目录。',cap:'export'},
 {q:'模型接口和作品有哪些限制？',a:'最多24场景、每场景1–120秒、60个画布对象、1个视频和1条旁白；最多12角色、8条音乐、100条生成任务。上传图片上限20MB、音视频150MB。适配器参考素材总和40MB，生成结果50MB。',cap:'advanced'},
 {q:'图片丢失、口播被截断或导出失败怎么办？',a:'先看当前场景素材与配音是否有效，再检查镜头时长、入点、音频延迟及实际文件。缺少可见图片会阻止导出；需要纯文字画面时可以删除图片对象。错误会在任务提示中显示。',cap:'export'}
];
export const sources=[
 {title:'当前工作台与全流程',summary:'完整说明、运行方式、研究全景图来源与能力边界。',ids:['studio-readme','studio-runtime','studio-mixing','research-poster-source']},
 {title:'实际成品与来源',summary:'AI 初稿、模型调用、插画来源和混音元数据。',ids:['studio-outline','studio-verification','image-provenance','music-verification','studio-project']},
 {title:'编辑与生成接口',summary:'画布、时间轴、剧情和异步任务的实现记录。早期文档反映当时版本，当前能力以能力地图为准。',ids:['studio-architecture','studio-control','editor-verification','studio-adapters','production-verification','music-request','lipsync-request']},
 {title:'Google Vids 实际研究',summary:'实际制作过程、两份导出元数据及素材许可。只在本机展示。',ids:['google-readme','google-process','google-metadata','google-license']},
 {title:'保留与可追溯性',summary:'旧源码、作品与升级前状态的哈希清单。',ids:['preserved-original','preserved-music']}
];
export const officialLinks=[
 ['Google Vids 官方产品','https://workspace.google.com/products/vids/'],
 ['Vids 时长与对象限制','https://support.google.com/docs/answer/16286470?hl=en'],
 ['Vids AI 配音说明','https://support.google.com/docs/answer/15070345?hl=en'],
 ['Vids AI 人物说明','https://support.google.com/docs/answer/16334946'],
 ['Vids 账号与额度说明','https://support.google.com/docs/answer/15609411?hl=en'],
 ['Codex App Server 文档','https://developers.openai.com/codex/app-server'],
 ['MiniMax 配音文档','https://platform.minimax.io/docs/api-reference/speech-t2a-http'],
 ['MiniMax 图片接口','https://platform.minimax.io/docs/api-reference/image-generation-t2i'],
 ['FFmpeg 官方文档','https://ffmpeg.org/documentation.html']
];
export const panelTopics={scenes:'timeline',story:'story',characters:'characters',assets:'images',text:'canvas',layers:'canvas',voice:'voice',music:'music',motion:'lipsync',ai:'models'};
export function searchResearch(query){
 const q=query.trim().toLowerCase();if(!q)return [];
 const items=[...capabilities.map(c=>({title:c.name,text:[c.summary,c.input,c.output,c.limit,...c.steps].join(' '),route:'capabilities/'+c.id})),...faqs.map((f,i)=>({title:f.q,text:f.a,route:'limits/'+i})),...modelRows.map(m=>({title:m.name+'模型接入',text:[m.tested,m.protocol,m.result,m.boundary].join(' '),route:'models/'+m.role})),...works.map(w=>({title:w.title,text:[w.description,w.ai,w.human].join(' '),route:'works/'+w.id}))];
 return items.filter(i=>(i.title+' '+i.text).toLowerCase().includes(q)).slice(0,30);
}
