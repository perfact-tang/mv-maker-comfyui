#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const validator = resolve(scriptDir, 'validate_storyboard.mjs');
const templatePath = resolve(scriptDir, '..', 'assets', 'storyboard-template.json');
const nodeExecutable = process.execPath;
const temp = await mkdtemp(join(tmpdir(), 'direct-h3-storyboards-'));
const base = JSON.parse(await readFile(templatePath, 'utf8'));

const run = async (name, mutate, expectedSuccess) => {
  const fixture = structuredClone(base);
  mutate(fixture);
  const path = join(temp, `${name}.json`);
  await writeFile(path, JSON.stringify(fixture, null, 2));
  const result = spawnSync(nodeExecutable, [validator, path], { encoding: 'utf8' });
  const success = result.status === 0;
  if (success !== expectedSuccess) {
    throw new Error(`${name}: expected success=${expectedSuccess}, got status=${result.status}\n${result.stdout}${result.stderr}`);
  }
  console.log(`PASS ${name}`);
};

try {
  await run('valid', () => {}, true);
  await run('missing-director-plan', (value) => { delete value.project.director_plan; }, false);
  await run('timeline-gap', (value) => { value.project.storyboard[0].mvinfo[0].timestamp = '00:05 - 00:10'; }, false);
  await run('invalid-frames', (value) => { value.project.storyboard[0].mvinfo[0].generation_plan.duration_frames = 260; }, false);
  await run('missing-character-voice', (value) => { delete value.project.characters[0].voice_profile; }, false);
  await run('missing-shot-voice-id', (value) => { delete value.project.storyboard[0].mvinfo[0].audio_plan.speakers[0].voice_id; }, false);
  await run('global-native-audio', (value) => { value.generation_settings.h3.audio_mode = 'native-audio'; }, false);
  await run('fl2va-missing-target-prompt', (value) => { value.project.storyboard[0].mvinfo[0].generation_plan.mode = 'FL2VA'; }, false);
  await run('ref2va-missing-references', (value) => { value.project.storyboard[0].mvinfo[0].generation_plan.mode = 'Ref2VA'; }, false);
  await run('ref2va-single-reference', (value) => {
    const plan = value.project.storyboard[0].mvinfo[0].generation_plan;
    plan.mode = 'Ref2VA';
    plan.reference_images = [{
      label: '<Picture 1>',
      purpose: '人物身份参考',
      prompt: '<Picture 1> 定义并保持人物身份、服装与材质。',
    }];
  }, true);
  await run('ref2va-too-many-references', (value) => {
    const plan = value.project.storyboard[0].mvinfo[0].generation_plan;
    plan.mode = 'Ref2VA';
    plan.reference_images = [1, 2, 3].map((number) => ({
      label: `<Picture ${number}>`,
      purpose: `第${number}项参考`,
      prompt: `<Picture ${number}> 定义第${number}项参考。`,
    }));
  }, false);
} finally {
  await rm(temp, { recursive: true, force: true });
}
