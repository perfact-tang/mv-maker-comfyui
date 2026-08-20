import { createAudioAceWorkflow } from './audioAceWorkflow.ts';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };

const instrumental = createAudioAceWorkflow({
  tags: 'cinematic ambient, soft piano',
  lyrics: '[Intro]\n(Sparse piano)\n[Outro]\n(Clean fade)',
  durationSeconds: 615,
  mode: 'instrumental',
  bpm: 96,
  timeSignature: '4',
  language: 'zh',
  keyScale: 'C major',
  seed: 42,
  chapterId: 'ACE:01',
});

assert(instrumental.workflow['94'].inputs.duration === 600, 'caps encoder duration at 600 seconds');
assert(instrumental.workflow['98'].inputs.seconds === 600, 'keeps latent duration synchronized');
assert(instrumental.workflow['94'].inputs.language === 'en', 'uses instruction language for instrumental timelines');
assert(String(instrumental.workflow['94'].inputs.lyrics).startsWith('[Instrumental]\n'), 'marks instrumental mode');
assert(instrumental.workflow['3'].inputs.seed === 42 && instrumental.workflow['94'].inputs.seed === 42, 'keeps sampler and encoder seeds synchronized');
assert(String(instrumental.workflow['107'].inputs.filename_prefix).endsWith('ACE_01'), 'sanitizes output prefix');

const vocal = createAudioAceWorkflow({ tags: 'mandopop', lyrics: '[Verse]\n你好', durationSeconds: 120, mode: 'vocal', bpm: 120, timeSignature: '4', language: 'zh', keyScale: 'A minor' });
assert(vocal.workflow['94'].inputs.language === 'zh', 'uses the selected lyric language for vocals');
assert(vocal.workflow['94'].inputs.lyrics === '[Verse]\n你好', 'preserves vocal lyrics');

console.log('PASS Audio ACE workflow configuration');
