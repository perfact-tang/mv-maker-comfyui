import { VideoOrientation } from '../types/mv-data';
import { VIDEO_WORKFLOWS } from './workflows';

export interface VideoDimensions {
  width: number;
  height: number;
  label: string;
}

export const VIDEO_DIMENSIONS: Record<VideoOrientation, VideoDimensions> = {
  landscape: { width: 736, height: 416, label: '横版 16:9' },
  portrait: { width: 416, height: 736, label: '竖版 9:16' },
};

interface WorkflowNode {
  inputs: Record<string, unknown>;
  class_type?: string;
}

type Workflow = Record<string, WorkflowNode>;

interface CharacterWorkflowOptions {
  workflowName: string;
  prompt: string;
  uploadedImage: string;
  orientation: VideoOrientation;
  h3VideoLength: number;
}

export const applyVideoDimensions = (workflow: Workflow, dimensions: VideoDimensions) => {
  const h3Conditioning = workflow['6'];
  if (h3Conditioning?.class_type === 'MiniMaxH3AudioConditioningT8') {
    h3Conditioning.inputs.width = dimensions.width;
    h3Conditioning.inputs.height = dimensions.height;
  }

  Object.values(workflow).forEach((node) => {
    if (node.class_type === 'mxSlider2D') {
      node.inputs.Xi = dimensions.width;
      node.inputs.Xf = dimensions.width;
      node.inputs.Yi = dimensions.height;
      node.inputs.Yf = dimensions.height;
    }
    if (
      node.class_type === 'WanImageToVideo'
      && typeof node.inputs.width === 'number'
      && typeof node.inputs.height === 'number'
    ) {
      node.inputs.width = dimensions.width;
      node.inputs.height = dimensions.height;
    }
  });

  if (workflow['320:312']) workflow['320:312'].inputs.value = dimensions.width;
  if (workflow['320:299']) workflow['320:299'].inputs.value = dimensions.height;
  if (workflow['340:330']) workflow['340:330'].inputs.value = dimensions.width;
  if (workflow['340:324']) workflow['340:324'].inputs.value = dimensions.height;
};

export const createCharacterVideoWorkflow = ({
  workflowName,
  prompt,
  uploadedImage,
  orientation,
  h3VideoLength,
}: CharacterWorkflowOptions): Workflow => {
  const effectiveWorkflowName = workflowName === 'LTX2.3 V2I' ? 'LTX2.3' : workflowName;
  const template = VIDEO_WORKFLOWS[effectiveWorkflowName as keyof typeof VIDEO_WORKFLOWS]
    || VIDEO_WORKFLOWS.SmoothV2;
  const workflow = JSON.parse(JSON.stringify(template)) as Workflow;
  const seed = Math.floor(Math.random() * 1000000000000000);

  applyVideoDimensions(workflow, VIDEO_DIMENSIONS[orientation]);

  if (effectiveWorkflowName === 'H3 Turbo Stable 4V4A') {
    const conditioning = workflow['6'].inputs;
    conditioning.prompt = prompt;
    conditioning.length = h3VideoLength;
    conditioning.task_type = 'I2VA';
    conditioning.first_frame = ['13', 0];
    delete conditioning.last_frame;
    delete conditioning['ref_images.ref_image_0'];
    delete conditioning['ref_images.ref_image_1'];
    workflow['13'] = {
      inputs: { image: uploadedImage },
      class_type: 'LoadImage',
    };
    workflow['9'].inputs.noise_seed = seed;
  } else if (effectiveWorkflowName === 'LTX2.3') {
    if (workflow['269']) workflow['269'].inputs.image = uploadedImage;
    if (workflow['320:319']) workflow['320:319'].inputs.value = prompt;
    if (workflow['320:277']) workflow['320:277'].inputs.noise_seed = seed;
    if (workflow['320:276']) workflow['320:276'].inputs.noise_seed = seed;
  } else {
    if (workflow['52']) workflow['52'].inputs.image = uploadedImage;
    if (workflow['97']?.class_type === 'LoadImage') workflow['97'].inputs.image = uploadedImage;
    if (workflow['88']) workflow['88'].inputs.value = prompt;
    if (workflow['93']) workflow['93'].inputs.text = prompt;
    if (workflow['89']) workflow['89'].inputs.text = prompt;
    if (workflow['82']) workflow['82'].inputs.seed = seed;
    if (workflow['86']) workflow['86'].inputs.noise_seed = seed;
  }

  return workflow;
};
