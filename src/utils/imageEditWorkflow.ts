import qwenImageEditWorkflow from './image_qwen_image_edit_2511_int8.json';

export const IMAGE_EDIT_WORKFLOW_NAME = 'Qwen Image Edit';

interface QwenImageEditWorkflowOptions {
  sourceImage: string;
  referenceImage: string;
  prompt: string;
}

type WorkflowNode = {
  inputs: Record<string, unknown>;
  class_type: string;
  _meta?: { title?: string };
};

type QwenImageEditWorkflow = Record<string, WorkflowNode>;

export const createQwenImageEditWorkflow = ({
  sourceImage,
  referenceImage,
  prompt,
}: QwenImageEditWorkflowOptions) => {
  const workflow = structuredClone(qwenImageEditWorkflow) as unknown as QwenImageEditWorkflow;

  workflow['41'].inputs.image = sourceImage;
  workflow['196'].inputs.image = referenceImage;
  workflow['170:151'].inputs.prompt = prompt;
  workflow['170:169'].inputs.seed = Math.floor(Math.random() * 1_000_000_000_000_000);

  return workflow;
};
