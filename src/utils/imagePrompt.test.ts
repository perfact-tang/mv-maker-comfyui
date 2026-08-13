import assert from 'node:assert/strict';
import { composeStoryboardImagePrompt } from './imagePrompt.ts';

const prompt = composeStoryboardImagePrompt('方继藩从床榻坐起。', '统一三维动画电影风格。', 'landscape');
assert.match(prompt, /方继藩从床榻坐起/);
assert.match(prompt, /统一三维动画电影风格/);
assert.match(prompt, /横版 16:9/);
assert.match(prompt, /不要擅自切换画风/);
console.log('imagePrompt tests passed');
