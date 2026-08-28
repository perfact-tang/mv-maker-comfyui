import type { DirectorAudioPlan, H3AudioModeValue, MVInfo, MVScriptData } from '../types/mv-data';
import { hasSpokenText } from './projectPageRouting';

export const bypassesLocalShotAudio = (shot: MVInfo, plan?: DirectorAudioPlan) => Boolean(
  plan && plan.mode !== 'disabled' && !hasSpokenText(shot),
);

export const resolveShotAudioMode = (shot: MVInfo, plan?: DirectorAudioPlan, fallback: H3AudioModeValue = 'native-audio'): H3AudioModeValue => (
  bypassesLocalShotAudio(shot, plan) ? 'native-audio'
    : plan && plan.mode !== 'disabled' ? 'drive-audio' : shot.generation_plan?.audio_mode ?? fallback
);

export const nonDialogueVideoPrompt = (prompt: string): string => {
  const soundscape = 'overall_soundscape:\n本镜头无对白、无旁白、无演唱，不朗读文字；由 H3 原生生成与画面一致的轻微环境声，不使用本地镜头音频驱动。';
  let next = prompt.trim()
    .replace(/drive_audio_transcript\s*:[\s\S]*?(?=\n\s*[a-z_]+\s*:|$)/gi, '')
    .replace(/<d>[\s\S]*?<\/d>/gi, '')
    .replace(/<Audio\s+\d+>/gi, '本镜头原生环境声');
  if (/overall_soundscape\s*:/i.test(next)) {
    next = next.replace(/overall_soundscape\s*:[\s\S]*?(?=non_diegetic_music\s*:|$)/i, `${soundscape}\n\n`);
  } else next += `\n\n${soundscape}`;
  return next.trim();
};

/** Upgrade only non-dialogue routing and prompts; keep every media record and the timeline lock. */
export const normalizeNonDialogueAudio = (project: MVScriptData): MVScriptData => {
  const plan = project.director_plan?.audio_plan;
  if (!plan || plan.mode === 'disabled') return project;
  let changed = false;
  const storyboard = project.storyboard.map((segment) => {
    let segmentChanged = false;
    const mvinfo = segment.mvinfo.map((shot) => {
      if (!bypassesLocalShotAudio(shot, plan)) return shot;
      const prompt = nonDialogueVideoPrompt(shot.video_prompt);
      if (prompt === shot.video_prompt && (!shot.generation_plan || shot.generation_plan.audio_mode === 'native-audio')) return shot;
      changed = segmentChanged = true;
      return { ...shot, video_prompt: prompt, generation_plan: shot.generation_plan ? { ...shot.generation_plan, audio_mode: 'native-audio' as const } : undefined };
    });
    return segmentChanged ? { ...segment, mvinfo } : segment;
  });
  return changed ? { ...project, storyboard } : project;
};

export const missingShotAudio = (shot: MVInfo, plan?: DirectorAudioPlan, externalAudioRequired = false): string | undefined => {
  if (bypassesLocalShotAudio(shot, plan)) return undefined;
  const audioFirst = Boolean(plan && plan.mode !== 'disabled');
  if (plan?.mode === 'qwen3-tts-audio-first' && hasSpokenText(shot) && !shot.generated_assets?.voice_audio) return '尚未生成配音';
  // Audio-first projects must use the final mix, never an unrelated legacy music track.
  const url = shot.generated_assets?.drive_audio || (!audioFirst ? shot.generated_assets?.audio : undefined);
  if ((audioFirst || externalAudioRequired) && !url) return '尚未生成最终 Drive Audio';
  return undefined;
};

/** Called before any image/video generation or upload so a missing file stops the queue immediately. */
export const prepareVideoAudio = async (shot: MVInfo, plan?: DirectorAudioPlan, externalAudioRequired = false): Promise<{ url?: string; blob?: Blob }> => {
  const audioFirst = Boolean(plan && plan.mode !== 'disabled');
  if (audioFirst && plan?.alignment_status !== 'locked') throw new Error('声音时间线尚未锁定，请先到“声音制作”锁定当前时间线；无需等待全片音频完成。');
  if (bypassesLocalShotAudio(shot, plan)) return {};
  const stopped = (reason: string) => new Error(`没有声音了\n${shot.shot_id || '当前镜头'}：${reason}。\n制作已终止，已完成的动画和配音保留。请补齐该镜头音频后继续。`);
  const missing = missingShotAudio(shot, plan, externalAudioRequired);
  if (missing) throw stopped(missing);
  const url = shot.generated_assets?.drive_audio || (!audioFirst ? shot.generated_assets?.audio : undefined);
  if (!audioFirst && !externalAudioRequired) return { url };
  try {
    const response = await fetch(url!);
    if (!response.ok) throw new Error(`音频文件无法读取（HTTP ${response.status}）`);
    if (response.headers.get('content-type')?.includes('text/html')) throw new Error('音频链接返回了网页，文件可能已失效');
    const blob = await response.blob();
    if (!blob.size) throw new Error('音频文件为空');
    return { url, blob };
  } catch (error) {
    throw stopped(error instanceof Error ? error.message : String(error));
  }
};
