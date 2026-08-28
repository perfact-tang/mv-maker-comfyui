import type { MVInfo } from '../types/mv-data';
import { hasSpokenText } from './projectPageRouting';

export type BatchMode = 'continue' | 'restart';

/** Do not catch per-shot failures here: the first failed/missing-audio shot ends the queue. */
export const runVideoGenerationQueue = async (indexes: number[], generate: (index: number) => Promise<unknown>) => {
  for (const index of indexes) await generate(index);
};

export type VoiceBatchMode = BatchMode | 'from';

/** startShot is the 1-based position in the complete ordered storyboard, including silent shots. */
export const pendingVoiceIndexes = (shots: MVInfo[], mode: VoiceBatchMode, startShot = 1): number[] => {
  if (mode === 'from' && (!Number.isInteger(startShot) || startShot < 1 || startShot > shots.length)) {
    throw new Error(`请输入 1 至 ${shots.length} 之间的整数镜头序号。`);
  }
  return shots.flatMap((shot, index) => {
    if (!hasSpokenText(shot) || (mode === 'from' && index + 1 < startShot)) return [];
    if (mode !== 'restart' && shot.generated_assets?.voice_audio) return [];
    return [index];
  });
};

export const pendingVideoIndexes = (shots: MVInfo[], mode: BatchMode): number[] => (
  shots
    .map((shot, index) => ({ shot, index }))
    .filter(({ shot }) => Boolean(shot.video_prompt?.trim()) && (mode === 'restart' || !shot.generated_assets?.video))
    .map(({ index }) => index)
);

export const missingVideoIndexes = (shots: MVInfo[] | undefined, indexes: number[]): number[] => (
  indexes.filter((index) => !shots?.[index]?.generated_assets?.video)
);
