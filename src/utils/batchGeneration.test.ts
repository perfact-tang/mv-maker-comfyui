import assert from 'node:assert/strict';
import { missingVideoIndexes, pendingVideoIndexes, pendingVoiceIndexes } from './batchGeneration.ts';
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

const voices = Array.from({ length: 200 }, (_, index) => ({ ...shot(), lyrics: index === 94 ? '(No dialogue)' : 'test', generated_assets: index < 93 || index === 195 ? { voice_audio: 'existing.mp3' } : undefined }));
assert.equal(pendingVoiceIndexes(voices, 'continue')[0], 93);
assert.equal(pendingVoiceIndexes(voices, 'from', 94)[0], 93);
assert.deepEqual(pendingVoiceIndexes(voices, 'from', 194), [193, 194, 196, 197, 198, 199]);
assert.equal(pendingVoiceIndexes(voices, 'restart').length, 199);
assert.equal(pendingVoiceIndexes(voices, 'restart')[0], 0);
assert.deepEqual(pendingVoiceIndexes([], 'continue'), []);
assert.deepEqual(pendingVoiceIndexes([{ ...shot(), lyrics: 'done', generated_assets: { voice_audio: 'keep' } }], 'continue'), []);
for (const invalid of [0, -1, 1.5, 201, NaN]) assert.throws(() => pendingVoiceIndexes(voices, 'from', invalid));
assert.equal(voices[0].generated_assets?.voice_audio, 'existing.mp3');
console.log('PASS voice continue / restart / from 94 and 194 without mutation');
