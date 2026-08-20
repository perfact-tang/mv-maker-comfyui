import voiceCloneWorkflow from './qwen3_voice_clone.json' with { type: 'json' };
import type { Qwen3AsrLanguage, Qwen3TtsLanguage } from '../types/mv-data';
import type { Qwen3TtsWorkflow } from './qwen3TtsWorkflow';

export const QWEN3_ASR_LANGUAGES: readonly Qwen3AsrLanguage[] = [
  'auto', 'Chinese', 'English', 'Cantonese', 'Arabic', 'German', 'French', 'Spanish',
  'Portuguese', 'Indonesian', 'Italian', 'Korean', 'Russian', 'Thai', 'Vietnamese',
  'Japanese', 'Turkish', 'Hindi', 'Malay', 'Dutch', 'Swedish', 'Danish', 'Finnish',
  'Polish', 'Czech', 'Filipino', 'Persian', 'Greek', 'Hungarian', 'Macedonian', 'Romanian',
];

export const safeRefAudioMaxSeconds = (durationSeconds: number, configuredSeconds = 60) => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('参考音频时长无效，无法安全设置 ref_audio_max_seconds');
  }
  const configured = Number.isFinite(configuredSeconds) ? Math.ceil(configuredSeconds) : 60;
  return Math.max(60, configured, Math.ceil(durationSeconds) + 1);
};

export interface Qwen3VoiceCloneWorkflowOptions {
  text: string;
  outputLanguage?: Qwen3TtsLanguage;
  referenceLanguage?: Qwen3AsrLanguage;
  referenceAudioFilename: string;
  referenceAudioDurationSeconds: number;
  refAudioMaxSeconds?: number;
  seed?: number;
}

export const createQwen3VoiceCloneWorkflow = ({
  text,
  outputLanguage = 'Auto',
  referenceLanguage = 'auto',
  referenceAudioFilename,
  referenceAudioDurationSeconds,
  refAudioMaxSeconds = 60,
  seed,
}: Qwen3VoiceCloneWorkflowOptions) => {
  const workflow = structuredClone(voiceCloneWorkflow) as unknown as Qwen3TtsWorkflow;
  const resolvedSeed = seed ?? Math.floor(Math.random() * 1_000_000_000_000_000);
  const resolvedRefAudioMaxSeconds = safeRefAudioMaxSeconds(referenceAudioDurationSeconds, refAudioMaxSeconds);
  workflow['2'].inputs.language = referenceLanguage;
  workflow['4'].inputs.audio = referenceAudioFilename;
  workflow['9'].inputs.text = text.trim();
  workflow['9'].inputs.seed = resolvedSeed;
  workflow['9'].inputs.language = outputLanguage;
  workflow['9'].inputs.ref_audio_max_seconds = resolvedRefAudioMaxSeconds;
  return { workflow, seed: resolvedSeed, refAudioMaxSeconds: resolvedRefAudioMaxSeconds };
};
