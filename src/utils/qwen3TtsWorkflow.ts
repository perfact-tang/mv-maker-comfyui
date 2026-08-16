import voiceDesignWorkflow from './voice_design.json' with { type: 'json' };

type WorkflowNode = { inputs: Record<string, unknown>; class_type: string; _meta?: { title?: string } };
export type Qwen3TtsWorkflow = Record<string, WorkflowNode>;

export interface Qwen3TtsWorkflowOptions {
  text: string;
  instruct: string;
  language?: string;
  seed?: number;
  voiceId: string;
  savePrompt?: boolean;
}

export const createQwen3TtsWorkflow = ({ text, instruct, language = 'Auto', seed, voiceId, savePrompt = true }: Qwen3TtsWorkflowOptions) => {
  const workflow = structuredClone(voiceDesignWorkflow) as unknown as Qwen3TtsWorkflow;
  const resolvedSeed = seed ?? Math.floor(Math.random() * 1_000_000_000_000_000);
  const safeVoiceId = voiceId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'voice_profile';
  workflow['9'].inputs.text = text.trim();
  workflow['9'].inputs.instruct = instruct.trim();
  workflow['9'].inputs.language = language || 'Auto';
  workflow['9'].inputs.seed = resolvedSeed;
  workflow['5'].inputs.ref_text = text.trim();
  workflow['11'].inputs.filename = `mv-maker-${safeVoiceId}`;
  if (!savePrompt) {
    delete workflow['5'];
    delete workflow['6'];
    delete workflow['11'];
  }
  return { workflow, seed: resolvedSeed, promptFilename: `mv-maker-${safeVoiceId}` };
};
