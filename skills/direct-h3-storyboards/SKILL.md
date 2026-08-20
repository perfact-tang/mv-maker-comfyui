---
name: direct-h3-storyboards
description: 将歌词、LRC、小说、故事、文章、解说文案和产品文案导演化为统一视觉风格的角色参考设定板、叙事分段、H3 分镜及可导入 MV Maker ComfyUI 的项目 JSON。用于人物展示图、角色三视图/表情特写设定图、Z-Image-Turbo 或 Krea2 Turbo 角色参考图、短剧分镜、MV 脚本、H3 视频计划和 MV Maker 项目；强制保持跨角色画风一致，并默认输出中文提示词。
---

# Direct H3 Storyboards

把源文本转换为可执行的导演方案与 `mv-maker-project` v4 JSON。先同时锁定统一视觉系统、角色参考板和千问 3 TTS 音色，再规划逐镜头配音与 Music 3 纯器乐配乐，最后写由混合 Drive Audio 驱动的 H3 分镜；不得让各角色自行选择画风或音色。

## 工作模式

- 默认使用 **one-pass**：一次完成导演判断、角色板提示词、分镜和验证。
- 用户要求预览、审核或先看方向时，使用 **review-first**：第一轮仅提供形式、统一画风母版、时长、角色名单和剧情主线；确认后再输出 JSON。
- 仅对无法安全推断的硬约束提问：必需画幅、已有主音频区间，或模型限制与需求冲突。

## 必读参考

1. 分析和拆分源文前，完整阅读 `references/directing-playbook.md`。
2. 设计人物前，完整阅读 `references/character-reference-sheets.md`。
3. 构建输出前，完整阅读 `references/project-schema.md`。
4. 选择 H3 模式和写视频提示词前，完整阅读 `references/h3-routing.md`。
5. 仅当形式或模式仍有歧义时阅读 `references/examples.md`。

## 强制语言规则

- `description`、`basics`、故事板叙事、首尾帧提示词、图像提示词、末帧提示词、视频提示词正文、声音设计、音乐说明、参考图用途和参考图说明一律使用中文。
- 人名、原文对白、歌词和画面文字保持原语言。
- JSON 字段名、H3 固定协议字段名、`[Shot N]`、`<Picture N>`、`<Subject N>`、`(S1)`、模型名和工作流名保持协议规定的英文；这些不是提示词正文。
- 禁止先用英文写完整提示词再附中文翻译。交付文件中的可读提示内容必须直接是中文。

## 工作流

### 1. 建立制作约束

确定源类型、内容形式、语言、交付物、成片画幅、视频模型、图片工作流、可用片长和音频归属。未指定时使用 MiniMax H3、16:9、片长 `[5, 10, 15]`，图片工作流优先 `Z-Image-Turbo`。`music_video` 保留已有主音乐并禁用新的配音/配乐流程；`promo` 和 `short_drama` 默认使用千问 3 TTS 逐镜头配音，MiniMax Music 3 只按情绪章节生成纯器乐配乐，再把两者混合为 `drive-audio` 驱动 H3。不得让 H3 重新创作对白、音效或配乐。

只要项目包含逐镜头 `generation_plan`，就把 `generation_settings.h3.generation_mode` 固定写为 `director-routed`；不得写入程序不支持的其他值。旧项目没有逐镜头计划时才使用 `first-frame` 或 `reference-images`。

角色参考设定板固定使用横向 16:9 构图，即使最终成片为竖屏；竖屏成片不得迫使角色板使用竖向拼贴。

### 2. 先锁定全项目视觉母版

在设计任何角色前建立一个唯一 `visual_style_lock`，锁定：风格编号与中文风格名称；渲染媒介、造型比例、五官概括方式和材质语言；固定色彩体系、主辅光方向、阴影软硬、镜头与背景规则；角色设定板布局、渲染精度和统一负面约束；Z-Image-Turbo 与 Krea2 Turbo 的模型适配规则。

