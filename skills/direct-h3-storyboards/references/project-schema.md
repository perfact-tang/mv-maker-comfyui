# MV Maker 导演 JSON 约定

输出完整 `mv-maker-project` 存档，`schema_version` 为 `4`。完整存档优先于旧版独立脚本，因为它能自动选择图片工作流、千问 3 TTS 配音、Music 3 配乐、H3 和画面方向。

## 导演计划与统一视觉锁

```json
{
  "director_plan": {
    "source_type": "lyrics | lrc | novel | story | blog | product_copy",
    "content_form": "music_video | short_drama | promo",
    "model": "minimax-h3",
    "aspect_ratio": "16:9",
    "total_duration_seconds": 15,
    "allowed_clip_durations_seconds": [5, 10, 15],
    "style_name": "中文风格名称",
    "style_rationale": "中文风格依据",
    "narrative_strategy": "中文叙事策略",
    "source_coverage_note": "所有源文单元均已映射。",
    "visual_style_lock": {
      "style_id": "项目内唯一稳定编号",
      "style_name": "中文统一画风名",
      "shared_style_prefix": "每个角色提示词逐字复用的中文风格前缀",
      "shared_negative_prompt": "每个角色提示词逐字复用的中文负面约束",
      "character_sheet_layout": "横向16:9统一多视图版式",
      "preferred_image_workflow": "Z-Image-Turbo"
    }
  }
}
```

## 千问 3 TTS 配音与 Music 3 配乐计划

非 MV 项目必须在 `director_plan.audio_plan` 中声明：

```json
{
  "mode": "qwen3-tts-audio-first",
  "workflow": "千问 3 TTS",
  "music_workflow": "MiniMax Music 3",
  "music_enabled": true,
  "production_style": "spoken-word",
  "alignment_status": "planned",
  "narrator_voice": {
    "voice_id": "VOICE-NARRATOR",
    "speaker_label": "(S1)",
    "instruct": "清晰自然、沉稳可信的中文旁白，吐字明确，语速适中，情绪克制，不要演唱。",
    "reference_text": "用于锁定旁白音色、语速和情绪的中文参考文本。",
    "language": "Auto",
    "seed": 729754692978412,
    "generation_mode": "voice-design",
    "reference_language": "auto",
    "prompt_filename": "mv-maker-VOICE-NARRATOR",
    "status": "idle"
  },
  "chapters": [
    {
      "chapter_id": "AUDIO-001",
      "title": "中文情绪章节名",
      "target_duration_seconds": 15,
      "caption": "中文纯器乐配乐设计，明确情绪、乐器、速度和动态，并要求无人声",
      "lyrics": "[Instrumental]\n(No vocals)",
      "shot_refs": ["SHOT-001", "SHOT-002"],
      "status": "idle"
    }
  ]
}
```

`promo` 使用 `spoken-word`；小说、故事和短剧使用 `musical-drama`。这些值描述叙事组织，实际对白仍由千问 3 TTS 自然朗读，不要求演唱。Music 3 章节只负责纯器乐配乐，单章时长必须在 1–300 秒。`music_video` 使用 `mode: disabled`、空 `chapters`，沿用已有主音乐。

`form_subtype` 可选。严格模式下其他导演字段必须存在。`visual_style_lock` 是新版技能的强制输出。

## 角色参考设定板

每位跨镜头角色使用以下结构。`description` 是人物页直接提交给 ComfyUI 的完整中文提示词，不是人物小传。

```json
{
  "shot_id": "SHOT-001",
  "name": "角色名",
  "role": "角色功能",
  "description": "与当前 image_workflow 对应、可直接生成统一多视图角色板的中文提示词",
  "traits": ["稳定身份锚点"],
  "reference_sheet": {
    "style_id": "与 director_plan.visual_style_lock.style_id 完全一致",
    "layout": "横向16:9；3/4主视图；正面、侧面、背面；四个表情特写；眼睛、发型、服装、道具细节；色板",
    "z_image_prompt": "Z-Image-Turbo 中文适配提示词",
    "krea_prompt": "Krea2 Turbo 中文适配提示词"
  },
  "voice_profile": {
    "voice_id": "VOICE-CHAR-001",
    "speaker_label": "(S2)",
    "instruct": "与人物视觉年龄、性别表达、身份和气质匹配的中文音色说明，包含音高、厚薄、语速、咬字、情绪和口音，不要演唱。",
    "reference_text": "用于锁定该角色音色和说话方式的中文参考文本。",
    "language": "Auto",
    "seed": 729754692978413,
    "generation_mode": "voice-design",
    "reference_language": "auto",
    "status": "idle"
  }
}
```

规则：

- 全部角色共享同一个 `style_id`、逐字相同的风格前缀、逐字相同的负面提示词、版式、背景和灯光。
- `generation_settings.image_workflow` 为 `Z-Image-Turbo` 时，`description` 与 `reference_sheet.z_image_prompt` 完全相同。
- 工作流为 `Krea2 Turbo` 时，`description` 与 `reference_sheet.krea_prompt` 完全相同。
- 每张板只展示一个角色的多个角度。全部视图的脸、年龄、体型、服装、配色和道具必须一致。
- 没有人物时 `characters` 使用空数组。
- 每个角色必须有唯一 `voice_profile`。`generation_mode: "voice-design"` 表示用文本定义创建；`generation_mode: "voice-clone"` 表示用上传参考声音创建，并且必须包含 `creation_reference_audio`。两种方式的生成结果统一写入 `preview_audio` 和最终 `reference_audio`；声音制作才克隆最终固定音色。
- `language` 是 TTS 输出语言；`reference_language` 是参考音频 ASR 输入语言，两者必须独立。逐镜头 `audio_plan.tts_language` 可以覆盖输出语言，但不能修改 ASR 输入语言。
- 人物展示创建固定音色后，应用自动补入：

