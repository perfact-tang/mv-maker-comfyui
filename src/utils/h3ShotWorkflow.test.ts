import { configureH3AudioInputs, configureH3VisualInputs } from './h3ShotWorkflow.ts';
import type { H3Workflow } from './h3ShotWorkflow.ts';
import { resolveShotAudioMode } from './videoAudio';
import type { DirectorAudioPlan, MVInfo } from '../types/mv-data';

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

const ref2vaSingle = createWorkflow();
configureH3VisualInputs(ref2vaSingle, { prompt: '<Picture 1> 定义主角；<Picture 2> 定义已移除角色。', length: 141, mode: 'Ref2VA', seed: 5, referenceImages: ['one.png'] });
assert(ref2vaSingle['13'].inputs.image === 'one.png', 'single-reference Ref2VA first reference node');
assert(ref2vaSingle['16'] === undefined, 'single-reference Ref2VA does not invent a second reference node');
assert(ref2vaSingle['6'].inputs['ref_images.ref_image_1'] === undefined, 'single-reference Ref2VA has no second conditioning input');
assert(String(ref2vaSingle['6'].inputs.prompt).includes('<Picture 1>'), 'single-reference Ref2VA keeps connected Picture 1 tag');
assert(!String(ref2vaSingle['6'].inputs.prompt).includes('<Picture 2>'), 'single-reference Ref2VA removes unconnected Picture 2 tag');

