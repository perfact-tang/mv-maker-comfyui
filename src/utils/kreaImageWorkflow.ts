import krea2TurboWorkflow from './image_krea2_turbo_t2i_int8.json';

export const KREA_IMAGE_WORKFLOW_NAME = 'Krea2 Turbo';

type WorkflowNode = {
  inputs: Record<string, unknown>;
  class_type: string;
  _meta?: { title?: string };
};

type KreaWorkflow = Record<string, WorkflowNode>;

export const createKreaImageWorkflow = (
  prompt: string,
  dimensions?: { width: number; height: number },
) => {
  const workflow = structuredClone(krea2TurboWorkflow) as unknown as KreaWorkflow;
  const isPortrait = dimensions ? dimensions.height > dimensions.width : false;

  workflow['30:19'].inputs.value = prompt;
  workflow['49'].inputs.aspect_ratio = isPortrait ? '9:16 (Portrait Widescreen)' : '16:9 (Widescreen)';
  workflow['49'].inputs.megapixels = 1;
  workflow['49'].inputs.multiple = 8;
  workflow['30:3'].inputs.seed = Math.floor(Math.random() * 1_000_000_000_000_000);

  return workflow;
};
