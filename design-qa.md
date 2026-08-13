# Design QA — 完整项目存档 v3

- Source visual truth: 本任务 Browser Comment 1 所附截图（页面视口 1980 × 1558），目标为顶部“保存项目 JSON”操作及其周边控制区。
- Implementation screenshot: `C:/Users/pengf/Documents/perfacttang/mv-maker-comfyui/qa-project-save-v3.png`。
- Downloaded implementation artifact: `C:/Users/pengf/Downloads/mv_project_001_full_2026-08-13.json`。
- Viewport: 实现页面 1280 × 720 CSS px，devicePixelRatio 1.25；源截图视口 1980 × 1558。视口不同，因此使用同一操作区聚焦对比，不做全页逐像素判断。
- State: 分镜制作 / H3 Turbo Stable 4V4A / 无音乐 / 横版 16:9 / 已载入 2 位人物与 4 个分段。

## Full-view comparison evidence

实现保留源页面的顶部 Tab、工作流区、H3 控制、方向控制、右侧三枚操作按钮、信息卡片和暗色玻璃视觉体系。改动未新增页面、弹窗或额外控制区。

## Focused region comparison evidence

源截图中的“保存项目 JSON”已替换为“保存完整项目”，按钮位置、青色语义、图标、尺寸和相邻按钮间距保持一致。新文案更明确地覆盖分镜与人物展示两类页面数据。

## Required fidelity surfaces

- Fonts and typography: 保持原按钮字号、字重及纵向换行行为；新文案没有溢出按钮。
- Spacing and layout rhythm: 保存按钮仍位于生成与关闭之间，未改变控制区的三列关系。
- Colors and visual tokens: 沿用原有青色主操作、紫色生成操作及红色关闭操作。
- Image quality and asset fidelity: 本次未新增或替换图像资产；人物图片 URL 原样进入存档。
- Copy and content: “保存完整项目”准确表达 v3 存档包含人物、分镜及生成设置。

## Findings

没有遗留的 P0/P1/P2 视觉或交互问题。

## Interaction and implementation checks

- 浏览器点击“保存完整项目”后成功下载 `mv_project_001_full_2026-08-13.json`。
- 实际下载文件为有效 UTF-8 JSON，包含 schema `mv-maker-project`、版本 3、2 位人物、人物生成图、4 个分段及完整生成设置。
- v3 存档创建后解析回读通过；人物数量、无音乐模式、竖版方向等设置保持一致。
- 原 v2 人物接入文件解析通过，继续兼容旧接入规范。
- TypeScript、目标 ESLint 和生产构建通过。
- 浏览器控制台错误与警告：0。

## Comparison history

- 初始状态：保存操作只直接导出旧的脚本根对象，缺少独立格式标识和生成设置区。
- 修复：新增 v3 存档包装结构、生成设置快照、人物数据保存及新旧双格式导入。
- 修复后证据：页面显示“保存完整项目”，实际下载文件结构与回读验证均通过。

final result: passed
