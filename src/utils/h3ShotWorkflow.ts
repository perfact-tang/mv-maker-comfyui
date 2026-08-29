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
    .replace(
      /<\s*Picture\s*#?\s*(\d+)\s*>|\bPicture\s*#?\s*(\d+)\b/gi,
      (tag, angledIndex: string | undefined, bareIndex: string | undefined) => (
        Number(angledIndex ?? bareIndex) <= availablePictureCount ? tag : 'the removed reference image'
      ),
    )
    .replace(/[ \t]{2,}/g, ' ')
);

const availablePictureCountForMode = (mode: H3ShotMode, referenceImageCount: number) => {
  if (mode === 'Ref2VA') return referenceImageCount;
  if (mode === 'FL2VA') return 2;
  return 1;
};

const durationSecondsForFrames = (frames: number) => {
  if (frames === 141) return 5;
  if (frames === 260) return 10;
  if (frames === 379) return 15;
  return Math.max(0, (frames - 22) / 23.8);
};

const stripExistingKeyframeAlignmentHeader = (prompt: string) => {
  const coreFieldIndex = prompt.search(/\bintegrated_multimodal_description\s*:/i);
  if (coreFieldIndex < 0) return prompt.trim();
  const prefix = prompt.slice(0, coreFieldIndex);
  if (!/How the reference pictures align with the target video|For the target video,/i.test(prefix)) {
    return prompt.trim();
  }
  return prompt.slice(coreFieldIndex).trim();
};

const normalizeKeyframedPrompt = (prompt: string, mode: H3ShotMode, length: number) => {
  const pictureCount = availablePictureCountForMode(mode, 0);
  const sanitizedPrompt = removeUnconnectedPictureTags(prompt, pictureCount);
  if (mode === 'Ref2VA') return sanitizedPrompt;

  const body = stripExistingKeyframeAlignmentHeader(sanitizedPrompt);
  if (mode === 'I2VA') {
    return `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n\n${body}`.trim();
  }

  const duration = durationSecondsForFrames(length).toFixed(2);
  return `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the ${duration}-second mark of the target video.\n\n${body}`.trim();
};

export const configureH3VisualInputs = (
  workflow: H3Workflow,
  options: ConfigureH3VisualInputsOptions,
): void => {
  if (workflow['136']) {
    configureOfficialH3VisualInputs(workflow, options);
    return;
  }
  const conditioningInputs = workflow['6'].inputs;
  const referenceImages = options.referenceImages ?? [];
  conditioningInputs.prompt = options.mode === 'Ref2VA'
    ? removeUnconnectedPictureTags(options.prompt, referenceImages.length)
    : normalizeKeyframedPrompt(options.prompt, options.mode, options.length);
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
    if (referenceImages.length < 1 || referenceImages.length > 2) {
      throw new Error('Ref2VA requires one or two uploaded reference images');
    }
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
  if (workflow['136']) {
    configureOfficialH3AudioInputs(workflow, options);
    return;
  }
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

const configureOfficialH3VisualInputs = (
  workflow: H3Workflow,
  options: ConfigureH3VisualInputsOptions,
) => {
  // Reuse the existing prompt normalization and media validation without changing
  // the saved shot plan or skills. Keep the project's exact frame count for audio sync.
  const visual: H3Workflow = { '6': { inputs: {} }, '9': { inputs: {} } };
  configureH3VisualInputs(visual, options);
  const inputs = visual['6'].inputs;
  const previous = workflow['136'].inputs;
  const isReference = options.mode === 'Ref2VA';
  workflow['136'] = {
    class_type: isReference ? 'MiniMaxH3ReferenceToVideo' : 'MiniMaxH3ImageToVideo',
    inputs: {
      clip: ['128', 0], vae: ['119', 0], prompt: ['138', 0],
      width: previous.width, height: previous.height, length: ['131', 1],
      ...(isReference ? { audio_vae: ['120', 0], ref_image_size: 'match' } : {}),
    },
  };
  workflow['138'].inputs.value = inputs.prompt;
  workflow['132'].inputs.value = options.length / 24;
  workflow['129'].inputs.noise_seed = options.seed;
  workflow['127'].inputs.unet_name = isReference
    ? 'minimax_h3_ref2va_pruned_int8_convrot.safetensors'
    : 'minimax_h3_fl2va_int8_convrot.safetensors';
  // The supplied LoRA is ref2v-only; the supplied default is full 20-step sampling.
  if (!isReference) workflow['146'].inputs.value = false;
  delete workflow['137'];
  delete workflow['139'];
  for (const [sourceId, targetId] of [['13', '137'], ['16', '139']]) {
    if (visual[sourceId]) workflow[targetId] = visual[sourceId];
  }
  for (const key of ['first_frame', 'last_frame', 'ref_images.ref_image_0', 'ref_images.ref_image_1']) {
    const link = inputs[key];
    if (Array.isArray(link)) workflow['136'].inputs[key] = [link[0] === '13' ? '137' : '139', 0];
  }
  configureOfficialH3AudioInputs(workflow, { audioMode: 'native-audio' });
};

const configureOfficialH3AudioInputs = (
  workflow: H3Workflow,
  options: ConfigureH3AudioInputsOptions,
) => {
  const conditioning = workflow['136'];
  const isReference = conditioning.class_type === 'MiniMaxH3ReferenceToVideo';
  delete conditioning.inputs['ref_audios.ref_audio_0'];
  delete workflow['149'];
  delete workflow['150'];
  workflow['125'].inputs.latent_image = ['136', 1];
  workflow['130'].inputs.audio = ['121', 0];
  if (options.audioMode === 'native-audio' || options.audioMode === 'no-audio') {
    if (options.audioMode === 'no-audio') delete workflow['130'].inputs.audio;
    return;
  }
  if (!options.uploadedAudioFilename) throw new Error(`声明了 ${options.audioMode}，但尚未上传音频`);
  if (options.audioMode === 'reference-audio' && !isReference) {
    throw new Error('关键帧 + 参考音频的 Hybrid 路径不受支持；请将本镜头音频改为 Drive Audio，或将 H3 模式改为 Ref2VA。');
  }
  workflow['149'] = {
    class_type: 'LoadAudio', inputs: { audio: options.uploadedAudioFilename },
    _meta: { title: '镜头音频' },
  };
  if (options.audioMode === 'reference-audio') {
    conditioning.inputs['ref_audios.ref_audio_0'] = ['149', 0];
    return;
  }
  // Official conditioning has no drive_audio socket. Use the installed T8 latent
  // control with the new stock sampler, retaining a locked source audio stream.
  workflow['150'] = {
    class_type: 'MiniMaxH3AudioLatentControlT8',
    inputs: { av_latent: ['136', 1], source_audio: ['149', 0], audio_vae: ['120', 0], mode: 'lock', strength: 0 },
    _meta: { title: '锁定 Drive Audio' },
  };
  workflow['125'].inputs.latent_image = ['150', 0];
  workflow['130'].inputs.audio = ['149', 0];
  const prompt = String(workflow['138'].inputs.value ?? '');
  if (isReference && /<Audio\s+\d+>/i.test(prompt)) {
    conditioning.inputs['ref_audios.ref_audio_0'] = ['149', 0];
  } else if (!isReference) {
    workflow['138'].inputs.value = replaceAudioMediaTagsWithPlainText(prompt);
  }
};
