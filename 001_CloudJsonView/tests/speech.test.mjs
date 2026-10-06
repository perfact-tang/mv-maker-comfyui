import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { detailedDescription, dialogue, speechEntries, speechChunks, selectVoice, SpeechReader } from '../website/speech.js';
import { characters, audio, storyboard } from '../website/viewer.js';

const { project } = JSON.parse(await readFile(new URL('../website/sample-project.json', import.meta.url), 'utf8'));
test('only detailed_description is read, including multiline and CRLF variants', () => {
  assert.equal(detailedDescription('summary:\n不要读\ndetailed_description:\n[Shot 1] 第一行。\n第二行。\noverall_soundscape: 不要读\nnon_diegetic_music: N/A'), '[Shot 1] 第一行。\n第二行。');
  assert.equal(detailedDescription('detailed_description: hello\r\nworld'), 'hello\nworld');
  assert.equal(detailedDescription('summary: no detailed section'), '');
  assert.equal(detailedDescription('integrated_multimodal_description: 兼容描述\noverall_soundscape: 不朗读'), '兼容描述');
  assert.equal(detailedDescription('integrated_multimodal_description: 后备\ndetailed_description: 优先\noverall_soundscape: 不朗读'), '优先');
  const texts = speechEntries(project, 'storyboard');
  assert.equal(texts.length, 18);
  assert.ok(texts.every((entry) => entry.text && !entry.text.includes('retention_analysis:') && !entry.text.includes('non_diegetic_music:')));
  assert.equal(speechEntries(project, 'storyboard', { search: 'SHOT-001' }).length, 1);
  assert.equal(speechEntries(project, 'storyboard', { segment: '1' }).length, 3);
});
test('each eligible section has a matching speech entry and music instructions are skipped', () => {
  for (const [tab, render] of [['characters', characters], ['audio', audio], ['storyboard', storyboard]]) {
    const html = render(project);
    const keys = [...html.matchAll(/data-read="([^"]+)"/g)].map((match) => match[1]);
    const entries = speechEntries(project, tab);
    assert.deepEqual(keys, entries.map((entry) => entry.key));
    assert.equal(new Set(keys).size, keys.length);
  }
  assert.equal(speechEntries(project, 'characters')[0].text, project.characters[0].description);
  assert.equal(speechEntries(project, 'audio').filter((entry) => entry.text).length, 23);
  assert.equal(dialogue('(No dialogue)'), '');
  assert.equal(dialogue('Hello.'), 'Hello.');
});
test('long Unicode text is chunked without losing non-whitespace characters', () => {
  const source = '人物设定🐈：每一个视角应保持一致。 English sentence! 한국어。\n'.repeat(100);
  const chunks = speechChunks(source);
  assert.ok(chunks.every((chunk) => Array.from(chunk).length <= 180));
  assert.equal(chunks.join('').replace(/\s/g, ''), source.replace(/\s/g, ''));
});
function fixture(voices = [{ lang: 'zh-CN', localService: true }]) {
  const spoken = [], events = [];
  const synth = { getVoices: () => voices, speak: (utterance) => spoken.push(utterance), cancel: () => events.push('cancel'), pause: () => events.push('pause'), resume: () => events.push('resume') };
  const reader = new SpeechReader({ synth, Utterance: class { constructor(text) { this.text = text; } } });
  return { reader, spoken, events };
}
test('queue completes in order, sets language, pauses, and ignores stale callbacks after replacement', () => {
  const { reader, spoken, events } = fixture();
  reader.play([{ key: '1', label: 'one', text: '第一节。' }, { key: '2', label: 'two', text: '第二节。' }], 'zh-CN');
  assert.equal(spoken[0].lang, 'zh-CN');
  reader.togglePause(); assert.equal(reader.state.paused, true);
  reader.togglePause(); assert.equal(reader.state.paused, false);
  assert.ok(events.includes('pause'));
  spoken[0].onend(); assert.equal(spoken[1].text, '第二节。');
  spoken[1].onend(); assert.equal(reader.state.active, false);
  assert.equal(reader.state.message, '朗读完成。');
  reader.play([{ key: 'old', text: '旧队列。' }, { key: 'old2', text: '不应播放。' }], 'zh-CN');
  const old = spoken.at(-1);
  reader.play([{ key: 'new', text: '新队列。' }], 'zh-CN');
  const count = spoken.length;
  old.onend(); old.onerror({ error: 'canceled' });
  assert.equal(spoken.length, count); assert.equal(reader.state.key, 'new');
  reader.stop(); assert.equal(reader.state.active, false);
});
test('voice selection prefers matching language; unsupported/missing voices and engine errors are visible', () => {
  assert.equal(selectVoice([{ lang: 'en-US' }, { lang: 'ja_JP' }], 'ja-JP').lang, 'ja_JP');
  const { reader, spoken } = fixture();
  reader.play([{ text: 'hello' }], 'ko-KR');
  assert.equal(spoken.length, 0); assert.match(reader.state.message, /未提供韩文/);
  reader.play([{ text: '你好' }], 'zh-CN'); spoken[0].onerror({ error: 'synthesis-failed' });
  assert.equal(reader.state.active, false); assert.match(reader.state.message, /未能完成/);
  const unavailable = new SpeechReader({});
  unavailable.play([{ text: '你好' }], 'zh-CN'); assert.match(unavailable.state.message, /不支持/);
});
