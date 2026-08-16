# MV Maker ComfyUI

## 接入文件规范 v2.0（兼容导入）

上传文件必须是 JSON，并在原有 `proposal_id`、`direction_name`、`basics` 和 `storyboard` 字段之外提供 `characters` 数组。无人物的产品片或知识解释片可以使用空数组；有人物时，每位人物必须包含 `name` 和 `description`，可选填 `role` 与 `traits`。

```json
{
  "proposal_id": 1,
  "direction_name": "Urban Noir Solitude",
  "characters": [
    {
      "name": "夜之女王",
      "role": "主角",
      "description": "三十岁左右的都市女性，黑色短发，举止克制而自信。常穿剪裁利落的深色大衣，在冷色城市环境中由暖色轮廓光突出人物主体。",
      "traits": ["冷静", "自信", "克制"]
    }
  ],
  "basics": {},
  "storyboard": []
}
```

校验规则：

- `characters`：必填数组，可以为空。
- `characters[].name`：必填，非空字符串。
- `characters[].description`：必填，非空字符串；建议覆盖年龄感、外观、服装、气质及关键识别特征，以便跨镜头保持一致。
- `characters[].role`：可选，字符串。
- `characters[].traits`：可选，字符串数组。

不符合规范的文件会在上传页显示具体到人物序号和字段的错误信息。

人物展示页会直接使用 `description` 作为首帧和视频生成提示词。描述可在页面内修改，生成结果会写回 `characters[].generated_assets`。整体视频方向支持横版 `736×416` 与竖版 `416×736`，该设定同时作用于人物展示和分镜制作。

## 完整项目存档规范 v4（兼容 v3）

“保存完整项目”会导出可重新载入的项目存档。人物展示数据以 `project.characters` 为唯一数据源，与基础信息和分镜一同保存；当前图片/视频工作流、横竖版方向及 H3 设置保存在 `generation_settings`。

```json
{
  "schema": "mv-maker-project",
  "schema_version": 4,
  "exported_at": "2026-08-13T00:00:00.000Z",
  "project": {
    "proposal_id": 1,
    "direction_name": "Urban Noir Solitude",
    "characters": [],
    "basics": {},
    "storyboard": []
  },
  "generation_settings": {
    "image_workflow": "Krea2 Turbo",
    "video_workflow": "H3 Turbo Stable 4V4A",
    "video_orientation": "landscape",
    "h3": {
      "generation_mode": "first-frame",
      "audio_mode": "native-audio",
      "video_length_frames": 141,
      "reference_images": [null, null]
    }
  }
}
```

导入器同时支持 v3 完整项目存档和原有 v2 人物接入文件。生成资源以当前 URL 或 data URL 形式保存在各自的 `generated_assets` 中。

### 大导演逐镜头 H3 计划

由 `direct-h3-storyboards` Skill 生成的项目可在 `project.director_plan` 中记录形式、风格、片长与原文覆盖策略，并在每个 `mvinfo.generation_plan` 中独立指定 `I2VA`、`FL2VA` 或 `Ref2VA`、5/10/15 秒时长及音频模式。`native-audio` 会让 H3 原生生成并导出声音，`no-audio` 才会明确导出静音视频。旧项目没有这些字段时继续使用 `generation_settings.h3` 的全局设置。

FL2VA 的计划目标图保存在 `generated_assets.target_last_frame`，视频实际导出的尾帧仍保存在 `generated_assets.last_frame`；两者不会互相覆盖。Ref2VA 每镜头声明两张参考图，可以通过 `source_character` 自动绑定人物页图片，也可以在镜头卡中单独上传。

### 千问 3 TTS 配音 + Music 3 配乐

v4 项目可在 `project.director_plan.audio_plan` 中声明 `qwen3-tts-audio-first`。千问 3 TTS 按人物页锁定的 `voice_id`、音色说明、参考文本、语言和 seed 逐镜头生成清晰配音；MiniMax Music 3 只按情绪章节生成纯器乐配乐。应用把配音保持 100%、配乐降低到 18% 后混合成逐镜头 Drive Audio，用于驱动 H3 口型、动作和节奏。H3 完成后会丢弃返回音轨，并重新封装这条最终混音。

声音优先项目必须先在人物页确认角色音色，再在“声音制作”页面完成千问配音、可选 Music 3 配乐、混合与锁定，才能批量生成 H3 视频。配音超过 5/10/15 秒镜头长度时会明确失败，不会截断人声；应精简台词或增加镜头时长。MV 项目使用 `audio_plan.mode: "disabled"`，继续沿用已有主音乐。

## 开发

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```