const switchedRef2vaToI2va = createWorkflow();
switchedRef2vaToI2va['6'].inputs.task_type = 'Ref2VA';
switchedRef2vaToI2va['6'].inputs['ref_images.ref_image_0'] = ['13', 0];
switchedRef2vaToI2va['6'].inputs['ref_images.ref_image_1'] = ['16', 0];
switchedRef2vaToI2va['13'] = { inputs: { image: 'old-one.png' }, class_type: 'LoadImage' };
switchedRef2vaToI2va['16'] = { inputs: { image: 'old-two.png' }, class_type: 'LoadImage' };
configureH3VisualInputs(switchedRef2vaToI2va, {
  prompt: 'How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the 10.00-second mark of the target video.\nintegrated_multimodal_description: [Shot 1] 从 Picture 1 开始推进，并且不再使用 Picture 2。\noverall_soundscape: 雨声。\nnon_diegetic_music: N/A',
  length: 141,
  mode: 'I2VA',
  seed: 6,
  firstFrame: 'first.png',
});
assert(switchedRef2vaToI2va['6'].inputs.task_type === 'I2VA', 'Ref2VA to I2VA switch updates task type');
assert(JSON.stringify(switchedRef2vaToI2va['6'].inputs.first_frame) === JSON.stringify(['13', 0]), 'switched I2VA connects one first frame');
assert(switchedRef2vaToI2va['6'].inputs['ref_images.ref_image_0'] === undefined, 'switched I2VA removes first Ref2VA conditioning input');
assert(switchedRef2vaToI2va['6'].inputs['ref_images.ref_image_1'] === undefined, 'switched I2VA removes second Ref2VA conditioning input');
assert(switchedRef2vaToI2va['16'] === undefined, 'switched I2VA removes stale second image node');
assert(String(switchedRef2vaToI2va['6'].inputs.prompt).includes('<Picture 1>'), 'switched I2VA keeps the connected first-frame tag');
assert(!String(switchedRef2vaToI2va['6'].inputs.prompt).includes('<Picture 2>'), 'switched I2VA removes the disconnected second-picture tag');
assert(!/\bPicture\s*#?\s*2\b/i.test(String(switchedRef2vaToI2va['6'].inputs.prompt)), 'switched I2VA removes bare Picture 2 references too');
assert(String(switchedRef2vaToI2va['6'].inputs.prompt).startsWith('For the target video, at 0.00 seconds into the target video, <Picture 1>'), 'switched I2VA rewrites the stale FL2VA header');
assert(String(switchedRef2vaToI2va['6'].inputs.prompt).includes('integrated_multimodal_description:'), 'switched I2VA preserves the prompt body');

const fl2vaKeepsTwoPictures = createWorkflow();
configureH3VisualInputs(fl2vaKeepsTwoPictures, {
  prompt: '<Picture 1> 是首帧；<Picture 2> 是目标尾帧。',
  length: 260,
  mode: 'FL2VA',
  seed: 7,
  firstFrame: 'first.png',
  lastFrame: 'last.png',
});
assert(String(fl2vaKeepsTwoPictures['6'].inputs.prompt).includes('<Picture 2>'), 'FL2VA keeps its connected target-last-frame tag');

const driveAudio = createWorkflow();
driveAudio['6'].inputs.prompt = 'Follow <Audio 1> exactly.';
configureH3AudioInputs(driveAudio, { audioMode: 'drive-audio', uploadedAudioFilename: 'drive.mp3' });
assert(JSON.stringify(driveAudio['6'].inputs.drive_audio) === JSON.stringify(['17', 0]), 'drive audio is connected');
assert(driveAudio['6'].inputs.audio_mode === 'lock_source', 'drive audio locks the source latent');
assert(driveAudio['6'].inputs.add_source_as_reference === false, 'keyframed drive audio is not registered as reference media');
assert(driveAudio['6'].inputs.prompt_primary_audio_ordinal === 0, 'keyframed drive audio does not claim a prompt ordinal');
assert(driveAudio['6'].inputs.task_type === 'I2VA', 'I2VA plus drive audio remains I2VA');
assert(!String(driveAudio['6'].inputs.prompt).includes('<Audio 1>'), 'keyframed drive audio tags are converted to plain text');

const untaggedDriveAudio = createWorkflow();
configureH3AudioInputs(untaggedDriveAudio, { audioMode: 'drive-audio', uploadedAudioFilename: 'drive.mp3' });
assert(untaggedDriveAudio['6'].inputs.add_source_as_reference === false, 'untagged drive audio is not duplicated as a prompt reference');
assert(untaggedDriveAudio['6'].inputs.prompt_primary_audio_ordinal === 0, 'untagged drive audio does not claim a prompt ordinal');
assert(untaggedDriveAudio['6'].inputs.task_type === 'I2VA', 'untagged drive audio preserves the visual task type');

const fl2vaDriveAudio = createWorkflow();
fl2vaDriveAudio['6'].inputs.task_type = 'FL2VA';
fl2vaDriveAudio['6'].inputs.prompt = 'Match <Audio 1> while preserving both keyframes.';
configureH3AudioInputs(fl2vaDriveAudio, { audioMode: 'drive-audio', uploadedAudioFilename: 'drive.mp3' });
assert(fl2vaDriveAudio['6'].inputs.task_type === 'FL2VA', 'FL2VA plus drive audio remains FL2VA');
assert(fl2vaDriveAudio['6'].inputs.add_source_as_reference === false, 'FL2VA drive audio avoids disabled Hybrid reference media');
assert(!String(fl2vaDriveAudio['6'].inputs.prompt).includes('<Audio 1>'), 'FL2VA drive audio prompt contains no media tag');

const referenceAudio = createWorkflow();
let keyframedReferenceError = '';
try {
  configureH3AudioInputs(referenceAudio, { audioMode: 'reference-audio', uploadedAudioFilename: 'reference.mp3' });
} catch (error) {
  keyframedReferenceError = error instanceof Error ? error.message : String(error);
}
assert(keyframedReferenceError.includes('Hybrid'), 'keyframed reference audio reports the disabled Hybrid compatibility path');

const ref2vaAudio = createWorkflow();
ref2vaAudio['6'].inputs.task_type = 'Ref2VA';
configureH3AudioInputs(ref2vaAudio, { audioMode: 'reference-audio', uploadedAudioFilename: 'reference.mp3' });
assert(ref2vaAudio['6'].inputs.task_type === 'Ref2VA', 'Ref2VA remains Ref2VA when audio reference is added');
assert(JSON.stringify(ref2vaAudio['6'].inputs.drive_audio) === JSON.stringify(['17', 0]), 'Ref2VA reference_only receives required drive_audio');
assert(ref2vaAudio['6'].inputs.audio_mode === 'reference_only', 'Ref2VA reference audio uses reference_only mode');
assert(ref2vaAudio['6'].inputs.add_source_as_reference === true, 'Ref2VA reference source is exposed as Audio 1');

console.log('PASS H3 visual and audio workflow configuration');

const silentWorkflow = createWorkflow();
configureH3AudioInputs(silentWorkflow, { audioMode: 'drive-audio', uploadedAudioFilename: 'obsolete-music.mp3' });
configureH3AudioInputs(silentWorkflow, {
  audioMode: resolveShotAudioMode({ lyrics: '(No dialogue)' } as MVInfo, { mode: 'qwen3-tts-audio-first' } as DirectorAudioPlan),
});
assert(silentWorkflow['17'] === undefined && silentWorkflow['6'].inputs.drive_audio === undefined, 'non-dialogue workflow has no local audio loader or driver');
assert(silentWorkflow['6'].inputs.audio_mode === 'native' && silentWorkflow['6'].inputs.add_source_as_reference === false, 'non-dialogue workflow uses native audio without audio references');
