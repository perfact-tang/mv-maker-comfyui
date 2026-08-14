import type { H3ShotMode } from '../types/mv-data';

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
