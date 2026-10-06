import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseProject, shotsOf, mediaUrl, overview, characters, audio, storyboard } from '../website/viewer.js';

const sample = JSON.parse(await readFile(new URL('../website/sample-project.json', import.meta.url), 'utf8'));
const { project, settings } = parseProject(sample);
test('reference archive and legacy script both load', () => {
  assert.equal(project.characters.length, 4);
  assert.equal(project.storyboard.length, 6);
  assert.equal(shotsOf(project).length, 18);
  assert.equal(parseProject(project).project, project);
  assert.equal(parseProject('\uFEFF' + JSON.stringify(sample)).project.direction_name, project.direction_name);
  assert.throws(() => parseProject({ project: { ...project, storyboard: [{}] } }), /分镜结构/);
});
test('all four views render the sample content and filters', () => {
  assert.match(overview(project, settings), /创作方案/);
  assert.match(characters(project), /Mochi/);
  assert.match(audio(project), /VOICE-NARRATOR/);
  assert.match(storyboard(project), /18 \/ 18/);
  assert.match(storyboard(project, { search: 'SHOT-001' }), /1 \/ 18/);
  assert.match(storyboard(project, { segment: '0' }), /3 \/ 18/);
  assert.match(storyboard(project, { search: 'nonexistent phrase' }), /没有符合条件/);
});
test('untrusted JSON cannot inject markup or executable media URLs', () => {
  const malicious = structuredClone(project);
  malicious.characters[0].name = '<img src=x onerror=alert(1)>';
  assert.ok(!characters(malicious).includes('<img src=x'));
  assert.equal(mediaUrl('javascript:alert(1)', 'image'), '');
  assert.equal(mediaUrl('data:image/svg+xml;base64,PHN2Zz4=', 'image'), '');
  assert.equal(mediaUrl('http://127.0.0.1:8188/view', 'image'), '');
  assert.equal(mediaUrl('/uploads/audio.wav', 'audio'), '');
  assert.equal(mediaUrl('https://example.com/audio.wav', 'audio'), 'https://example.com/audio.wav');
  assert.equal(mediaUrl({ data_url: 'data:audio/wav;base64,YQ==' }, 'audio'), 'data:audio/wav;base64,YQ==');
});
