import { createMusic3Workflow } from './music3Workflow.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const { workflow, seed } = createMusic3Workflow({
  caption: '清晰念白与克制配乐',
  lyrics: '[Verse]\n测试台词',
  maxDurationSeconds: 315,
  seed: 42,
  chapterId: 'chapter:01',
});

assert(workflow['37:13'].inputs.caption === '清晰念白与克制配乐', 'sets caption');
assert(workflow['37:13'].inputs.lyrics === '[Verse]\n测试台词', 'sets lyrics');
assert(workflow['37:13'].inputs.max_duration === 300, 'caps duration at 300 seconds');
assert(workflow['37:38'].inputs.seed === 42 && seed === 42, 'keeps the requested seed');
assert(String(workflow['35'].inputs.filename_prefix).endsWith('chapter_01'), 'sanitizes output prefix');
assert(JSON.stringify(workflow['37:9'].inputs.seed) === JSON.stringify(['37:38', 0]), 'preserves sampler seed connection');

const instrumental = createMusic3Workflow({ caption: '温暖配乐', lyrics: '不应出现的对白', maxDurationSeconds: 30, instrumental: true });
assert(String(instrumental.workflow['37:13'].inputs.caption).includes('Instrumental score only'), 'instrumental mode forbids vocals in caption');
assert(String(instrumental.workflow['37:13'].inputs.lyrics).startsWith('[Instrumental]\n'), 'instrumental mode marks the timeline without discarding it');
assert(String(instrumental.workflow['37:13'].inputs.lyrics).includes('不应出现的对白'), 'instrumental mode preserves the supplied temporal script');

console.log('PASS Music 3 workflow configuration');