把同一段 `shared_style_prefix` 和 `shared_negative_prompt` 原样放入每个角色的生成提示词。所有角色只能改变身份特征、体型、面孔、发型、服装和道具，不能改变画风、材质、灯光、背景或版式。若任一角色看起来来自另一部作品，停止并重写角色提示词。

### 3. 制作真正的角色参考设定板

只定义需要跨镜头保持身份的角色。每个 `characters[].description` 必须是可直接提交给当前人物页的中文生成提示词，而不是人物小传；必须生成同一角色的一张生产级多视图参考板。

每张角色板强制包含：

1. 全身正面标准站姿；
2. 全身左侧面或右侧面；
3. 全身背面；
4. 3/4 全身主视图；
5. 至少四个面部特写：中性、微笑、愤怒或紧张、惊讶或悲伤；
6. 眼睛、发型/头饰、服装材质和标志性道具细节；
7. 简洁中文标注区和色板；
8. 干净浅灰或暖灰棚拍背景、均匀中性光、无遮挡、无环境剧情。

同一张板内所有视图必须是同一人：脸型、五官间距、发际线、年龄、体型、服装结构、配色和道具完全一致。不得生成多个人、替代服装、剧情场景、海报、群像或相互遮挡的拼贴。

每个会说话或可能说话的角色同时建立唯一 `voice_profile`：`voice_id`、稳定 `(Sx)`、预览文本、TTS 输出 `language` 和固定随机种子。人物展示的固定音色创建方式由下拉框决定：`voice-design` 使用中文 `instruct`；`voice-clone` 使用 `creation_reference_audio` 和独立 ASR `reference_language`。创建参考声音可来自本地文件上传或网页麦克风录音，分别记录 `capture_method: "file-upload"` 或 `"browser-recording"`。无论哪种方法，创建输出都保存为最终 `preview_audio` 与 `reference_audio`。声音制作只绑定人物，点击“生成配音”后才克隆最终固定音色。

参考音频安全规则：`ref_audio_max_seconds = max(60, ceil(reference_audio.duration_seconds) + 1, 已有配置值)`。严禁写入小于或等于参考音频实长的值；ASR 输入语言不得与 TTS 输出语言混为一个字段。参考音频用于识别原说话内容和克隆音色，`audio_plan.tts_language` / 全局 `tts_language` 只控制新配音的输出语言。

按 `references/character-reference-sheets.md` 同时写入通用 `description`、`reference_sheet.z_image_prompt` 和 `reference_sheet.krea_prompt`。`description` 必须与 `generation_settings.image_workflow` 对应并可直接生成。

### 4. 分析原文与建立制作锚点

将作品分类为 `music_video`、`short_drama` 或 `promo`。先建立编号化源文覆盖单元，保留每个歌词行、因果事件、关系变化、必要对白、事实主张和例证；长文本分批处理后合并连续时间线。

在角色板风格锁定后，建立环境锚点与空间方位。环境卡不得包含人物。再把源文单元分组为宏观 `storyboard` 段落和可执行 `mvinfo` 镜头。每个镜头只保留一个视觉主角、一个主要动作、明确的连续性承接、源文覆盖、精确时间和生成计划。

### 5. 先规划千问配音与 Music 3 配乐

`promo` 使用 `spoken-word`，以项目级单一旁白音色逐镜头生成自然清晰配音；`short_drama` 使用 `musical-drama`，但“musical”只描述戏剧组织，不要求唱歌，每个角色必须引用人物页锁定的 `voice_id`。同一镜头原则上只放一个主要说话人；多人连续对话拆成可独立配音的镜头。每个有对白镜头的首位说话人必须唯一解析到人物或旁白；声音制作把人物图片和已创建的固定音色作为同一选择项。选择人物或旁白时只更新绑定并清除旧人声与 Drive Audio，不触发生成；用户点击该镜头“生成配音”后，才以绑定的固定音色运行 Voice Clone + ASR。

