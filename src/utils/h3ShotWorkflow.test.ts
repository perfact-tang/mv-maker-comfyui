import { configureH3VisualInputs } from './h3ShotWorkflow.ts';
import type { H3Workflow } from './h3ShotWorkflow.ts';

const createWorkflow = (): H3Workflow => ({
  '6': { inputs: { task_type: 'I2VA', prompt: '', length: 141 } },
  '9': { inputs: { noise_seed: 1 } },
});

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const i2va = createWorkflow();
configureH3VisualInputs(i2va, { prompt: 'i2va', length: 141, mode: 'I2VA', seed: 2, firstFrame: 'first.png' });
assert(i2va['6'].inputs.task_type === 'I2VA', 'I2VA task type');
assert(JSON.stringify(i2va['6'].inputs.first_frame) === JSON.stringify(['13', 0]), 'I2VA first frame');
assert(i2va['6'].inputs.last_frame === undefined, 'I2VA has no last frame');

const fl2va = createWorkflow();
configureH3VisualInputs(fl2va, { prompt: 'fl2va', length: 260, mode: 'FL2VA', seed: 3, firstFrame: 'first.png', lastFrame: 'last.png' });
assert(fl2va['6'].inputs.task_type === 'FL2VA', 'FL2VA task type');
assert(JSON.stringify(fl2va['6'].inputs.last_frame) === JSON.stringify(['16', 0]), 'FL2VA last frame');
assert(fl2va['16'].inputs.image === 'last.png', 'FL2VA target image node');

const ref2va = createWorkflow();
configureH3VisualInputs(ref2va, { prompt: 'ref2va', length: 379, mode: 'Ref2VA', seed: 4, referenceImages: ['one.png', 'two.png'] });
assert(ref2va['6'].inputs.task_type === 'Ref2VA', 'Ref2VA task type');
assert(ref2va['6'].inputs.first_frame === undefined, 'Ref2VA has no first frame');
assert(ref2va['13'].inputs.image === 'one.png' && ref2va['16'].inputs.image === 'two.png', 'Ref2VA reference nodes');

console.log('PASS H3 I2VA / FL2VA / Ref2VA workflow configuration');
