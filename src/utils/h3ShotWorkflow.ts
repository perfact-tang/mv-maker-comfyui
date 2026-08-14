import type { H3AudioModeValue, H3ShotMode } from '../types/mv-data';

type WorkflowNode = {
  inputs: Record<string, unknown>;
  class_type?: string;
  _meta?: { title: string };
};

export type H3Workflow = Record<string, WorkflowNode>;

interface ConfigureH3VisualInputsOptions {
  prompt: string;
  length: number;
  mode: H3ShotMode;
  seed: number;
  firstFrame?: string | null;
  lastFrame?: string | null;
  referenceImages?: string[];
}

interface ConfigureH3AudioInputsOptions {
  audioMode: H3AudioModeValue;
  uploadedAudioFilename?: string | null;
}

const isKeyframedTask = (conditioningInputs: Record<string, unknown>) => (
  ['I2VA', 'FL2VA', 'L2VA'].includes(String(conditioningInputs.task_type ?? '').toUpperCase())
);

const replaceAudioMediaTagsWithPlainText = (prompt: string) => (
  prompt
    .replace(/<\s*Audio\s+\d+\s*>/gi, '主音频')
    .replace(/\bAudio\s*#?\s*\d+\b/gi, '主音频')
);

const removeUnconnectedPictureTags = (prompt: string, availablePictureCount: number): string => (
  prompt
    .replace(/<Picture\s+(\d+)>/gi, (tag, rawIndex: string) => (
      Number(rawIndex) <= availablePictureCount ? tag : ''
    ))
    .replace(/[ \t]{2,}/g, ' ')
);

export const configureH3VisualInputs = (
  workflow: H3Workflow,
  options: ConfigureH3VisualInputsOptions,
): void => {
  const conditioningInputs = workflow['6'].inputs;
  conditioningInputs.prompt = options.prompt;
  conditioningInputs.length = options.length;
  workflow['9'].inputs.noise_seed = options.seed;

  delete conditioningInputs.first_frame;
  delete conditioningInputs.last_frame;
  delete conditioningInputs['ref_images.ref_image_0'];
  delete conditioningInputs['ref_images.ref_image_1'];
  delete workflow['13'];
  delete workflow['16'];

  conditioningInputs.task_type = options.mode;
  if (options.mode === 'Ref2VA') {
    const referenceImages = options.referenceImages ?? [];
    if (referenceImages.length < 1 || referenceImages.length > 2) {
      throw new Error('Ref2VA requires one or two uploaded reference images');
    }
    conditioningInputs.prompt = removeUnconnectedPictureTags(options.prompt, referenceImages.length);
    workflow['13'] = { inputs: { image: referenceImages[0] }, class_type: 'LoadImage', _meta: { title: '参考图 1' } };
    conditioningInputs['ref_images.ref_image_0'] = ['13', 0];
    if (referenceImages[1]) {
      workflow['16'] = { inputs: { image: referenceImages[1] }, class_type: 'LoadImage', _meta: { title: '参考图 2' } };
      conditioningInputs['ref_images.ref_image_1'] = ['16', 0];
    }
    return;
  }

  if (!options.firstFrame) throw new Error(`${options.mode} requires an uploaded first frame`);
  workflow['13'] = { inputs: { image: options.firstFrame }, class_type: 'LoadImage', _meta: { title: '首帧' } };
  conditioningInputs.first_frame = ['13', 0];

  if (options.mode === 'FL2VA') {
    if (!options.lastFrame) throw new Error('FL2VA requires an uploaded target last frame');
    workflow['16'] = { inputs: { image: options.lastFrame }, class_type: 'LoadImage', _meta: { title: '目标尾帧' } };
    conditioningInputs.last_frame = ['16', 0];
  }
};

export const configureH3AudioInputs = (
  workflow: H3Workflow,
  options: ConfigureH3AudioInputsOptions,
): void => {
  const conditioningInputs = workflow['6'].inputs;
  delete conditioningInputs.drive_audio;
  delete conditioningInputs.final_audio;
  delete conditioningInputs['ref_audios.ref_audio_0'];
  delete workflow['17'];

  if (options.audioMode === 'native-audio' || options.audioMode === 'no-audio') {
    conditioningInputs.audio_mode = 'native';
    conditioningInputs.add_source_as_reference = false;
    conditioningInputs.prompt_primary_audio_ordinal = 0;
    if (options.audioMode === 'no-audio' && workflow['12']) delete workflow['12'].inputs.audio;
    return;
  }

  if (!options.uploadedAudioFilename) {
    throw new Error(`声明了 ${options.audioMode}，但尚未上传音频`);
  }

  workflow['17'] = {
    inputs: { audio: options.uploadedAudioFilename },
    class_type: 'LoadAudio',
    _meta: { title: options.audioMode === 'drive-audio' ? 'Drive Audio' : '参考音乐' },
  };
  conditioningInputs.drive_audio = ['17', 0];

  if (options.audioMode === 'drive-audio') {
    const promptUsesAudioTag = /<Audio\s+\d+>/i.test(String(conditioningInputs.prompt ?? ''));
    conditioningInputs.audio_mode = 'lock_source';
    if (isKeyframedTask(conditioningInputs)) {
      // The installed T8 build disables Hybrid when ComfyUI's ref/keyframe
      // latent contract is unknown. Drive Audio does not need to become a
      // reference: keep the locked source latent and make its prompt mentions
      // plain text so FL2VA/I2VA remain valid keyframe-only tasks.
      conditioningInputs.prompt = replaceAudioMediaTagsWithPlainText(String(conditioningInputs.prompt ?? ''));
      conditioningInputs.add_source_as_reference = false;
      conditioningInputs.prompt_primary_audio_ordinal = 0;
      return;
    }
    conditioningInputs.add_source_as_reference = promptUsesAudioTag;
    conditioningInputs.prompt_primary_audio_ordinal = promptUsesAudioTag ? 1 : 0;
    return;
  }

  if (isKeyframedTask(conditioningInputs)) {
    throw new Error('当前 ComfyUI/T8 组合已禁用“关键帧 + 参考音频”的 Hybrid 路径；请将本镜头音频改为 Drive Audio，或将 H3 模式改为 Ref2VA。');
  }

  // MiniMaxH3AudioConditioningT8 requires reference_only to receive its primary
  // source through drive_audio. add_source_as_reference exposes it as <Audio 1>
  // while reference_only keeps it out of the locked target-audio latent.
  conditioningInputs.audio_mode = 'reference_only';
  conditioningInputs.add_source_as_reference = true;
  conditioningInputs.prompt_primary_audio_ordinal = 1;
};
