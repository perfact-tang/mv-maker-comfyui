# MV Maker 导演 JSON 约定

输出完整 `mv-maker-project` 存档，`schema_version` 为 `3`。完整存档优先于旧版独立脚本，因为它能自动选择图片工作流、H3 和画面方向。

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

`form_subtype` 可选。严格模式下其他导演字段必须存在。`visual_style_lock` 是新版技能的强制输出。

## 角色参考设定板

每位跨镜头角色使用以下结构。`description` 是人物页直接提交给 ComfyUI 的完整中文提示词，不是人物小传。

```json
{
  "name": "角色名",
  "role": "角色功能",
  "description": "与当前 image_workflow 对应、可直接生成统一多视图角色板的中文提示词",
  "traits": ["稳定身份锚点"],
  "reference_sheet": {
    "style_id": "与 director_plan.visual_style_lock.style_id 完全一致",
    "layout": "横向16:9；3/4主视图；正面、侧面、背面；四个表情特写；眼睛、发型、服装、道具细节；色板",
    "z_image_prompt": "Z-Image-Turbo 中文适配提示词",
    "krea_prompt": "Krea2 Turbo 中文适配提示词"
  }
}
```

规则：

- 全部角色共享同一个 `style_id`、逐字相同的风格前缀、逐字相同的负面提示词、版式、背景和灯光。
- `generation_settings.image_workflow` 为 `Z-Image-Turbo` 时，`description` 与 `reference_sheet.z_image_prompt` 完全相同。
- 工作流为 `Krea2 Turbo` 时，`description` 与 `reference_sheet.krea_prompt` 完全相同。
- 每张板只展示一个角色的多个角度。全部视图的脸、年龄、体型、服装、配色和道具必须一致。
- 没有人物时 `characters` 使用空数组。

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
  "generation_plan": {
    "model": "minimax-h3",
    "mode": "I2VA",
    "duration_seconds": 5,
    "duration_frames": 141,
    "audio_mode": "native-audio",
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

## 兼容性

- 保留现有 `lyrics` 和 `type` 字段。
- 完整导演项目包含逐镜头路由时，`generation_settings.h3.generation_mode` 必须为 `director-routed`。只允许 `first-frame`、`reference-images`、`director-routed` 三种全局值。
- `generation_settings.image_workflow` 只允许 `Z-Image-Turbo` 或 `Krea2 Turbo`；角色 `description` 必须与所选工作流对应的参考板提示词一致。
- 旧项目缺少导演扩展字段时仍可由应用加载，但不属于本技能的新严格输出。
- `generation_settings.h3` 继续作为旧项目的全局回退设置。
