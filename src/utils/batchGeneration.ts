import type { MVInfo } from '../types/mv-data';

export type BatchMode = 'continue' | 'restart';

export const pendingVideoIndexes = (shots: MVInfo[], mode: BatchMode): number[] => (
  shots
    .map((shot, index) => ({ shot, index }))
    .filter(({ shot }) => Boolean(shot.video_prompt?.trim()) && (mode === 'restart' || !shot.generated_assets?.video))
    .map(({ index }) => index)
);

export const missingVideoIndexes = (shots: MVInfo[] | undefined, indexes: number[]): number[] => (
  indexes.filter((index) => !shots?.[index]?.generated_assets?.video)
);