```json
{
  "reference_audio": {
    "data_url": "data:audio/wav;base64,...",
    "filename": "角色参考音色.wav",
    "mime_type": "audio/wav",
    "duration_seconds": 18.42,
    "ref_audio_max_seconds": 60,
    "source": "generated-fixed-voice"
  }
}
```

使用上传参考声音创建时，生成前还要保存：

```json
{
  "generation_mode": "voice-clone",
  "reference_language": "Chinese",
  "creation_reference_audio": {
    "data_url": "data:audio/wav;base64,...",
    "filename": "上传的参考声音.wav",
    "mime_type": "audio/wav",
    "duration_seconds": 12.5,
    "ref_audio_max_seconds": 60,
    "source": "uploaded-reference",
    "capture_method": "file-upload"
  }
}
```

网页录音使用相同结构，仅将 `capture_method` 写为 `"browser-recording"`；录音结束后必须释放麦克风轨道，并按实际编码保存 MIME 和扩展名。

- `ref_audio_max_seconds` 必须使用 `max(60, ceil(duration_seconds) + 1, 已有配置值)`，并严格大于参考音频实长。不得用它限制生成配音的目标长度；生成配音实长记录在镜头 `actual_voice_duration_seconds`，目标时长仍由镜头 5/10/15 秒设置决定。

## 镜头字段

```json
{
  "timestamp": "00:00 - 00:05",
  "type": "New_Scene",
  "source_text": "准确的源文摘录",
  "lyrics": "准确歌词/对白或 (No dialogue)",
  "image_prompt": "中文首帧提示词",
  "last_frame_image_prompt": "中文目标末帧提示词，仅 FL2VA 使用",
  "video_prompt": "正文为中文的完整 H3 结构化提示词",
  "audio_plan": {
    "chapter_id": "AUDIO-001",
    "source_start_seconds": 0,
    "duration_seconds": 5,
    "actual_voice_duration_seconds": 4.3,
    "audio_text": "本镜头对应的准确声音文本",
    "speakers": [
      {
        "speaker_label": "(S1)",
        "character_name": "旁白",
        "voice_description": "中文稳定声音描述",
        "voice_id": "VOICE-CHAR-001"
      }
    ],
    "cut_status": "tentative"
  },
  "generation_plan": {
    "model": "minimax-h3",
    "mode": "I2VA",
    "duration_seconds": 5,
    "duration_frames": 141,
    "audio_mode": "drive-audio",
    "reference_images": []
  }
}
```

规则：

- `source_text`、`generation_plan` 和非空 `video_prompt` 是严格导演输出的必需字段。
- `I2VA` 不声明参考槽；除 `Last_Frame_Continuity` 外需要 `image_prompt`。
- `FL2VA` 不声明参考槽，并需要 `last_frame_image_prompt`。
- `Ref2VA` 必须按镜头实际需要声明一至两个参考槽。只有一项有效参考时只声明 `<Picture 1>`，不得复制、虚构或硬凑 `<Picture 2>`：

```json
{
  "label": "<Picture 1>",
  "purpose": "人物身份参考",
  "prompt": "<Picture 1> 定义该角色已锁定的脸、发型、服装、材质和比例。",
  "source_character": "准确角色名",
  "asset": {
    "dataUrl": "可选运行时值",
    "filename": "可选运行时值"
  }
}
```

- 前期 JSON 可省略 `asset`，应用会解析 `source_character` 或要求上传。
- `generated_assets.target_last_frame` 是计划中的 FL2VA 终点；`generated_assets.last_frame` 是视频实际尾帧。
- 时间戳连续；时长与 `generation_plan.duration_seconds` 一致。
- 时长/帧数只允许 `5/141`、`10/260`、`15/379`。
- H3 固定字段名和参考标签保留英文；字段正文必须为中文。
- v4 非 MV 镜头必须有唯一 `shot_id` 和 `audio_plan`，其章节必须存在于 `director_plan.audio_plan.chapters`。
- 每个说话人必须有 `voice_id`，并且在整个项目中唯一解析到一个人物 `voice_profile` 或项目级 `narrator_voice`；重复或悬空的 `voice_id` 都是无效项目。
- 声音制作按镜头选择人物时，必须同时展示并绑定该人物的 `generated_assets.image` 与 `voice_profile`，不能独立选择不属于该人物的声音。切换人物后清除旧 `voice_audio`、`drive_audio` 及其文件名，并将 `cut_status` 与全局对齐状态恢复为待生成。
- `audio_plan.duration_seconds` 必须与 `generation_plan.duration_seconds` 一致；前期使用 `tentative`，千问配音确认能完整读完且最终混音完成后写为 `confirmed`。
- 非 MV 镜头必须使用 `drive-audio`，提示词引用 `<Audio 1>`，并以 `non_diegetic_music: N/A` 结束。

## 兼容性

- 保留现有 `lyrics` 和 `type` 字段。
- 完整导演项目包含逐镜头路由时，`generation_settings.h3.generation_mode` 必须为 `director-routed`。只允许 `first-frame`、`reference-images`、`director-routed` 三种全局值。
- `generation_settings.image_workflow` 只允许 `Z-Image-Turbo` 或 `Krea2 Turbo`；角色 `description` 必须与所选工作流对应的参考板提示词一致。
- 旧项目缺少导演扩展字段时仍可由应用加载，但不属于本技能的新严格输出。
- `generation_settings.h3` 继续作为旧项目的全局回退设置。
- 应用可读取旧存档并迁移为千问 3 TTS 配音 + Music 3 配乐；本技能只输出新版 v4。
