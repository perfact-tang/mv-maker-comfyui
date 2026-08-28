import type { AudioChapter, MVInfo, Qwen3TtsLanguage, VoiceProfile, VoiceReferenceAudio } from '../types/mv-data';
import { executeComfyWorkflow, uploadAudioToComfy } from './comfyApi';
import { createMusic3Workflow } from './music3Workflow';
import { createAudioAceWorkflow } from './audioAceWorkflow';
import { createQwen3TtsWorkflow } from './qwen3TtsWorkflow';
import { analyzeAudioUrl } from './audioAlignment';
import { fitTtsDuration } from './audioTempo';
import { createQwen3VoiceCloneWorkflow, safeRefAudioMaxSeconds } from './qwen3VoiceCloneWorkflow';
import { shouldUseQwen3VoiceClone } from './voiceCloneProfile';
import { fixedVoiceReadError, persistFixedVoiceAudio } from './fixedVoiceStorage';

export { fitTtsDuration } from './audioTempo';

export const makeGeneratedFixedVoiceReference = async (audioUrl: string, voiceId: string): Promise<VoiceReferenceAudio> => {
  const persistentUrl = await persistFixedVoiceAudio(audioUrl, voiceId);
  const analysis = await analyzeAudioUrl(persistentUrl);
  const durationSeconds = Number(analysis.durationSeconds.toFixed(3));
  return {
    data_url: persistentUrl,
    filename: `${voiceId.replace(/[^a-zA-Z0-9_-]/g, '_')}-fixed-voice.wav`,
    mime_type: 'audio/wav',
    duration_seconds: durationSeconds,
    ref_audio_max_seconds: safeRefAudioMaxSeconds(durationSeconds),
    source: 'generated-fixed-voice',
  };
};

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
    instrumental: (chapter.generation_mode ?? 'instrumental') === 'instrumental',
  });
  const outputs = await executeComfyWorkflow(workflow);
  const audioUrl = outputs.audios[0];
  if (!audioUrl) throw new Error('Music 3 配乐已完成，但 SaveAudioAdvanced 没有返回音频文件');
  const analysis = await analyzeAudioUrl(audioUrl);
  return { audioUrl, seed, actualDurationSeconds: analysis.durationSeconds };
};

/** Recover the exact named upload left by older Voice Clone runs, without inventing a new voice. */
export const recoverFixedVoiceReference = async (profile: VoiceProfile): Promise<VoiceReferenceAudio> => {
  const reference = profile.reference_audio;
  if (!reference || reference.source !== 'generated-fixed-voice') throw new Error(`${profile.voice_id} 没有已创建的固定音色。`);
  if (reference.data_url.startsWith('/uploads/audio/fixed-voices/') || reference.data_url.startsWith('data:')) return reference;
  let sourceUrl = reference.data_url;
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    const legacyUrl = new URL(sourceUrl, window.location.origin);
    if (response.status !== 404 || legacyUrl.searchParams.get('type') !== 'temp') {
      throw new Error(fixedVoiceReadError(profile.voice_id, response.status));
    }
    legacyUrl.search = new URLSearchParams({ filename: reference.filename, subfolder: '', type: 'input' }).toString();
    sourceUrl = legacyUrl.toString();
  }
  const analysis = await analyzeAudioUrl(sourceUrl);
  if (Math.abs(analysis.durationSeconds - reference.duration_seconds) > 0.05) {
    throw new Error(`${profile.voice_id} 的缓存音色时长与原记录不符，已停止恢复以免误用其他音色。请重新创建固定音色。`);
  }
  const dataUrl = await persistFixedVoiceAudio(sourceUrl, profile.voice_id);
  return { ...reference, data_url: dataUrl };
};

