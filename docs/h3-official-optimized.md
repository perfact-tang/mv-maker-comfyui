# H3 官方加速优化版

新增视频生成选项，来自用户提供的 `video_minimax_h3_r2v.json`。旧版
`H3 Turbo Stable 4V4A`、项目 JSON 格式和所有 skills 保持不变。

## 使用

先按原流程生成，再将顶部「视频生成 Workflow」手动切换为「H3 官方加速优化版」。
镜头计划、提示词、首尾帧、参考图和音频设置共用，不需要重新导入或改写脚本。
单镜头点击「AI生视频」重新生成；批量生成时选择重新生成已有视频，不要跳过已生成镜头。
重新生成会更新当前视频和尾帧，建议先保存完整项目或下载旧视频。

## 工作流分析与适配

- 原文件使用 `MiniMaxH3ReferenceToVideo`、Ref2VA INT8 模型、
  `res_multistep` + `simple` 调度、独立视频/音频 VAE 解码以及 `CreateVideo` / `SaveVideo`。
- 保留原文件的模型、采样器和加速开关默认值：`146.value=false`，运行完整 **20 步**；
  文件中虽有 4 步 ref2v LoRA 分支，但没有默认启用。
- Ref2VA 使用原节点，按现有项目连接一至两张参考图，删除示例图片和未连接的提示词标签。
- I2VA / FL2VA 使用官方 `MiniMaxH3ImageToVideo` 和已有的
  `minimax_h3_fl2va_int8_convrot.safetensors`，保留首帧/目标尾帧的关键帧含义，
  不将它们降级为普通参考图。ref2v 专用 LoRA 在这些模式下关闭。
- 原生音频使用官方解码；静音不连接输出音轨；参考音频连接 Ref2VA 的音频参考口。
- Drive Audio 通过已安装 T8 插件的 `MiniMaxH3AudioLatentControlT8` 锁定源音频 latent，
  继续使用新工作流的官方采样链，输出连接原始音频。声音优先项目继续执行现有最终混音流程。
  关键帧 + 参考音频仍维持原有 Hybrid 限制，明确报错，不忽略音频。
- 横竖屏使用现有项目尺寸；保留项目的 141 / 260 / 379 等帧数，不重新计算项目时间线。
  原文件的时长表达式保留，运行时以「项目帧数 / 24」输入，避免切换后音频时长改变。
- 增加末帧提取和 `SaveImage`，供连续镜头承接。

两套工作流在应用中共用设置并可互换，但底层节点不是相同结构；以上是程序中的接口适配。
官方节点接口核对来源：[ComfyUI H3 节点源码](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_minimax_h3.py)。

## 验证范围

已通过 H3 参数/节点连线回归测试、相关分镜与音频测试、TypeScript 检查及生产构建。
已在浏览器中导入测试分镜，检查旧版到新版切换后镜头模式、音频与提示词保留，
以及 FL2VA 目标尾帧控件显示。
当前配置的 ComfyUI 服务无法连接，尚未执行真实 GPU 出片或画质对比；
关键帧和 Drive Audio 适配还需在运行中的服务上验证。
