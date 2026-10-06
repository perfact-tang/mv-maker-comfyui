# AI Movie View

独立的纯 HTML + TailwindCSS + 原生 JavaScript 查看器，无 React、ComfyUI 或服务端。

- Firebase 项目：`vibecodingjapan`
- Hosting 站点：`aimovieview`
- 地址：https://aimovieview.web.app
- 邮箱密码登录、密码重置、退出。
- 导入完整 `mv-maker-project` v3/v4 存档或独立脚本 JSON。
- 项目概览、人物参考板、固定音色、音乐章节、逐镜头声音与分镜。
- 分镜按关键词、段落和 H3 模式筛选。
- 浏览器语音朗读：右上角选择中文、日文、英文、韩文；人物设定、声音台词和分镜 `detailed_description` 支持单项及整页顺序朗读、暂停、继续、停止。分镜筛选后只朗读筛选结果。
- 支持 HTTPS 媒体与内嵌 base64 素材；原项目本地 `/uploads` 路径不会自动上传。

本地导入的项目仅保留在页面内存，不上传、不保存到服务器，退出或刷新后需要重新导入。静态 Hosting 上的示例 `website/sample-project.json` 是公开资源；登录限制的是页面操作，私有项目请通过本地导入查看。

## 开发与部署

在本目录运行。发布目录包含已经编译的 Tailwind CSS，不需要构建后端。

```sh
# 重新生成 CSS（父项目已安装 TailwindCSS 3）
../node_modules/.bin/tailwindcss -c tailwind.config.cjs -i styles/input.css -o website/styles.css --minify

# 运行解析、渲染与安全回归检查
node --test tests/viewer.test.mjs
node --test tests/speech.test.mjs

# 本地 Hosting 模拟器，包含 Firebase 保留的配置 URL
npx -y firebase-tools@latest emulators:start --only hosting --project vibecodingjapan

# 仅部署 aimovieview，不会部署项目中的其他站点
npx -y firebase-tools@latest deploy --only hosting --project vibecodingjapan
```

Firebase 配置从 Hosting 的 `/__/firebase/init.json` 自动读取；使用项目已有 Auth 用户和登录提供方，不建立新的 Firebase 项目。Auth 授权域名需要包含 `aimovieview.web.app` 与 `aimovieview.firebaseapp.com`。Firebase SDK 通过 Google 官方 CDN 加载。

语音使用浏览器 Web Speech API 和设备可用语音；语言选择切换朗读语音，不翻译 JSON 原文。声音页朗读旁白和人物的参考台词、带人声章节的歌词及逐镜头台词，不朗读纯音乐制作说明。分镜优先提取 `detailed_description`，兼容旧镜头的 `integrated_multimodal_description`，不朗读其余协议字段。缺少文字的条目会跳过；设备缺少所选语言语音时会提示。每节使用完整文本朗读，整页在各节之间顺序连续播放，换页、换语言、加载新项目或退出登录会停止旧队列。

语音选择沿用 `04_VibeIdeaHelper`：优先 Kyoko（日文）、Ting-Ting／Ting Ting（中文）、Yuna（韩文）、Samantha（英文）；缺少指定语音时依次按精确语言、语言族和语音名称匹配。页面显示实际语音名称。
