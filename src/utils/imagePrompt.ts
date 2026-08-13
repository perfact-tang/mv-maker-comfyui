import type { VideoOrientation } from '../types/mv-data';

export const composeStoryboardImagePrompt = (
  shotPrompt: string,
  artStyleDescription: string | undefined,
  orientation: VideoOrientation,
): string => {
  const subject = shotPrompt.trim();
  const style = artStyleDescription?.trim() || '';
  const aspect = orientation === 'portrait' ? '竖版 9:16 构图' : '横版 16:9 构图';
  return [
    `镜头画面要求：${subject}`,
    style ? `项目统一艺术风格（必须严格遵守）：${style}` : '',
    `输出约束：${aspect}；角色脸型、发型、服装结构、配色、材质、时代器物、灯光方向和渲染质感必须与项目统一风格及角色参考图一致；不要擅自切换画风。`,
  ].filter(Boolean).join('\n\n');
};
