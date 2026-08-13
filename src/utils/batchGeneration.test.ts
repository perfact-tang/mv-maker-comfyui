import assert from 'node:assert/strict';
import { missingVideoIndexes, pendingVideoIndexes } from './batchGeneration.ts';
import type { MVInfo } from '../types/mv-data.ts';

const shot = (video?: string, prompt = '生成视频'): MVInfo => ({
  timestamp: '00:00 - 00:05',
  type: 'New_Scene',
  lyrics: '(No dialogue)',
  video_prompt: prompt,
  generated_assets: video ? { video } : undefined,
});

const shots = [shot('done.mp4'), shot(), shot(undefined, '')];
assert.deepEqual(pendingVideoIndexes(shots, 'continue'), [1]);
assert.deepEqual(pendingVideoIndexes(shots, 'restart'), [0, 1]);
assert.deepEqual(missingVideoIndexes(shots, [0, 1]), [1]);
assert.deepEqual(missingVideoIndexes([shot('a.mp4'), shot('b.mp4')], [0, 1]), []);
console.log('batchGeneration tests passed');