Music 3 只规划配乐章节：每章写纯器乐 `caption`、固定 `[Instrumental]\n(No vocals)`、`shot_refs` 和建议总时长；明确无人声、无演唱、无吟唱。连续地点和情绪尽量同章，明显转折时换章，单章不超过 300 秒。每镜头写稳定 `shot_id` 与 `audio_plan`，包括章节、章内起点、5/10/15 秒、准确 TTS 文本、说话人、`voice_id` 和 `tentative` 状态。必须让文本能在镜头时长内自然读完；过长就拆镜或增加到 10/15 秒，不能依赖后期截断或极端加速。

### 6. 为每个 H3 镜头选路由

- `I2VA`：首帧发展、对白表演、有机动作或前镜尾帧续接。
- `FL2VA`：精确落到目标构图、变化结果、匹配剪辑或转场终点。
- `Ref2VA`：人物身份、服装、场景或风格参考比精确关键帧更重要；按实际需要声明一至两个参考槽。只有一项有效参考时只输出 `<Picture 1>`，不得复制、虚构或硬凑 `<Picture 2>`。

5、10、15 秒分别对应 141、260、379 帧。使用能清楚表达动作的最短时长，结尾补到 5 秒边界，不得截断源文。

人物出现的镜头必须引用已锁定角色板，不得重新描述一种新画风。多人镜头优先用角色板作为 Ref2VA 身份参考；第二参考槽仅在确有第二人物、产品、场景或风格参考时声明。若两个参考槽仍不足，拆镜头而不是牺牲人物一致性。

### 7. 写中文模型提示词

图像与 H3 提示词正文全部使用中文，并保持 `references/h3-routing.md` 规定的字段顺序。H3 固定字段名可保留英文，字段值使用中文。对白只放在 `<d>[Chinese] ...</d>` 等协议块内。完成结构后不得追加游离风格段落。

`source_text` 使用准确原文，千问 3 TTS 的 `audio_text` 保留准确对白或旁白；Music 3 不得接收对白。每镜头 `tts_language` 是配音输出语言，可覆盖全局输出语言；角色 `reference_language` 仅用于参考音频 ASR。生成后必须记录 `actual_voice_duration_seconds`，若自然可接受的语速仍不能完整落入 5/10/15 秒目标时长，则明确失败并拆镜或增时，不得截断人声。每个非 MV 镜头的 `generation_plan.audio_mode` 固定为 `drive-audio`；H3 正文说明画面、口型和动作跟随 `<Audio 1>` 中已经混合好的配音与配乐，`overall_soundscape` 只说明复用主音频，`non_diegetic_music` 固定写 `N/A`。

### 8. 验证与交付

从 `assets/storyboard-template.json` 开始，替换所有占位符，写出完整 `mv-maker-project` v4 JSON。运行：

```text
node scripts/validate_storyboard.mjs <project.json>
```

修复全部错误。另做一次角色板人工自检：统一风格前缀是否逐字一致、多视图是否齐全、是否明确同一人、是否含中文、所选图片工作流与 `description` 是否匹配。

如果用户提供、引用或要求续写的是旧项目，旧文件只能作为内容来源，不能作为输出格式模板：必须补齐项目级千问 `narrator_voice`、人物 `voice_profile`、Music 3 纯器乐章节、每镜头唯一 `shot_id`、`audio_plan.voice_id`，并把非 MV 镜头及全局 H3 设置从 `native-audio` 改为 `drive-audio`。严格验证未输出 `VALID` 时禁止交付 JSON。

聊天中只报告形式/统一画风、总时长、段落数、镜头数、H3 模式分布、图片工作流和输出路径；除非用户明确要求，不粘贴大型 JSON。

## 非 H3 视频模型

H3 是唯一完整实现的视频适配器。若指定其他视频模型，保留导演方案和 schema，设置对应模型标识，并读取用户提供的明确适配器；不得假装 H3 任务类型可直接移植。Z-Image-Turbo 和 Krea2 Turbo 仅属于角色板/首帧图片工作流，不改变 H3 视频路由。
