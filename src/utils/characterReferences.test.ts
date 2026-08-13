import assert from 'node:assert/strict';
import { resolveReferenceImage } from './characterReferences.ts';
import type { CharacterProfile, H3ShotReferenceImage } from '../types/mv-data.ts';

const characters: CharacterProfile[] = [
  { id: 'fang-001', name: ' 方继藩 ', description: '测试', generated_assets: { image: 'character.png' } },
  { character_id: 2, name: '邓健', description: '测试', generated_assets: { image: 'deng.png' } },
];

const reference = (overrides: Partial<H3ShotReferenceImage>): H3ShotReferenceImage => ({
  label: '<Picture 1>',
  purpose: '人物参考',
  prompt: '人物参考提示',
  ...overrides,
});

assert.equal(resolveReferenceImage(characters, reference({ source_character: '方继藩' }))?.dataUrl, 'character.png');
assert.equal(resolveReferenceImage(characters, reference({ source_character_id: 'FANG-001' }))?.dataUrl, 'character.png');
assert.equal(resolveReferenceImage(characters, reference({ source_character: '2' }))?.dataUrl, 'deng.png');
assert.equal(
  resolveReferenceImage(characters, reference({ source_character: '方继藩', asset: { dataUrl: 'manual.png', filename: 'manual.png' } }))?.dataUrl,
  'manual.png',
);
assert.equal(resolveReferenceImage(characters, reference({ source_character: '不存在' })), undefined);

console.log('characterReferences tests passed');
