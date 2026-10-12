# MV 分镜数据契约草案

工具让模型生成可编辑数据，再由模板执行器绘制。下文的 `0.1.0` 是最初设计草案，[示例 JSON](../examples/storyboard.example.json) 由人工编写，没有配套音频。实际本地工具采用简化的 `1.0.0`，可导入格式见文末和 [实际示例工程](../examples/local-demo-project.json)；两种格式不能互换。

## 结构与单位

| 字段 | 说明 |
| --- | --- |
| `schemaVersion`、`kind` | 协议版本；示例标明 `design-example`，真实工程另行记录来源 |
| `project` | 总时长秒数、随机种子、画风 ID、输出宽高和 fps |
| `audio` | 内部素材 ID、原曲选段起点、所选时长、BPM、首拍偏移和时间来源 |
| `characters` | 稳定角色 ID、模板与外观参数；镜头仅引用 ID |
| `lyrics` | 唯一 ID、起止秒数、文字和时间来源 |
| `shots` | 起止秒数、叙事目的、模板、歌词引用、演员、动作、相机和转场 |

所有镜头、歌词和动作时间都相对所选片段起点；只有 `audio.sourceStartSec` 使用原曲时间。镜头是半开区间 `[startSec, endSec)`，分界时刻归属后一个镜头。演员位置 `x`、`y` 为画布归一化坐标，角色 `scale` 为模板尺度倍率。动作进度用镜头内时间计算，不能累积上一帧状态。

`audio.durationSec` 是片段的媒体时长；`project.durationSec` 与其相同。节拍偏移相对片段起点，后续也可增加真实检测的节拍时间数组。纯文本估计时间使用 `estimated`，LRC/SRT 使用对应输入类型，人工调整使用 `manual`，不能丢失来源标记。

## 模板约束

实施时建立注册表，声明每个模板支持的演员数量、动作、道具、画风和性能预算。第一轮候选为 `stage_intro`、`garden_walk`、`prop_interaction`、`emotion_reaction`、`stage_dance`、`curtain_call`。这些是待实现模板名，不是上游现成 JSON 功能。

动作、表情、镜头和转场同样使用注册表。示例使用 `wave`、`walk`、`bounce`，`happy`、`curious`，`static`、`push_in`、`pan_right`，以及 `cut`、`brush_wipe`、`fade`；实现前需要映射到真实绘制和运动函数。

`purpose` 是分镜列表供人阅读的说明，不直接执行。任何字段都不接受 JavaScript、shell 命令、模板表达式、任意路径或远程 URL。歌词和说明作为文字绘制，服务端通过内部 ID 查找素材。

## 必要校验

1. 严格检查已声明字段、类型和枚举；数值必须有限，fps 与宽高应在输出白名单内。
2. 角色、歌词、镜头 ID 唯一；所有引用指向已有实体，动作与模板兼容。
3. `0 ≤ startSec < endSec ≤ durationSec`；镜头按时间排序，首镜头从 0 开始，相邻镜头无空白和重叠，末镜头覆盖总时长。
4. 歌词区间与镜头存在交集，所有需要显示的歌词均被覆盖。允许同一句歌词跨镜头，但必须按全局时间显示，不能切镜后重置高亮。
5. 相机、角色尺度与字幕安全区采用模板约束，防止重要动作被字幕遮挡或移出画面。
6. 转场时长不超过相邻镜头允许值，结束转场在总片段内完成；额外处理跨镜头重绘的邻接帧。
7. 画风、模板和角色版本可用；素材 ID 能解析，音频选段不越过实际文件时长。
8. 模型生成的数据要与不可变的媒体时长、角色配置和输出规格比对，不能让模型改写用户已选输入。

JSON Schema 可承担字段与枚举校验，引用、时间连续性和模板能力由语义校验器完成。结构正确不等于画面已可用；还需要抽取首帧、中间帧、末帧与转场前后帧检查实际表现。

原设计示例只做过数据一致性检查。当前工具另有 `1.0.0` Schema、时间与引用校验、六个场景模板，并通过短片视觉和媒体核验；不直接执行本节 `0.1.0` 示例。

## 版本与局部修改

每次调整分镜产生新工程版本，保存生成方式、模型标识、创作要求和校验结果。固定素材、模板、字体及随机种子用于重开工程。局部重写只替换指定镜头及必要的转场邻接范围，其他镜头 ID 和角色 ID 保持稳定。

服务端输出修复错误时应指出路径和原因，例如 `shots[2].endSec 超过音频片段时长`。失败草稿保留供编辑，不能悄悄改变媒体时长使无效输出看似通过。

## 本地实际协议 1.0.0

精确字段和枚举定义在 [shared/project.ts](../web/shared/project.ts)。实际工程扁平化为 `schemaVersion`、`title`、`durationSec`、`seed`、`styleId`、`resolution`、`fps`、`character`、`audio`、`lyrics`、`shots`、`planner`、`story`。

`character` 只有一个主角；`audio.duration` 是原音乐总时长，`audio.sourceStartSec` 是选段起点，`durationSec` 是 15～30 秒短片长度。歌词和镜头使用 `start`、`end` 秒数，均相对片段起点。BPM 与 `beatOffsetSec` 是手动参数。`shots` 直接使用 `action`、`emotion`、`camera`、`transition`，没有 `actors` 子数组；转场仅支持 `cut` 和固定 0.25 秒 `fade`。

`planner` 标为 `rules`、`model` 或 `manual`；修改镜头后变为 `manual`。歌词时间来源分别为 `lrc`、`srt`、`estimated` 或 `manual`。完整工程保存用户输入；模型只允许返回 `{story, shots}`，然后由服务端合成并校验工程。

实际示例工程引用本机上传的音频 UUID；未随 JSON 打包音乐。重建素材最简方式是在运行工具中载入内置示例。当前未实现局部模型重写、演员布局自由编辑或服务器项目版本接口。
