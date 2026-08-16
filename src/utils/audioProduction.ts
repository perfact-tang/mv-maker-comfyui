import type { AudioChapter, MVInfo, Qwen3TtsLanguage, VoiceProfile } from '../types/mv-data';
import { executeComfyWorkflow } from './comfyApi';
import { createMusic3Workflow } from './music3Workflow';
import { createQwen3TtsWorkflow } from './qwen3TtsWorkflow';
import { analyzeAudioUrl } from './audioAlignment';
import { fitTtsDuration } from './audioTempo';

export { fitTtsDuration } from './audioTempo';

export interface DriveAudioChunk {
  shotId: string;
  filename: string;
  url: string;
  durationSeconds: number;
  sourceStartSeconds: number;
  actualDurationSeconds?: number;
  playbackRate?: number;
}

export const generateMusic3Chapter = async (chapter: AudioChapter, replaceSeed = false) => {
  const { workflow, seed } = createMusic3Workflow({
    caption: chapter.caption,
    lyrics: chapter.lyrics,
    maxDurationSeconds: chapter.target_duration_seconds,
    seed: replaceSeed ? undefined : chapter.seed,
    chapterId: chapter.chapter_id,
    instrumental: true,
  });
  const outputs = await executeComfyWorkflow(workflow);
  const audioUrl = outputs.audios[0];
  if (!audioUrl) throw new Error('Music 3 配乐已完成，但 SaveAudioAdvanced 没有返回音频文件');
  return { audioUrl, seed };
};

export const generateQwen3Voice = async (profile: VoiceProfile, text = profile.reference_text, savePrompt = true, language?: Qwen3TtsLanguage) => {
  const { workflow, seed, promptFilename } = createQwen3TtsWorkflow({
    text,
    instruct: profile.instruct,
    language: language ?? profile.language,
    seed: profile.seed,
    voiceId: profile.voice_id,
    savePrompt,
  });
  const outputs = await executeComfyWorkflow(workflow);
  const audioUrl = outputs.audios[0];
  if (!audioUrl) throw new Error('千问 3 TTS 已执行，但 PreviewAudio 没有返回可用音频');
  return { audioUrl, seed, promptFilename };
};

export const generateQwen3ShotVoice = async (
  proposalId: number,
  shot: MVInfo,
  profile: VoiceProfile,
  language?: Qwen3TtsLanguage,
): Promise<DriveAudioChunk> => {
  const duration = shot.audio_plan?.duration_seconds ?? shot.generation_plan?.duration_seconds ?? 5;
  const text = shot.audio_plan?.audio_text?.trim() || shot.lyrics.trim();
  if (!text || text === '(No dialogue)') throw new Error(`${shot.shot_id || '镜头'} 没有可配音文本`);
  const generated = await generateQwen3Voice(profile, text, false, language);
  const analysis = await analyzeAudioUrl(generated.audioUrl);
  const fitted = fitTtsDuration(analysis.durationSeconds, duration);
  const audioResponse = await fetch(generated.audioUrl);
  if (!audioResponse.ok) throw new Error(`无法下载千问 3 TTS 音频：HTTP ${audioResponse.status}`);
  const generatedBlob = await audioResponse.blob();
  const response = await fetch('/api/audio/normalize-tts', {
    method: 'POST',
    headers: {
      'Content-Type': generatedBlob.type || 'application/octet-stream',
      'X-Proposal-Id': String(proposalId),
      'X-Shot-Id': shot.shot_id || 'shot',
      'X-Shot-Duration': String(fitted.durationSeconds),
      'X-Actual-Duration': String(analysis.durationSeconds),
      'X-Playback-Rate': String(fitted.playbackRate),
      'X-File-Name': encodeURIComponent(`${shot.shot_id || 'shot'}-qwen3.wav`),
    },
    body: generatedBlob,
  });
  if (!response.ok) throw new Error(await response.text() || '千问 3 TTS 音频标准化失败');
  return (await response.json()) as DriveAudioChunk;
};

export const mixVoiceAndMusic = async (
  proposalId: number,
  shotId: string,
  voiceAudioUrl: string,
  musicAudioUrl?: string,
): Promise<DriveAudioChunk> => {
  if (!musicAudioUrl) {
    return { shotId, filename: voiceAudioUrl.split('/').pop() || `${shotId}.mp3`, url: voiceAudioUrl, durationSeconds: 0, sourceStartSeconds: 0 };
  }
  const response = await fetch('/api/audio/mix-shot', {
    method: 'POST',
    headers: {
      'X-Proposal-Id': String(proposalId),
      'X-Shot-Id': shotId,
      'X-Voice-Audio-Url': encodeURIComponent(voiceAudioUrl),
      'X-Music-Audio-Url': encodeURIComponent(musicAudioUrl),
    },
  });
  if (!response.ok) throw new Error(await response.text() || '配音与配乐混合失败');
  return (await response.json()) as DriveAudioChunk;
};

export const splitMusic3Chapter = async (
  proposalId: number,
  chapter: AudioChapter,
  shots: MVInfo[],
): Promise<DriveAudioChunk[]> => {
  if (!chapter.generated_audio) throw new Error('Music 3 配乐章节尚未生成');
  const response = await fetch(chapter.generated_audio);
  if (!response.ok) throw new Error(`无法下载声音章节：HTTP ${response.status}`);
  const blob = await response.blob();
  const shotPayload = shots.map((shot, index) => ({
    shotId: shot.shot_id || `${chapter.chapter_id}-shot-${index + 1}`,
    start: shot.audio_plan?.source_start_seconds ?? 0,
    duration: shot.audio_plan?.duration_seconds ?? shot.generation_plan?.duration_seconds ?? 5,
  }));
  const splitResponse = await fetch('/api/audio/drive-split', {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(`music3-score-${chapter.chapter_id}.mp3`),
      'X-Proposal-Id': String(proposalId),
      'X-Chapter-Id': chapter.chapter_id,
      'X-Audio-Shots': JSON.stringify(shotPayload),
    },
    body: blob,
  });
  if (!splitResponse.ok) throw new Error(await splitResponse.text() || 'Drive Audio 切分失败');
  return ((await splitResponse.json()) as { chunks: DriveAudioChunk[] }).chunks;
};

export const muxOriginalDriveAudio = async (
  proposalId: number,
  shotId: string,
  sourceVideoUrl: string,
  driveAudioUrl: string,
) => {
  const videoResponse = await fetch(sourceVideoUrl);
  if (!videoResponse.ok) throw new Error(`无法下载 H3 原始视频：HTTP ${videoResponse.status}`);
  const response = await fetch('/api/media/mux-drive-audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'video/mp4',
      'X-Proposal-Id': String(proposalId),
      'X-Shot-Id': shotId,
      'X-Drive-Audio-Url': encodeURIComponent(driveAudioUrl),
    },
    body: await videoResponse.blob(),
  });
  if (!response.ok) throw new Error(await response.text() || '最终 Drive Audio 音轨封装失败');
  return ((await response.json()) as { url: string }).url;
};