export const generateAudioAceChapter = async (chapter: AudioChapter, replaceSeed = false) => {
  const { workflow, seed } = createAudioAceWorkflow({
    tags: chapter.tags?.trim() || chapter.caption,
    lyrics: chapter.lyrics,
    durationSeconds: chapter.target_duration_seconds,
    mode: chapter.generation_mode ?? 'instrumental',
    bpm: chapter.bpm ?? 100,
    timeSignature: chapter.time_signature ?? '4',
    language: chapter.language ?? 'en',
    keyScale: chapter.key_scale ?? 'C major',
    seed: replaceSeed ? undefined : chapter.seed,
    chapterId: chapter.chapter_id,
  });
  const outputs = await executeComfyWorkflow(workflow);
  const audioUrl = outputs.audios[0];
  if (!audioUrl) throw new Error('Audio ACE 已执行，但 SaveAudioMP3 没有返回音频文件');
  const analysis = await analyzeAudioUrl(audioUrl);
  return { audioUrl, seed, actualDurationSeconds: analysis.durationSeconds };
};

export const generateMusicChapter = async (chapter: AudioChapter, replaceSeed = false) => (
  chapter.music_workflow === 'Audio ACE Step 1.5'
    ? generateAudioAceChapter(chapter, replaceSeed)
    : generateMusic3Chapter(chapter, replaceSeed)
);

export const generateQwen3Voice = async (
  profile: VoiceProfile,
  text = profile.reference_text,
  savePrompt = true,
  language?: Qwen3TtsLanguage,
  requireVoiceClone = false,
) => {
  const usesVoiceClone = shouldUseQwen3VoiceClone(profile, requireVoiceClone);
  if (usesVoiceClone) {
    const reference = profile.reference_audio;
    if (!reference?.data_url || !reference.filename || !reference.duration_seconds) {
      throw new Error(`${profile.voice_id} 已选择参考音频克隆，但尚未上传有效的参考音色文件`);
    }
    const referenceResponse = await fetch(reference.data_url);
    if (!referenceResponse.ok) throw new Error(fixedVoiceReadError(profile.voice_id, referenceResponse.status));
    const uploadedFilename = await uploadAudioToComfy(await referenceResponse.blob(), reference.filename);
    const { workflow, seed, refAudioMaxSeconds } = createQwen3VoiceCloneWorkflow({
      text,
      outputLanguage: language ?? profile.language,
      referenceLanguage: profile.reference_language ?? 'auto',
      referenceAudioFilename: uploadedFilename,
      referenceAudioDurationSeconds: reference.duration_seconds,
      refAudioMaxSeconds: reference.ref_audio_max_seconds,
      seed: profile.seed,
    });
    const outputs = await executeComfyWorkflow(workflow);
    const audioUrl = outputs.audios[0];
    if (!audioUrl) throw new Error('千问 3 Voice Clone 已执行，但 PreviewAudio 没有返回可用音频');
    return { audioUrl, seed, promptFilename: undefined, refAudioMaxSeconds };
  }
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
  return { audioUrl, seed, promptFilename, refAudioMaxSeconds: undefined };
};

export const generateQwen3ShotVoice = async (
  proposalId: number,
  shot: MVInfo,
  profile: VoiceProfile,
  language?: Qwen3TtsLanguage,
  requireVoiceClone = false,
): Promise<DriveAudioChunk> => {
  const duration = shot.audio_plan?.duration_seconds ?? shot.generation_plan?.duration_seconds ?? 5;
  const text = shot.audio_plan?.audio_text?.trim() || shot.lyrics.trim();
  if (!text || text === '(No dialogue)') throw new Error(`${shot.shot_id || '镜头'} 没有可配音文本`);
  const generated = await generateQwen3Voice(profile, text, false, language, requireVoiceClone);
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
  if (!chapter.generated_audio) throw new Error('配乐章节尚未生成');
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
      'X-File-Name': encodeURIComponent(`${chapter.music_workflow === 'Audio ACE Step 1.5' ? 'audio-ace' : 'music3'}-score-${chapter.chapter_id}.mp3`),
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
